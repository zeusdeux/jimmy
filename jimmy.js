import fs from 'fs'
import path from 'path'
import childProcess from 'child_process'

import mkdirp from 'make-dir'
import fsExtra from 'fs-extra'

import React from 'react'
import ReactDOMServer from 'react-dom/server'
import { StaticRouter, Link, Route } from 'react-router-dom'

import Index from './index.default'
import App from './App'

const {
  readdirSync,
  statSync,
  promises: { writeFile }
} = fs
const { remove } = fsExtra
const { exec } = childProcess
const { resolve, relative } = path
const CWD = process.cwd()

// getReactRouterRoutes :: RelativePath -> [ReactRouterRoute]
function getReactRouterRoutes(routesDir) {
  // readdir ./routes and recursively get a list of filenames relative to ./routes
  // return that as an array
  try {
    const absoluteRoutesDir = resolve(CWD, routesDir)
    const files = readdirSync(absoluteRoutesDir)
    const pathsList = files.map(file => {
      const subDir = resolve(absoluteRoutesDir, file)
      const f = statSync(subDir)
      return {
        isDirectory: f.isDirectory(),
        path: relative(resolve(CWD, './App/Routes'), subDir)
      }
    })

    const result = pathsList.reduce((acc, { isDirectory, path }) => {
      if (!isDirectory) {
        if (path.endsWith('Main.js') || !/\.js$/.test(path)) {
          return acc
        }
        acc.push(path)
      } else {
        acc = acc.concat(getReactRouterRoutes('./App/Routes/' + path))
      }
      return acc
    }, [])

    return result
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e)
    process.exit(1)
  }
}

// type ReactRouterRoute = String
// data ComponentModule = ComponentModule { default :: ReactComponent }
// type RouteToComponentMap = Map ReactRouterRoute ComponentModule
// getRouteToComponentMap :: [ReactRouterRoute] -> RouteToComponentMap
async function getRouteToComponentModuleMap(routes) {
  try {
    const getReactRouterRoute = route => '/' + route.split('index.js')[0].replace(/\/$/, '')
    const listOfRouteToComponentMaps = await Promise.all(
      routes.map(async route => {
        // this manual concatenation is to let webpack know to import everything under
        // ./App/Routes by default and make it part of the bundle as we need it when
        // we dynamically import those routes
        const component = await import('./App/Routes/' + route)
        let result = [
          {
            route: getReactRouterRoute(route),
            component,
            hasReifiedParam: false
          }
        ]

        // check if route has params
        const routeParams = (route.match(/\/:\w+/) || []).map(param => param.replace('/:', ''))

        if (routeParams.length) {
          const componentData = await component.default.getData()

          result = result.concat(
            componentData.map(data => {
              const reifiedParameterizedRoute = route.replace(/\/:(\w+)/, (_, param) => {
                const value = data[param]
                if (Object.is(value, undefined)) {
                  throw new Error(
                    `Data for ${param} not found for component ${component.name ||
                      component.displayName}`
                  )
                } else {
                  return `/${value}`
                }
              })
              return {
                route: getReactRouterRoute(reifiedParameterizedRoute),
                component,
                hasReifiedParam: true
                // data: componentData.data
              }
            })
          )
        }

        return result
      })
    )

    return flatten(listOfRouteToComponentMaps).reduce(
      (acc, { route, component, hasReifiedParam }) => {
        acc[route] = { component, hasReifiedParam }
        return acc
      },
      {}
    )
  } catch (e) {
    throw e
  }
}

function flatten(arr) {
  return arr.reduce((acc, v) => {
    if (Array.isArray(v)) {
      v = flatten(v)
    }
    return acc.concat(v)
  }, [])
}

// data LinksAndRoutes = LinksAndRoutes { links :: [<Link />], routes :: [<Route />]}
// buildLinksAndRoutes :: RouteToComponentMap -> LinksAndRoutes
function buildLinksAndRoutes(routeToComponentModuleMap) {
  // Using the routeToComponentMap build <Link /> and <Route /> components
  // arrays using dynamic import()s and return an object where
  // { links: [Link], routes: [Route] }
  return Object.entries(routeToComponentModuleMap).reduce(
    (acc, [route, { component: componentModule, hasReifiedParam }], i) => {
      if (hasReifiedParam) {
        return acc
      }
      const LinkC = (
        <Link to={route} key={i}>
          {route}
        </Link>
      )
      // figure out how to
      const RouteC = <Route key={i} exact path={route} component={componentModule.default} />

      acc.links.push(LinkC)
      acc.routes.push(RouteC)
      return acc
    },
    { links: [], routes: [] }
  )
}

// renderRoutes :: Map ReactRouterRoute ComponentModule -> LinksAndRoutes -> Map ReactRouterRoute HTMLString
function renderRoutes(routeToComponentModuleMap, { links, routes }) {
  return Object.entries(routeToComponentModuleMap).reduce((acc, [route]) => {
    const context = {}
    const renderRoute = routeToRender => {
      const app = ReactDOMServer.renderToString(
        <StaticRouter context={context} location={routeToRender}>
          <App links={links} routes={routes} />
        </StaticRouter>
      )

      return app
    }

    let app = renderRoute(route)

    if (context.url) {
      app = renderRoute(context.url)
    }

    const index = ReactDOMServer.renderToStaticMarkup(<Index title="by jimmy" app={app} />)

    acc[route] = index
    return acc
  }, {})
}

/* eslint-disable no-console */
// run :: IO()
async function run() {
  const routeToComponentModuleMap = await getRouteToComponentModuleMap(
    getReactRouterRoutes('./App/Routes')
  )

  const linksAndRoutes = buildLinksAndRoutes(routeToComponentModuleMap)

  // clean out public/
  await remove('./public/')
  console.log('Cleaned public/')

  // write index.html files for each known route (does both static and dynamic right now but dynamic is wrong)
  const renderedRoutes = await renderRoutes(routeToComponentModuleMap, linksAndRoutes)
  console.log('Routes to render', renderedRoutes)
  await Promise.all(
    Object.entries(renderedRoutes).map(async ([route, indexHTML]) => {
      // replace :param in the react route with _param in the directory name generated
      // so that it's easier to write rewrite rules for tools like serve, nginx, etc
      const publicPath = resolve(CWD, 'public', '.' + route.replace(/\/:/g, '/_'))
      await mkdirp(publicPath)
      await writeFile(`${publicPath}${publicPath.endsWith('/') ? '' : '/'}index.html`, indexHTML)
      console.log('Generated', publicPath + '/index.html')
    })
  )

  // generate public/assets/app.js and css bundles
  await execProm(`npx webpack --config ${path.resolve(CWD, 'webpack.static.config.js')}`)
  const webpackStaticBundlingLogs = readdirSync('./public/assets').map(
    f => `Generated ${resolve(CWD, './public/assets/', f)}`
  )
  console.log(webpackStaticBundlingLogs.join('\n'))
}

function execProm(...args) {
  return new Promise((res, rej) => {
    exec(...args, (err, stdout, stderr) => {
      if (!err) {
        res(stdout)
      } else {
        rej(stderr)
      }
    })
  })
}

run().catch(console.error.bind(console))
/* eslint-enable no-console */

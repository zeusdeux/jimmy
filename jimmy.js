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

// getReactRouterRoutes :: RelativePath -> [ReactRouterRoute]
function getReactRouterRoutes(rootDir) {
  // readdir ./routes and recursively get a list of filenames relative to ./routes
  // return that as an array
  try {
    const dir = resolve(__dirname, rootDir)
    const files = readdirSync(dir)
    const filesData = files.map(file => {
      const subDir = resolve(dir, file)
      const f = statSync(subDir)
      return {
        isDirectory: f.isDirectory(),
        path: relative(resolve(__dirname, './App/Routes'), resolve(subDir))
      }
    })

    const result = filesData.reduce((acc, { isDirectory, path }) => {
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
    const listOfRouteToComponentMaps = await Promise.all(
      routes.map(async route => {
        // this manual concatenation is to let webpack know to import everything under
        // ./App/Routes by default and make it part of the bundle as we need it when
        // we dynamically import those routes
        const component = await import('./App/Routes/' + route)
        const reactRouterRoute = '/' + route.split('index.js')[0].replace(/\/$/, '')
        return {
          route: reactRouterRoute,
          component
        }
      })
    )

    return listOfRouteToComponentMaps.reduce((acc, { route, component }) => {
      acc[route] = component
      return acc
    }, {})
  } catch (e) {
    throw e
  }
}

// data LinksAndRoutes = LinksAndRoutes { links :: [<Link />], routes :: [<Route />]}
// buildLinksAndRoutes :: RouteToComponentMap -> LinksAndRoutes
function buildLinksAndRoutes(routeToComponentModuleMap) {
  // Using the routeToComponentMap build <Link /> and <Route /> components
  // arrays using dynamic import()s and return an object where
  // { links: [Link], routes: [Route]}

  return Object.entries(routeToComponentModuleMap).reduce(
    (acc, [route, componentModule], i) => {
      const LinkC = (
        <Link to={route} key={i}>
          {route}
        </Link>
      )
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

// type ClientBundleEntryPoint = String
// makeMain :: RouteToComponentMap -> ClientBundleEntryPoint
function makeMain(routeToComponentModuleMap) {
  const linksAndRoutesJSXAndImports = Object.entries(routeToComponentModuleMap).reduce(
    (acc, [route, component], i) => {
      const Component = component.default.name || component.default.displayName
      const LinkJSX = `<Link key="${i}" to="${route}">${route}</Link>`
      const RouteJSX = `<Route key="${i}" exact path="${route}" component={${Component}} />`

      acc.linksJSX.push(LinkJSX)
      acc.routesJSX.push(RouteJSX)
      acc.imports.push(`import ${Component} from './Routes${route}'`)
      return acc
    },
    {
      linksJSX: [],
      routesJSX: [],
      imports: []
    }
  )

  return _makeMain(linksAndRoutesJSXAndImports)
}

function _makeMain({ imports, linksJSX, routesJSX }) {
  return `import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter, Link, Route } from 'react-router-dom'
import App from './'
${imports.join('\n')}

ReactDOM.hydrate(
  <BrowserRouter>
    <App
      links={[${linksJSX.join(', ').replace(/'/g, '')}]}
      routes={[${routesJSX.join(', ').replace(/'/g, '')}]} />
  </BrowserRouter>,
  document.querySelector('main')
)`
}

/* eslint-disable no-console */
// run :: IO()
async function run() {
  const routeToComponentModuleMap = await getRouteToComponentModuleMap(
    getReactRouterRoutes('./App/Routes')
  )

  const linksAndRoutes = buildLinksAndRoutes(routeToComponentModuleMap)

  // write ./App/Main.js
  const Main = makeMain(routeToComponentModuleMap)
  await writeFile('./App/Main.js', Main)
  console.log('Generated', resolve(__dirname, './App/Main.js'))

  // clean out public/
  await remove('./public/')
  console.log('Cleaned public/')

  // write index.html files for each known route (does both static and dynamic right now but dynamic is wrong)
  const renderedRoutes = await renderRoutes(routeToComponentModuleMap, linksAndRoutes)
  console.log('Routes to render', renderedRoutes)
  await Promise.all(
    Object.entries(renderedRoutes).map(async ([route, indexHTML]) => {
      const publicPath = resolve(__dirname, 'public', '.' + route)
      await mkdirp(publicPath)
      await writeFile(`${publicPath}${publicPath.endsWith('/') ? '' : '/'}index.html`, indexHTML)
      console.log('Generated', publicPath + '/index.html')
    })
  )

  // generate public/assets/app.js and css bundles
  await execProm('npx webpack --config webpack.static.config.js')
  const webpackStaticBundlingLogs = readdirSync('./public/assets').map(
    f => `Generated ${resolve(__dirname, './public/assets/', f)}`
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

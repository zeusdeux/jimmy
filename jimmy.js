import fs from 'fs'
import path from 'path'
import childProcess from 'child_process'
import mkdirp from 'make-dir'

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
const { exec } = childProcess
const { resolve, _join, relative } = path

/**
 * Expected directory structure:
 *
 * ./index.js -> project root has an index.js which exports a react component
 * that is used as a shell to generate all files. It's equivalent to
 * index.html. ReactDOMServer.renderToStaticMarkup is used to render this file.
 * Rendered file name depends on the route being rendered.
 *
 * App/index.js -> This react component will be given [<Link />] and [<Route />]
 * It can choose to render those arrays however and where ever it wants. It's
 * the shell for your application.
 *
 * App/Routes -> This folder contains all the routes. The hierarchy matches the
 * the name of the route. For example:
 *
 * Component: App/Routes/index.js -> Route: /
 * Component: App/Routes/home/index.js -> Route: /home
 * Component: App/Routes/home/:param/index.js -> Route: /home/:param
 *
 */

// 1.
// generate route manifest from ./App/Routes/
// shape { ReactRouterRouteName: componentModule }

// 2.
// build <Link /> array
// build <Route /> array

// 3.
// generate App/Main.js using makeMain

// 4.
// generate js and css bundles using App/Main.js using that as entry for webpack
// put em in /public/assets

// 5.
// Using the route manifest, ./index.js, StaticRouter and App/index.js
// generate static html files for each route
// Each one is basically going to be an instance of the index file but
// in the right directory structure under public/

// NOTES:
// Redirects are reified. This means, while rendering if a redirect is encountered,
// for e.g., / redirects to /home then the redirect is followed during rendering
// and the final route that renders to string is put in the folder for /.

// getRoutes :: RelativePath -> [ReactRouterRoute]
function getReactRouterRoutes(rootDir) {
  // readdir ./routes and recursively get a list of filenames relative to ./routes
  // return that as an array
  try {
    const dir = resolve(__dirname, rootDir)
    const files = readdirSync(dir)
    const filesData = files.map(file => {
      const subDir = resolve(dir, file)
      // console.log('file:', `./${file}`, resolve(__dirname, './App/Routes'), resolve(dir, file))
      const f = statSync(subDir)
      return {
        isDirectory: f.isDirectory(),
        path: relative(resolve(__dirname, './App/Routes'), resolve(subDir))
      }
    })

    const result = filesData.reduce((acc, { isDirectory, path }) => {
      if (!isDirectory) {
        if (path.endsWith('Main.js') || path.endsWith('.css')) {
          return acc
        }
        acc.push(path)
      } else {
        // this manual concatenation is to let webpack know to import everything under
        // ./App/Routes by default and make it part of the bundle as we need it when
        // we dynamically import those routes
        acc = acc.concat(getReactRouterRoutes('./App/Routes/' + path))
      }
      return acc
    }, [])

    // console.log(result)
    return result
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e)
    process.exit(1)
  }
}

// type ReactRouterRoute = String
// data ComponentModule = { default :: ReactComponent }
// getRouteToComponentMap :: [ReactRouterRoute] -> Map ReactRouterRoute ComponentModule
async function getRouteToComponentModuleMap(routes) {
  try {
    const routeToComponentMap = await Promise.all(
      routes.map(async route => {
        const component = await import('./App/Routes/' + route)
        const reactRouterRoute = '/' + route.split('index.js')[0].replace(/\/$/, '')
        return {
          route: reactRouterRoute,
          component
        }
      })
    )
    // routeToComponentMap.forEach(({ route, component }) => {
    //   // eslint-disable-next-line no-console
    //   console.log(route, component.default.toString())
    // })

    return routeToComponentMap.reduce((acc, { route, component }) => {
      acc[route] = component
      return acc
    }, {})
  } catch (e) {
    throw e
  }
}

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

      // console.log(RouteC.toString())
      acc.links.push(LinkC)
      acc.routes.push(RouteC)
      return acc
    },
    { links: [], routes: [] }
  )
}

// renderRoutes :: Map ReactRouterRoute ComponentModule -> { links :: [Link], routes :: [Route] } -> Map ReactRouterRoute HTMLString
function renderRoutes(routeToComponentModuleMap, { links, routes }) {
  // call reactServerDOM.renderToString here for all
  // routes and put generated files in the right path
  // under ./public/
  // console.log(routeToComponentModuleMap)

  return Object.entries(routeToComponentModuleMap).reduce((acc, [route]) => {
    const context = {}
    const renderRoute = routeToRender => {
      // console.log(routeToRender)
      const app = ReactDOMServer.renderToString(
        <StaticRouter context={context} location={routeToRender}>
          <App links={links} routes={routes} />
        </StaticRouter>
      )

      return app
    }

    let app = renderRoute(route)

    if (context.url) {
      // xeslint-disable-next-line no-console
      // console.log('Redirected to url', context.url)
      app = renderRoute(context.url)
    }

    const index = ReactDOMServer.renderToStaticMarkup(<Index title="by jimmy" app={app} />)

    acc[route] = index
    return acc
  }, {})
}

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

async function run() {
  const routeToComponentModuleMap = await getRouteToComponentModuleMap(
    getReactRouterRoutes('./App/Routes')
  )

  // console.log('Routes to components map\n', routeToComponentModuleMap)
  const linksAndRoutes = buildLinksAndRoutes(routeToComponentModuleMap)

  // write ./App/Main.js
  const Main = makeMain(routeToComponentModuleMap)
  await writeFile('./App/Main.js', Main)
  console.log('Generated', resolve(__dirname, './App/Main.js'))

  // write index.html files for each known route (does both static and dynamic right now but dynamic is wrong)
  const renderedRoutes = await renderRoutes(routeToComponentModuleMap, linksAndRoutes)
  await Promise.all(
    Object.entries(renderedRoutes).map(async ([route, indexHTML]) => {
      const publicPath = resolve(__dirname, 'public', '.' + route)
      await mkdirp(publicPath)
      await writeFile(`${publicPath}${publicPath.endsWith('/') ? '' : '/'}index.html`, indexHTML)
      console.log('Generated', publicPath + '/index.html')
    })
  )

  // generate public/assets/app.js and css bundles
  const webpackStaticBundlingStdout = await execProm(
    'npx webpack --config webpack.static.config.js'
  )

  const webpackStaticBundlingLogs = ['app.js', 'app.css']
    .filter(f => webpackStaticBundlingStdout.includes(f))
    .map(f => `Generated ${resolve(__dirname, `public/assets/${f}`)}`)
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

// eslint-disable-next-line no-console
run().catch(console.error.bind(console))

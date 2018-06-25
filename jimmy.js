import React from 'react'
import ReactDOMServer from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'

import Index from './index.default'

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
// shape { ReactRouterRouteName: component }

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

function makeMain({ links, routes }) {
  return `import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import App from './'

ReactDOM.hydrate(
  <BrowserRouter>
    <App links=${links} routes=${routes}/>
  </BrowserRouter>,
  document.querySelector('main')
)`
}

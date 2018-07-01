# jimmy

A simple react based static site generator built to understand static site generation.

# Run it

1. Clone the repo
2. `npm i` to install the dependencies
3. `npm run bundle` to prepare the server side executable
4. `npm run build` to use the bundled server side executable to generate the static site inside `public/`
5. `serve public/` (or anything you use to serve static files)

While this supports dynamic routes, to serve dynamic routes, you need to setup your nginx/what have you to serve
the root `<dynamic route>/index.html` for all dynamic routes and from there let the client side routing kick in.

# Features

- [x] Support static routes
- [x] Support dynamic routes (supported only client side)
- [ ] Support using data sources
- [ ] Generate nginx config to complete the dynamic routes picture

# Expected directory structure

`./index.js` -> project root has an index.js which exports a react component
that is used as a shell to generate all files. It's equivalent to
index.html. ReactDOMServer.renderToStaticMarkup is used to render this file.
Rendered file name depends on the route being rendered. If not found, index.default.js is used.
Though this is sort of a lie as right now index.default.js is hardcoded to be used.

`App/index.js` -> This react component will be given [<Link />] and [<Route />]
It can choose to render those arrays however and where ever it wants. It's
the shell for your application.

`App/Routes` -> This folder contains all the routes. The hierarchy matches the
the name of the route. For example:

```
Component: App/Routes/index.js -> Route: /
Component: App/Routes/home/index.js -> Route: /home
Component: App/Routes/home/:param/index.js -> Route: /home/:param
```

# How it works

1. Generate route list relative to `App/Routes/`
2. Generate route manifest from route list received from step 1. Its shape is `{ ReactRouterRoute: componentModule }`
3.
    - build `<Link></Link>` array
    - build `<Route />` array
4. Render a map from react router route to `index.html` string for that route
5. Generate `App/Main.js` using `makeMain` that contains all the imports and `<Link />` and `<Route />` jsx.
This will be used as the entry point to make the client bundle. Therefore, it should have a call to `ReactDOM.hydrate`
or `ReactDOM.render` (deprecated for SSR).
6. Write `App/Main.js` down to disk
7. Render all `index.html` files for all routes. They are generated from `index.default.js` found in the root of this project.
8. Generate js and css bundles using `App/Main.js` as entry for webpack and put 'em in `/public/assets`.
   The config file used for this is `webpack.static.config.js` in the root of this project.

And you're done!

## NOTES:
> Redirects are reified. This means, while rendering if a redirect is encountered,
> for e.g., / redirects to /home then the redirect is followed during rendering
> and the final route that renders to string is put in the folder for /.

# Caveats

1. This isn't a generic solution. It's tied to this repo.

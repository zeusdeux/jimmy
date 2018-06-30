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
- [ ] Generate nginx config to complete the dynamic routes picture

# Caveats

1. This isn't a generic solution. It's tied to this repo.

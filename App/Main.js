import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter, Link, Route } from 'react-router-dom'
import App from './'
import HomeWithParam from './Routes/home/:count'
import Home from './Routes/home'
import Root from './Routes'

ReactDOM.hydrate(
  <BrowserRouter>
    <App
      links={[
        <Link key="0" to="/home/:count">
          /home/:count
        </Link>,
        <Link key="1" to="/home">
          /home
        </Link>,
        <Link key="2" to="/">
          /
        </Link>
      ]}
      routes={[
        <Route key="0" exact path="/home/:count" component={HomeWithParam} />,
        <Route key="1" exact path="/home" component={Home} />,
        <Route key="2" exact path="/" component={Root} />
      ]}
    />
  </BrowserRouter>,
  document.querySelector('main')
)

import React from 'react'
import PropTypes from 'prop-types'
import { Switch } from 'react-router-dom'

export default function App({ links, routes }) {
  return (
    <>
      <header>
        <h1>Hey there!</h1>
      </header>
      <nav>{links}</nav>
      <div>
        <Switch>{routes}</Switch>
      </div>
    </>
  )
}

App.propTypes = {
  links: PropTypes.node.isRequired,
  routes: PropTypes.node.isRequired
}

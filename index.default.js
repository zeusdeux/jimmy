import React from 'react'
import PropTypes from 'prop-types'

export default function Index({ title, app }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <title>{title}</title>
        <link rel="stylesheet" href="/assets/app.css" />
        <script defer src="/assets/app.js" />
      </head>
      <body>
        <main dangerouslySetInnerHTML={{ __html: app }} />
      </body>
    </html>
  )
}

Index.propTypes = {
  title: PropTypes.string.isRequired,
  app: PropTypes.string.isRequired
}

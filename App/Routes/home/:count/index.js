import React from 'react'
import PropTypes from 'prop-types'

export default function HomeWithParam({ match }) {
  return <h2>Received param: {match.params.count}</h2>
}

HomeWithParam.propTypes = {
  match: PropTypes.object.isRequired
}

import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'

export default function HomeWithParam({ match }) {
  const count = Number.parseInt(match.params.count, 10)

  return (
    <>
      <h2>Received param: {match.params.count}</h2>
      <Link to={`/home/${Number.isNaN(count) ? 0 : count + 1}`}>Next</Link>
    </>
  )
}

HomeWithParam.propTypes = {
  match: PropTypes.object.isRequired
}

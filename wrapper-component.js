import React from 'react'
import ReactDOM from 'react-dom'
import Graph from './graph'

module.exports = (id) => {
  ReactDOM.render(<Graph />, document.getElementById(id))
}

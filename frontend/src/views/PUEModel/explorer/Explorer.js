
import React from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import ExplorerApp from './App.js'

const PUEModelExplorer = () => {
  return (
    <CCard className="mb-4">
      <CCardHeader>PUE Model Explorer</CCardHeader>
      <CCardBody>
        <ExplorerApp></ExplorerApp>
      </CCardBody>
    </CCard>
  )
}

export default PUEModelExplorer

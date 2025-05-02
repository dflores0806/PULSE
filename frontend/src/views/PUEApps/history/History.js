import React from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import HistoryApp from './App.js'

const PUEAppsHistory = () => {
  return (
    <CCard className="mb-4">
      <CCardHeader>PUE History management</CCardHeader>
      <CCardBody>
        <HistoryApp></HistoryApp>
      </CCardBody>
    </CCard>
  )
}

export default PUEAppsHistory


import React from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import PredictorApp from './App.js'

const PUEAppsPredictor = () => {
  return (
    <CCard className="mb-4">
      <CCardHeader>PUE Monitoring Predictor</CCardHeader>
      <CCardBody>
        <PredictorApp></PredictorApp>
      </CCardBody>
    </CCard>
  )
}

export default PUEAppsPredictor

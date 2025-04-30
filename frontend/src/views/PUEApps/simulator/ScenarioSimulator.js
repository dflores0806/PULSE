
import React from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import ScenarioSimulator from './App.js'

const PUEAppsScenarioSimulator = () => {
  return (
    <CCard className="mb-4">
      <CCardHeader>Scenario simulator</CCardHeader>
      <CCardBody>
        <ScenarioSimulator></ScenarioSimulator>
      </CCardBody>
    </CCard>
  )
}

export default PUEAppsScenarioSimulator

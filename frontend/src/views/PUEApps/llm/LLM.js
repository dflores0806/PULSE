
import React from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import LLMApp from './App.js'

const PUEAppsLLM = () => {
  return (
    <CCard className="mb-4">
      <CCardHeader>PUE LLM Assistant</CCardHeader>
      <CCardBody>
        <LLMApp></LLMApp>
      </CCardBody>
    </CCard>
  )
}

export default PUEAppsLLM

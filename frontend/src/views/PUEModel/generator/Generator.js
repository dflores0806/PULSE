
import React from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import GeneratorApp from './App.js'

const PUEModelGenerator = () => {
  return (
    <CCard className="mb-4">
      <CCardHeader>PUE Model Generator</CCardHeader>
      <CCardBody>
        <GeneratorApp></GeneratorApp>
      </CCardBody>
    </CCard>
  )
}

export default PUEModelGenerator

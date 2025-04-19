
import React from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import SettingsApp from './App.js'

const Settings = () => {
  return (
    <CCard className="mb-4">
      <CCardHeader>Settings</CCardHeader>
      <CCardBody>
        <SettingsApp></SettingsApp>
      </CCardBody>
    </CCard>
  )
}

export default Settings

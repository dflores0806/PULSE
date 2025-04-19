
import React from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'

const Home = () => {
  return (
    <CCard className="mb-4">
      <CCardHeader>Home</CCardHeader>
      <CCardBody>
        Welcome to the PULSE Dashboard. Use the sidebar to navigate.
      </CCardBody>
    </CCard>
  )
}

export default Home

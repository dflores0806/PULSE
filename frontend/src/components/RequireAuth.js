// src/components/RequireAuth.js
import React from 'react'
import { Navigate } from 'react-router-dom'

const RequireAuth = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default RequireAuth

import React, { useState } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CFormInput,
  CSpinner,
  CAlert
} from '@coreui/react'
import axios from 'axios'
import AutoMLGenerator from './AutoMLGenerator'

const AutoMLWrapper = () => {
  const [file, setFile] = useState(null)
  const [modelName, setModelName] = useState('')
  const [suggestedFeatures, setSuggestedFeatures] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [error, setError] = useState('')
  const [modelSaved, setModelSaved] = useState(false)

  const API_BASE = import.meta.env.VITE_API_BASE_URL

  const handleUpload = async () => {
    if (!file || !modelName) {
      alert('Please select a file and enter a model name.')
      return
    }

    const formData = new FormData()
    formData.append('model_name', modelName)
    formData.append('file', file)

    setLoading(true)
    setError('')
    try {
      await axios.post(`${API_BASE}/pue/gen/upload_data`, formData)

      const suggestForm = new FormData()
      suggestForm.append('model_name', modelName)
      const res = await axios.post(`${API_BASE}/pue/gen/suggest_features`, suggestForm)

      setSuggestedFeatures(res.data.suggested_features || [])
      setUploaded(true)
    } catch (err) {
      console.error(err)
      setError('Failed to upload or suggest features.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <CCard className="mb-4">
      <CCardHeader>AutoML Generator Setup</CCardHeader>
      <CCardBody>

        {!uploaded ? (
          <>
            <h5>Step 1: Upload your dataset</h5>

            <CFormInput
              type="text"
              placeholder="Model name (no spaces)"
              className="mb-3"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            />

            <CFormInput
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files[0])}
              className="mb-3"
            />

            <CButton color="primary" onClick={handleUpload}>
              {loading ? <CSpinner size="sm" /> : 'Upload and Analyze'}
            </CButton>

            {error && <CAlert color="danger" className="mt-3">{error}</CAlert>}
          </>
        ) : (
          <>
            {!modelSaved && <h5>Step 2: AutoML Training</h5>}
            <AutoMLGenerator setModelSaved={setModelSaved} modelSaved={modelSaved} modelName={modelName} suggestedFeatures={suggestedFeatures} />
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default AutoMLWrapper

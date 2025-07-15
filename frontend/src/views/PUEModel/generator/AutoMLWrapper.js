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
import { cilCloudUpload } from '@coreui/icons'
import CIcon from '@coreui/icons-react'


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
      await axios.post(`${API_BASE}/pulse/generator/upload_data`, formData)

      const suggestForm = new FormData()
      suggestForm.append('model_name', modelName)
      const res = await axios.post(`${API_BASE}/pulse/generator/suggest_features`, suggestForm)

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
      <CCardHeader>Auto trainer</CCardHeader>

      <CCardBody>
        <CAlert color="info">
          The Auto trainer functionality automatically selects the most relevant features and optimal training parameters to build a predictive model for PUE estimation. Once a dataset is uploaded, the system analyzes correlations, tests various feature subsets and model configurations, and selects the best-performing combination based on predefined metrics. This process is launched through the Auto trainer training endpoint and results in a ready-to-use model, which can be saved and integrated into other components like the simulation engine or predictor module.
        </CAlert>
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
              {loading ? (
                <>
                  <CSpinner size="sm" /> Uploading</>
              ) : (
                <>
                  <CIcon icon={cilCloudUpload} className="me-2" /> Upload and analyze
                </>
              )}
            </CButton>

            {error && <CAlert color="danger" className="mt-3">{error}</CAlert>}
          </>
        ) : (
          <>
            {!modelSaved && <h5>Step 2: Auto trainer</h5>}
            <AutoMLGenerator setModelSaved={setModelSaved} modelSaved={modelSaved} modelName={modelName} suggestedFeatures={suggestedFeatures} />
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default AutoMLWrapper

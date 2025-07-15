import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CSpinner,
  CTable,
  CTableBody,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CCol,
  CRow,
} from '@coreui/react'
import axios from 'axios'
import { cilMediaPlay, cilSave } from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import { Alert } from 'react-bootstrap'

const AutoMLGenerator = ({ setModelSaved, modelSaved, modelName, suggestedFeatures }) => {
  const [selectedFeatures, setSelectedFeatures] = useState(suggestedFeatures || [])
  const [epochsOptions, setEpochsOptions] = useState([50, 100, 200])
  const [testSizeOptions, setTestSizeOptions] = useState([10, 20, 30])
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [bestIdx, setBestIdx] = useState(null)

  const [status, setStatus] = useState("")
  const [error, setError] = useState("")


  const [trainingProgress, setTrainingProgress] = useState([])
  const [isTraining, setIsTraining] = useState(false)
  const [isFinished, setIsFinished] = useState(false)

  const [savedSummary, setSavedSummary] = useState(null)

  const API_BASE = import.meta.env.VITE_API_BASE_URL

  useEffect(() => {
    if (trainingProgress.length > 0) {
      const last = trainingProgress[trainingProgress.length - 1]
      if (last.model_idx === last.total_models) {
        setIsFinished(true)
        setStatus("AutoML training completed. You can now save the best model.")

        // Determinar el modelo con mejor R²
        const bestIndex = trainingProgress.reduce((best, current, idx, arr) =>
          current.r2 > arr[best].r2 ? idx : best
          , 0)
        setBestIdx(bestIndex)
      }
    }
  }, [trainingProgress])



  const startAutoMLTraining = async () => {
    setIsTraining(true)
    setTrainingProgress([])
    setIsFinished(false)

    const formData = new FormData()
    formData.append('model_name', modelName)
    formData.append('features', JSON.stringify(selectedFeatures))
    formData.append('epochs_options', JSON.stringify(epochsOptions))
    formData.append('test_size_options', JSON.stringify(testSizeOptions))

    try {
      const res = await fetch(`${API_BASE}/pulse/generator/automl_train_ws`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      const task_id = data.task_id

      const socket = new WebSocket(`${API_BASE.replace(/^http/, 'ws')}/ws/automl/${task_id}`)

      socket.onopen = () => {
        setStatus("AutoML training started...")
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.error) {
            setError(`Error during training: ${data.error}`)
            setIsTraining(false)
            setIsFinished(true)
            socket.close()
            return
          }

          // Progreso por época
          if (data.epoch && data.total_epochs) {
            setStatus(`Model ${data.model_idx} / ${data.total_models} — Epoch ${data.epoch} / ${data.total_epochs} — Loss: ${data.loss.toFixed(4)} | MAE: ${data.mae.toFixed(4)} | MSE: ${data.mse.toFixed(4)}`)
            return
          }

          // Resumen del modelo (únicamente si is_summary == true)
          if (data.is_summary) {
            setTrainingProgress((prev) => {
              const alreadyExists = prev.some(p => p.temp_id === data.temp_id)
              return alreadyExists ? prev : [...prev, data]
            })
          }

        } catch (e) {
          console.error("❌ Error parsing AutoML message:", e)
        }
      }

      socket.onerror = (err) => {
        console.error("WebSocket AutoML error:", err)
        setError("Connection error during AutoML training.")
        setIsTraining(false)
        setIsFinished(true)
      }

      socket.onclose = () => {
        setStatus("AutoML training finished successfully.")
        setIsTraining(false)
        setIsFinished(true)
      }



    } catch (err) {
      console.error('❌ AutoML WebSocket failed:', err)
      setIsTraining(false)
      setIsFinished(true)
    }
  }


  const handleSaveBestModel = async () => {
    if (bestIdx === null) {
      alert('Please select a model to save.')
      return
    }

    const selected = trainingProgress[bestIdx]

    const timestamp = new Date()
    const formatted = `${timestamp.getFullYear()}${(timestamp.getMonth() + 1).toString().padStart(2, '0')}${timestamp.getDate().toString().padStart(2, '0')}_${timestamp.getHours().toString().padStart(2, '0')}${timestamp.getMinutes().toString().padStart(2, '0')}${timestamp.getSeconds().toString().padStart(2, '0')}`
    const finalModelName = `${modelName}-${formatted}`

    try {
      await axios.post(
        `${API_BASE}/pulse/generator/save_automl_model`,
        {
          model_temp_id: selected.temp_id,
          final_model_name: finalModelName,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      // Guardamos resumen
      setSavedSummary({
        model_name: finalModelName,
        features: selected.features || [],
        epochs: selected.epochs,
        test_size: selected.test_size,
        metrics: {
          loss: selected.loss,
          mae: selected.mae,
          r2: selected.r2,
        },
      })
      setModelSaved(true)

      alert(`✅ Model '${finalModelName}' saved successfully!`)
    } catch (err) {
      console.error(err)
      alert('❌ Failed to save the selected model.')
    }
  }

  return (
    <CCard className="mb-4">
      <CCardBody>
        {!modelSaved ? (
          <>
            <h5>Select predictive features</h5>
            <CRow className="mb-3">
              {(suggestedFeatures || []).map((feat, idx) => (
                <CCol xs={6} md={3} key={idx}>
                  <CFormCheck
                    type="checkbox"
                    label={feat}
                    checked={selectedFeatures.includes(feat)}
                    onChange={() =>
                      setSelectedFeatures((prev) =>
                        prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat],
                      )
                    }
                  />
                </CCol>
              ))}
            </CRow>

            <h5>Epochs options</h5>
            <CFormInput
              type="text"
              value={epochsOptions.join(',')}
              onChange={(e) => setEpochsOptions(e.target.value.split(',').map(Number))}
              className="mb-3"
              placeholder="e.g., 50,100,200"
            />
            <h5>Test size options (%)</h5>
            <CFormInput
              type="text"
              value={testSizeOptions.join(',')}
              onChange={(e) => setTestSizeOptions(e.target.value.split(',').map(Number))}
              className="mb-3"
              placeholder="e.g., 10,20,30"
            />
            <CButton color="primary" onClick={startAutoMLTraining} className="mb-3">
              {loading ? (
                <CSpinner size="sm" />
              ) : (
                <>
                  <CIcon icon={cilMediaPlay} className="me-2" /> Start Auto trainer
                </>
              )}
            </CButton>

            {isTraining && (
              <div className="mt-3">
                {status && <Alert variant="success">{status}</Alert>}
                {error && <Alert variant="danger">{error}</Alert>}

                <h5 className="mt-3">Model results</h5>
                {trainingProgress.map((model, idx) => (
                  <div key={idx} className="mb-2">
                    <strong>Model {model.model_idx} / {model.total_models}</strong><br />
                    Epochs: {model.epochs}, Test size: {model.test_size}%<br />
                    Loss: {model.loss.toFixed(6)} | MAE: {model.mae.toFixed(6)} | R²: {(model.r2 * 100).toFixed(2)}%
                  </div>
                ))}
              </div>
            )}

            {isFinished && trainingProgress.length > 0 && (
              <>
                <h5>Results</h5>
                <CTable striped hover responsive>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Epochs</CTableHeaderCell>
                      <CTableHeaderCell>Test Size (%)</CTableHeaderCell>
                      <CTableHeaderCell>Loss</CTableHeaderCell>
                      <CTableHeaderCell>MAE</CTableHeaderCell>
                      <CTableHeaderCell>R² (%)</CTableHeaderCell>
                      <CTableHeaderCell>Select</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {trainingProgress.map((model, idx) => (
                      <CTableRow key={idx} active={bestIdx === idx}>
                        <CTableDataCell>{model.epochs}</CTableDataCell>
                        <CTableDataCell>{model.test_size}</CTableDataCell>
                        <CTableDataCell>{model.loss.toFixed(6)}</CTableDataCell>
                        <CTableDataCell>{model.mae.toFixed(6)}</CTableDataCell>
                        <CTableDataCell>{(model.r2 * 100).toFixed(2)}</CTableDataCell>
                        <CTableDataCell>
                          <CFormCheck checked={bestIdx === idx} onChange={() => setBestIdx(idx)} />
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
                <CButton color="success" onClick={handleSaveBestModel}>
                  <CIcon icon={cilSave} className="me-2" /> Save selected model
                </CButton>
              </>
            )}
          </>
        ) : (
          <>
            <div className="mt-4">
              <h4>✅ Model saved successfully!</h4>
              <CCard className="mb-4">
                <CCardHeader>Model summary</CCardHeader>
                <CCardBody>
                  <p>
                    <strong>Model name:</strong> {savedSummary.model_name}
                  </p>
                  <p>
                    <strong>Features:</strong> {savedSummary.features.join(', ')}
                  </p>
                  <p>
                    <strong>Epochs:</strong> {savedSummary.epochs}
                  </p>
                  <p>
                    <strong>Test size:</strong> {savedSummary.test_size}%
                  </p>
                  <p>
                    <strong>Loss:</strong> {savedSummary.metrics.loss.toFixed(6)}
                  </p>
                  <p>
                    <strong>MAE:</strong> {savedSummary.metrics.mae.toFixed(6)}
                  </p>
                  <p>
                    <strong>R²:</strong> {(savedSummary.metrics.r2 * 100).toFixed(2)}%
                  </p>
                </CCardBody>
              </CCard>
            </div>
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default AutoMLGenerator

import React, { useEffect, useState } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CContainer,
  CRow,
  CCol,
  CSpinner,
  CAlert,
  CBadge,
} from '@coreui/react'
import axios from 'axios'
import ScenarioForm from './ScenarioForm'
import ScenarioResult from './ScenarioResult'
import ScenarioHistory from './ScenarioHistory'

const ScenarioSimulator = () => {
  const [modelSummary, setModelSummary] = useState(null)
  const [defaultModel, setDefaultModel] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [currentPUE, setCurrentPUE] = useState(null)
  const [simulatedPUE, setSimulatedPUE] = useState(null)
  const [history, setHistory] = useState([])
  const [datasetSample, setDatasetSample] = useState([])
  const [restoredInputs, setRestoredInputs] = useState(null)

  const API_BASE = import.meta.env.VITE_API_BASE_URL

  useEffect(() => {
    const fetchModel = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/pulse/settings/default_model`)
        const model = data.default_model
        setDefaultModel(model)
        if (model) {
          const res = await axios.get(`${API_BASE}/pulse/explorer/summary/${model}`)
          setModelSummary(res.data)

          if (res.data.simulations) {
            setHistory(res.data.simulations)
          }

          const datasetRes = await axios.get(
            `${API_BASE}/pulse/datasets/load/${res.data.model_name}.csv`,
          )
          setDatasetSample(datasetRes.data.sample)
        }
      } catch (err) {
        setError('Failed to load model summary or dataset')
      } finally {
        setIsLoading(false)
      }
    }
    fetchModel()
  }, [])

  const handleDeleteSimulation = async (simId) => {
    const confirm = window.confirm('Are you sure you want to delete this simulation?')
    if (!confirm) return

    try {
      const formData = new FormData()
      formData.append('model_name', defaultModel)
      formData.append('sim_id', simId)

      const res = await axios.post(`${API_BASE}/pulse/generator/simulation/delete`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setHistory((prev) => prev.filter((s) => s.id !== simId))
      alert(res.data.message)
    } catch (err) {
      alert(err)
      console.error('Failed to delete simulation', err)
    }
  }

  const handleClearAllSimulations = async () => {
    const confirm = window.confirm('Are you sure you want to delete all simulations?')
    if (!confirm) return

    try {
      const formData = new FormData()
      formData.append('model_name', defaultModel)

      await axios.post(`${API_BASE}/pulse/explorer/simulations/clear`, formData)
      setHistory([])
      alert(res.data.message)
    } catch (err) {
      console.error('Failed to clear simulations', err)
    }
  }

  const handleSimulation = async (inputs) => {
    try {
      const formData = new FormData()
      formData.append('model_name', defaultModel)
      formData.append('input', JSON.stringify({ values: inputs }))
      formData.append('save_simulation', 'true')

      const res = await axios.post(`${API_BASE}/pulse/generator/predict`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const simulated = parseFloat(res.data.pue_prediction)
      setSimulatedPUE(simulated)

      // 🔁 Recargar simulaciones para incluir el nuevo ID real
      const summaryRes = await axios.get(`${API_BASE}/pulse/explorer/summary/${defaultModel}`)
      if (summaryRes.data.simulations) {
        setHistory(summaryRes.data.simulations)
      }
    } catch (err) {
      console.error('Simulation failed', err)
      setError('Simulation failed')
    }
  }

  const handleFillScenario = () => {
    if (datasetSample.length > 0) {
      const randomIndex = Math.floor(Math.random() * datasetSample.length)
      const row = datasetSample[randomIndex]

      const inputs = {}
      modelSummary.features.forEach((f) => {
        if (f in row) {
          let val = row[f]
          if (typeof val === 'string') val = val.replace(',', '.')
          inputs[f] = parseFloat(val) || 0
        } else {
          inputs[f] = 0
        }
      })

      const formData = new FormData()
      formData.append('model_name', defaultModel)
      formData.append('input', JSON.stringify({ values: inputs }))

      axios
        .post(`${API_BASE}/pulse/generator/predict`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((res) => {
          const pue = parseFloat(res.data.pue_prediction)
          if (!isNaN(pue)) setCurrentPUE(pue)
          else setCurrentPUE(null)
        })
        .catch((err) => {
          console.error('Failed to fetch current PUE', err)
          setCurrentPUE(null)
        })

      return inputs
    }
    return null
  }

  return (
    <CContainer>
      <CRow>
        <CAlert color="info">
          This module allows you to manually enter input values for the features used by your
          trained model and instantly obtain the predicted PUE. You can use the "Fill example
          scenario" button to load a real sample from your dataset, modify any values, and click
          "Simulate scenario" to visualize the result and assess energy performance.
        </CAlert>
        <CCol xs={12}>
          {isLoading ? (
            <CSpinner />
          ) : error ? (
            <CAlert color="danger">{error}</CAlert>
          ) : (
            <>
              <ScenarioForm
                features={modelSummary?.features || []}
                onSimulate={handleSimulation}
                onReset={() => setSimulatedPUE(null)}
                onFill={handleFillScenario}
                restoredInputs={restoredInputs}
              />

              {simulatedPUE && (
                <ScenarioResult currentPUE={currentPUE} simulatedPUE={simulatedPUE} />
              )}

              <ScenarioHistory
                history={history}
                onRestore={(inputs) => {
                  setRestoredInputs(inputs)
                  handleSimulation(inputs)
                }}
                onDelete={handleDeleteSimulation}
                onClearAll={handleClearAllSimulations}
              />
            </>
          )}
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default ScenarioSimulator

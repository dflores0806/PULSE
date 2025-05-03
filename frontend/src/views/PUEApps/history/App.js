import React, { useEffect, useState } from 'react'
import {
  CCardBody,
  CRow,
  CCol,
  CFormSelect,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CButton,
  CBadge,
  CPagination,
  CPaginationItem,
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CSpinner,
  CFormLabel,
  CAlert,
} from '@coreui/react'
import {
  cilLoopCircular,
  cilMagnifyingGlass,
  cilArrowCircleRight,
  cilXCircle,
  cilTrash,
} from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import { Container, Row } from 'react-bootstrap'
import { Bar } from 'react-chartjs-2'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Title } from 'chart.js'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Title, ChartDataLabels)

const History = () => {
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState('')
  const [history, setHistory] = useState([])
  const [filteredHistory, setFilteredHistory] = useState([])
  const [filterType, setFilterType] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [modalVisible, setModalVisible] = useState(false)
  const [modalContent, setModalContent] = useState(null)

  const [replicateVisible, setReplicateVisible] = useState(false)
  const [replicateTarget, setReplicateTarget] = useState('')
  const [replicateCompatible, setReplicateCompatible] = useState(true)
  const [replicateOriginalPUE, setReplicateOriginalPUE] = useState(null)
  const [replicateResultPUE, setReplicateResultPUE] = useState(null)
  const [replicateLLMResponse, setReplicateLLMResponse] = useState('')
  const [isReplicating, setIsReplicating] = useState(false)

  const itemsPerPage = 10

  useEffect(() => {
    const fetchModels = async () => {
      const modelsRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/pulse/explorer/models`)
      const modelsData = await modelsRes.json()
      const modelList = modelsData.models || modelsData
      setModels(modelList)

      const defaultRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/pulse/settings/default_model`)
      const defaultData = await defaultRes.json()
      if (defaultData.default_model && modelList.includes(defaultData.default_model)) {
        setSelectedModel(defaultData.default_model)
      } else if (modelList.length > 0) {
        setSelectedModel(modelList[0])
      }
    }

    fetchModels()
  }, [])

  useEffect(() => {
    if (selectedModel) {
      fetch(`${import.meta.env.VITE_API_BASE_URL}/pulse/history/${selectedModel}`)
        .then((res) => res.json())
        .then((data) => {
          const merged = [
            ...(data.simulations || []).map((s, i) => ({
              ...s,
              type: 'Simulation',
              id: `sim_${i}`,
            })),
            ...(data.llm_questions || data.llm_history || []).map((q, i) => ({
              ...q,
              type: 'LLM',
              id: `llm_${i}`,
            })),
          ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

          setHistory(merged)
          setFilteredHistory(merged)
          setCurrentPage(1)
        })
    }
  }, [selectedModel])

  useEffect(() => {
    if (filterType === 'All') setFilteredHistory(history)
    else setFilteredHistory(history.filter((h) => h.type === filterType))
    setCurrentPage(1)
  }, [filterType, history])

  const getPUEBarColor = () => {
    if (replicateOriginalPUE === null || replicateResultPUE === null) return ['#39f', '#39f']
    return replicateResultPUE > replicateOriginalPUE
      ? ['#2eb85c', '#e55353']
      : ['#e55353', '#2eb85c']
  }

  const handleDelete = async (item) => {
    const confirmed = confirm(
      `⚠️ Are you sure you want to delete this ${item.type} action for model "${selectedModel}"?`,
    )
    if (!confirmed) return

    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/pulse/history/delete_item`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: selectedModel,
        type: item.type,
        timestamp: item.timestamp,
      }),
    })

    if (res.ok) {
      // Refresh history after deletion
      const data = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/pulse/history/${selectedModel}`,
      ).then((r) => r.json())
      const merged = [
        ...(data.simulations || []).map((s, i) => ({ ...s, type: 'Simulation', id: `sim_${i}` })),
        ...(data.llm_questions || data.llm_history || []).map((q, i) => ({
          ...q,
          type: 'LLM',
          id: `llm_${i}`,
        })),
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      setHistory(merged)
      setFilteredHistory(merged)
    } else {
      alert('❌ Failed to delete item.')
    }
  }

  const clearSimulations = async () => {
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/pulse/history/clear_simulations/${selectedModel}`, {
      method: 'DELETE',
    })
    //setConfirmClearSimModal(false)
    // Refresh
    const newData = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/pulse/history/${selectedModel}`,
    ).then((res) => res.json())
    const merged = [
      ...(newData.simulations || []).map((s, i) => ({ ...s, type: 'Simulation', id: `sim_${i}` })),
      ...(newData.llm_questions || newData.llm_history || []).map((q, i) => ({
        ...q,
        type: 'LLM',
        id: `llm_${i}`,
      })),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    setHistory(merged)
    setFilteredHistory(merged)
  }

  const clearLLM = async () => {
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/pulse/history/clear_llm/${selectedModel}`, {
      method: 'DELETE',
    })
    //setConfirmClearLLMModal(false)
    // Refresh
    const newData = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/pulse/history/${selectedModel}`,
    ).then((res) => res.json())
    const merged = [
      ...(newData.simulations || []).map((s, i) => ({ ...s, type: 'Simulation', id: `sim_${i}` })),
      ...(newData.llm_questions || newData.llm_history || []).map((q, i) => ({
        ...q,
        type: 'LLM',
        id: `llm_${i}`,
      })),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    setHistory(merged)
    setFilteredHistory(merged)
  }

  const handleReplicate = async (item) => {
    setReplicateVisible(true)
    setModalContent(item)
    setReplicateTarget('')
    setReplicateCompatible(true)
    setReplicateResultPUE(null)
    setReplicateLLMResponse('')
    if (item.type === 'Simulation') {
      setReplicateOriginalPUE(item.pue ?? item.output ?? 'N/A')
    }
  }

  const checkCompatibility = async (targetModel) => {
    setReplicateTarget(targetModel)
    if (modalContent?.type === 'Simulation') {
      const res1 = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/pulse/explorer/summary/${selectedModel}`,
      )
      const res2 = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/pulse/explorer/summary/${targetModel}`,
      )
      const json1 = await res1.json()
      const json2 = await res2.json()
      const features1 = (json1.features || []).sort()
      const features2 = (json2.features || []).sort()
      setReplicateCompatible(JSON.stringify(features1) === JSON.stringify(features2))
    } else {
      setReplicateCompatible(true)
    }
  }

  const runReplication = async () => {
    if (!replicateTarget || !modalContent) return
    setIsReplicating(true)

    if (modalContent.type === 'Simulation') {
      const payload = new FormData()
      payload.append('input', JSON.stringify({ values: modalContent.inputs }))
      payload.append('model_name', replicateTarget)
      payload.append('save_simulation', true)

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/pulse/generator/predict`, {
        method: 'POST',
        body: payload,
      })

      const json = await res.json()
      setReplicateResultPUE(json.pue_prediction)
    } else if (modalContent.type === 'LLM') {
      const query = modalContent.query || modalContent.question
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/pulse/llm/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            model: modalContent.ollama_model || 'phi',
            stream: true,
            model_name: replicateTarget,
          }),
        })

        if (!res.ok || !res.body) {
          throw new Error('No response body')
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let result = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n').filter(Boolean)
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line)
              result += parsed.response || ''
              setReplicateLLMResponse(result)
            } catch {
              console.warn('Failed to parse line:', line)
            }
          }
        }
      } catch (err) {
        setReplicateLLMResponse(`[Error]: ${err.message}`)
      }
    }

    setIsReplicating(false)
  }

  return (
    <>
      <Container className="mb-4">
        <CRow>
          <CAlert color="info">
            The History module provides a comprehensive, time-ordered record of all user-driven
            actions performed on a given predictive model, including both simulation-based
            evaluations and natural language queries to the integrated LLM. Each entry encapsulates
            the context, inputs, and outputs of the interaction, allowing users to revisit,
            replicate, or remove specific events. This traceability fosters transparency, supports
            reproducibility of experiments across models, and facilitates continuous learning and
            model refinement through comparative analysis. By combining interpretability with
            actionable insights, History bridges operational workflows with human-centered
            understanding of model behavior.
          </CAlert>
          <CCol xs={12}>
            <CCardBody>
              <CRow className="mb-3">
                <CCol md={4}>
                  <CFormSelect
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    label="Select model"
                  >
                    {models.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={4}>
                  <CFormSelect
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    label="Filter by type"
                  >
                    <option value="All">All</option>
                    <option value="Simulation">Simulations</option>
                    <option value="LLM">LLM Questions</option>
                  </CFormSelect>
                </CCol>
                <CCol md={4}>
                  <div className="d-flex flex-column align-items-center">
                    <CFormLabel htmlFor="clearSimBtn">Actions</CFormLabel>

                    <div className="d-flex flex-wrap gap-2">
                      <CButton
                        color="danger"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (
                            confirm(
                              `⚠️ Are you sure you want to delete all simulations for model "${selectedModel}"?`,
                            )
                          ) {
                            clearSimulations()
                          }
                        }}
                        disabled={!selectedModel}
                      >
                        <CIcon icon={cilTrash} className="me-1 text-danger" />
                        Clear Simulations
                      </CButton>
                      <CButton
                        color="danger"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (
                            confirm(
                              `⚠️ Are you sure you want to delete all LLM questions for model "${selectedModel}"?`,
                            )
                          ) {
                            clearLLM()
                          }
                        }}
                        disabled={!selectedModel}
                      >
                        <CIcon icon={cilTrash} className="me-1 text-danger" />
                        Clear LLM Questions
                      </CButton>
                    </div>
                  </div>
                </CCol>
              </CRow>

              <CTable align="middle" hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Timestamp</CTableHeaderCell>
                    <CTableHeaderCell>Type</CTableHeaderCell>
                    <CTableHeaderCell>Summary</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {filteredHistory
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((item) => {
                      const result = item.pue ?? item.output ?? 'N/A'
                      const summary =
                        item.type === 'Simulation'
                          ? `${Object.entries(item.inputs || {})
                              .map(([k, v]) => `${k}=${v}`)
                              .join(', ')} → PUE=${result}`
                          : `Q: ${(item.query || item.question || '').slice(0, 60)}...\nR: ${(item.response || '').slice(0, 80)}...`
                      return (
                        <CTableRow key={item.id}>
                          <CTableDataCell>
                            {new Date(item.timestamp).toLocaleString()}
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={item.type === 'Simulation' ? 'primary' : 'info'}>
                              {item.type}
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell
                            style={{ cursor: 'pointer', whiteSpace: 'pre-wrap' }}
                            onClick={() => {
                              setModalContent(item)
                              setModalVisible(true)
                            }}
                          >
                            {summary}
                          </CTableDataCell>
                          <CTableDataCell>
                            <div className="d-flex gap-2">
                              <CButton
                                size="sm"
                                color="secondary"
                                onClick={() => handleReplicate(item)}
                              >
                                <CIcon icon={cilLoopCircular} className="me-1" /> Replicate
                              </CButton>
                              <CButton
                                size="sm"
                                color="info"
                                onClick={() => {
                                  setModalContent(item)
                                  setModalVisible(true)
                                }}
                              >
                                <CIcon icon={cilMagnifyingGlass} className="me-1" /> View
                              </CButton>
                              <CButton size="sm" color="danger" onClick={() => handleDelete(item)}>
                                <CIcon icon={cilTrash} className="me-1" /> Delete
                              </CButton>
                            </div>
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })}
                </CTableBody>
              </CTable>

              <CPagination align="center" className="mt-3">
                {[...Array(Math.ceil(filteredHistory.length / itemsPerPage))].map((_, index) => (
                  <CPaginationItem
                    key={index}
                    active={index + 1 === currentPage}
                    onClick={() => setCurrentPage(index + 1)}
                  >
                    {index + 1}
                  </CPaginationItem>
                ))}
              </CPagination>
            </CCardBody>
          </CCol>
        </CRow>
      </Container>

      {modalContent && (
        <CModal visible={modalVisible} onClose={() => setModalVisible(false)} size="xl">
          <CModalHeader>
            <strong>Action Details</strong>
          </CModalHeader>
          <CModalBody>
            {modalContent.type === 'Simulation' ? (
              <>
                <p>
                  <strong>Inputs:</strong>
                </p>
                <ul>
                  {Object.entries(modalContent.inputs || {}).map(([k, v]) => (
                    <li key={k}>
                      {k}: {v}
                    </li>
                  ))}
                </ul>
                <p>
                  <strong>PUE:</strong> {modalContent.pue ?? modalContent.output ?? 'N/A'}
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>Question:</strong>
                </p>
                <p>{modalContent.query || modalContent.question}</p>
                <p>
                  <strong>Response:</strong>
                </p>
                <div style={{ whiteSpace: 'pre-wrap' }}>{modalContent.response}</div>
              </>
            )}
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setModalVisible(false)}>
              <CIcon icon={cilXCircle} className="me-1" /> Close
            </CButton>
          </CModalFooter>
        </CModal>
      )}

      {modalContent && (
        <CModal visible={replicateVisible} onClose={() => setReplicateVisible(false)} size="xl">
          <CModalHeader>
            <strong>Replicate {modalContent.type}</strong>
          </CModalHeader>
          <CModalBody>
            {modalContent.type === 'Simulation' ? (
              <>
                <p>
                  <strong>Original Inputs:</strong>
                </p>
                <ul>
                  {Object.entries(modalContent.inputs || {}).map(([k, v]) => (
                    <li key={k}>
                      {k}: {v}
                    </li>
                  ))}
                </ul>
                <p>
                  <strong>Original PUE:</strong> {replicateOriginalPUE}
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>Original question:</strong>
                </p>
                <p>{modalContent.query || modalContent.question}</p>
                <p>
                  <strong>Original Response:</strong>
                </p>
                <div style={{ whiteSpace: 'pre-wrap' }}>{modalContent.response}</div>
              </>
            )}

            <CFormSelect
              label="Select target model"
              className="mt-3"
              value={replicateTarget}
              onChange={(e) => checkCompatibility(e.target.value)}
            >
              <option value="">-- Select --</option>
              {models
                .filter((m) => m !== selectedModel)
                .map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
            </CFormSelect>

            {!replicateCompatible && replicateTarget && (
              <p className="text-danger mt-2">
                ❌ Models are not compatible (different input features)
              </p>
            )}

            {isReplicating && (
              <p className="text-info mt-3">
                <CSpinner size="sm" className="me-2" /> Executing replication...
              </p>
            )}

            {modalContent.type === 'Simulation' && replicateCompatible && replicateResultPUE && (
              <div className="mt-4">
                <strong>PUE Comparison:</strong>

                <div className="my-4" style={{ height: '160px' }}>
                  <Bar
                    data={{
                      labels: ['Original PUE', 'Replicated PUE'],
                      datasets: [
                        {
                          label: 'PUE',
                          data: [replicateOriginalPUE ?? 0, replicateResultPUE ?? 0],
                          backgroundColor: getPUEBarColor(),
                          borderRadius: 4,
                          barThickness: 30,
                          datalabels: {
                            anchor: 'center',
                            align: 'right',
                            color: '#FFF',
                            formatter: (value) => value.toFixed(2),
                          },
                        },
                      ],
                    }}
                    options={{
                      indexAxis: 'y',
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        title: {
                          display: true,
                          text: 'PUE comparison',
                          font: { size: 16 },
                        },
                        datalabels: {}, // activamos el plugin
                      },
                      scales: {
                        x: {
                          beginAtZero: true,
                          max: 3,
                          ticks: { stepSize: 0.5 },
                        },
                      },
                    }}
                    height={160}
                  />
                </div>

                <p className="mt-2 text-center">
                  Difference:{' '}
                  {Math.abs(
                    ((replicateResultPUE - replicateOriginalPUE) / replicateOriginalPUE) * 100,
                  ).toFixed(2)}
                  %{replicateResultPUE < replicateOriginalPUE ? ' improvement' : ' degradation'}
                </p>
              </div>
            )}

            {modalContent.type === 'LLM' && replicateLLMResponse && (
              <div className="mt-4">
                <strong>Replicated response:</strong>
                <div style={{ whiteSpace: 'pre-wrap' }}>{replicateLLMResponse}</div>
              </div>
            )}
          </CModalBody>
          <CModalFooter>
            <CButton
              color="primary"
              disabled={
                isReplicating ||
                !replicateTarget ||
                (modalContent.type === 'Simulation' && !replicateCompatible)
              }
              onClick={runReplication}
            >
              {isReplicating ? (
                <>
                  <CSpinner size="sm" className="me-2" /> Processing...
                </>
              ) : (
                <>
                  <CIcon icon={cilArrowCircleRight} className="me-1" /> Replicate now
                </>
              )}
            </CButton>
            <CButton
              color="secondary"
              onClick={() => setReplicateVisible(false)}
              disabled={isReplicating}
            >
              <CIcon icon={cilXCircle} className="me-1" /> Close
            </CButton>
          </CModalFooter>
        </CModal>
      )}
    </>
  )
}

export default History

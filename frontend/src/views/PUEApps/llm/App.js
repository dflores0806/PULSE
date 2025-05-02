import React, { useState, useRef } from 'react'
import {
  CCard,
  CForm,
  CFormInput,
  CFormSelect,
  CButton,
  CAlert,
  CSpinner,
  CListGroup,
  CListGroupItem,
  CRow,
  CCol,
  CPagination,
  CPaginationItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSend, cilMediaStop } from '@coreui/icons'
import { Container, Row } from 'react-bootstrap'
import axios from 'axios'
import { useModel } from '../../../context/ModelContext'

import { useEffect } from 'react'
import {
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

const LLMAssistant = () => {
  const [question, setQuestion] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [engine, setEngine] = useState('phi')
  const [updateMessage, setUpdateMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const controllerRef = useRef(null)

  const [modelsAvailable, setModelsAvailable] = useState([])
  const [historyModel, setHistoryModel] = useState('')
  const [selectedHistory, setSelectedHistory] = useState([])

  const [expandedRow, setExpandedRow] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  const active_model = useModel()

  const API_BASE = import.meta.env.VITE_API_BASE_URL

  const exampleQuestions = [
    'How can I reduce PUE in cold months?',
    'What parameters are most correlated with PUE?',
    'How can I improve cooling system performance?',
    'How do internal temperatures affect the overall PUE?',
    'What input variables most affect the model output?',
    '¿Qué parámetros afectan al PUE?',
    '¿Cuáles son los valores atípicos en la temperatura ambiente?',
    '¿Qué tendencia diaria presenta el consumo energético?',
    '¿Cómo se comporta la humedad 2 durante los últimos días?',
    '¿Qué variable tiene mayor correlación negativa con el PUE?',
  ]

  const stopGeneration = () => {
    if (controllerRef.current) {
      controllerRef.current.abort()
      setStatusMessage('')
      setResponse(response + '\n[⛔ Response generation stopped by user.]')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResponse('')
    setStatusMessage('⏳ Processing your question, please wait...')
    controllerRef.current = new AbortController()

    try {
      const res = await fetch(`${API_BASE}/pue/llm/ask`, {
        method: 'POST',
        body: JSON.stringify({
          query: question,
          model: engine,
          stream: true,
          model_name: active_model,
        }),
        headers: { 'Content-Type': 'application/json' },
        signal: controllerRef.current.signal,
      })

      if (!res.ok) throw new Error('Request failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(Boolean)

        for (const line of lines) {
          try {
            const json = JSON.parse(line)
            if (json.response) {
              fullText += json.response
              setResponse(fullText)
            }
          } catch (e) {
            console.error('Parse error:', line)
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Failed to receive response from LLM.')
      }
    } finally {
      setStatusMessage('')
      setLoading(false)
    }
  }

  const handleExampleClick = (q) => {
    setQuestion(q)
    setResponse('')
    setError('')
    setStatusMessage('')
  }

  const filteredHistory = selectedHistory
    .filter((h) => !historyModel || h.dataset?.startsWith(historyModel))
    .slice()
    .reverse()

  const pageCount = Math.ceil(selectedHistory.length / itemsPerPage)
  const paginatedData = selectedHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  )

  useEffect(() => {
    axios
      .get(`${API_BASE}/pue/exp/models`)
      .then((res) => setModelsAvailable(res.data.models || []))
      .catch(() => setModelsAvailable([]))
  }, [])

  useEffect(() => {
    if (!historyModel) {
      setSelectedHistory([])
      return
    }

    axios
      .get(`${API_BASE}/pue/exp/summary/${historyModel}`)
      .then((res) => {
        const history = res.data?.llm_history || []
        setSelectedHistory(history.reverse())
        setCurrentPage(1) // reiniciar paginación
      })
      .catch(() => setSelectedHistory([]))
  }, [historyModel])

  return (
    <Container className="mb-4">
      <Row>
        <CAlert color="info">
          This LLM assistant (Ollama) allows you to interact with an AI model trained on your
          uploaded dataset. You can ask questions in natural language about PUE optimization,
          temperature trends, correlated parameters, outliers, and more. Select your preferred
          inference engine and type your question — the assistant will reply with insights based on
          your real data.
        </CAlert>

        <CForm onSubmit={handleSubmit}>
          <CFormSelect
            label="LLM Engine"
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
            className="mb-3"
          >
            <option value="phi">phi – fast and accurate</option>
            <option value="tinyllama">tinyllama – extremely fast, low resource</option>
            <option value="llama2">llama2 – balanced speed and reasoning</option>
            <option value="mistral">mistral – high quality, slower</option>
            <option value="gemma">gemma – efficient, small footprint</option>
          </CFormSelect>
          <CFormInput
            label="Your Question"
            placeholder="Ask something..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="mb-3"
            required
          />
          <CRow className="align-items-center mb-3">
            <CCol>
              <CButton type="submit" color="primary" disabled={loading}>
                {loading ? (
                  <CSpinner size="sm" />
                ) : (
                  <>
                    <CIcon icon={cilSend} className="me-2" /> Ask
                  </>
                )}
              </CButton>

              {loading && (
                <CButton type="button" color="danger" className="ms-3" onClick={stopGeneration}>
                  <CIcon icon={cilMediaStop} className="me-2" /> Stop
                </CButton>
              )}
            </CCol>
            <CCol className="text-end text-muted">{statusMessage}</CCol>
          </CRow>
        </CForm>

        {response && (
          <CAlert color="success" className="mt-4" style={{ whiteSpace: 'pre-wrap' }}>
            <strong>Response:</strong>
            <br />
            {response}
          </CAlert>
        )}

        {error && (
          <CAlert color="danger" className="mt-4">
            {error}
          </CAlert>
        )}
        {updateMessage && (
          <CAlert color="info" className="mt-3">
            {updateMessage}
          </CAlert>
        )}

        <h6 className="mt-5 mb-2">📌 Example questions</h6>
        <CListGroup>
          {exampleQuestions.map((q, idx) => (
            <CListGroupItem key={idx} onClick={() => handleExampleClick(q)} role="button">
              {q}
            </CListGroupItem>
          ))}
        </CListGroup>

        <h6 className="mt-5 mb-2">📚 Past Questions</h6>

        <CFormSelect
          className="mb-3"
          label="Filter by model"
          value={historyModel}
          onChange={(e) => setHistoryModel(e.target.value)}
        >
          <option value="">-- All models --</option>
          {modelsAvailable.map((m, idx) => (
            <option key={idx} value={m}>
              {m}
            </option>
          ))}
        </CFormSelect>

        {selectedHistory.length === 0 ? (
          <p className="text-muted">No previous questions found.</p>
        ) : (
          <>
            <div className="table-responsive">
              <CTable striped hover>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Date</CTableHeaderCell>
                    <CTableHeaderCell>Query</CTableHeaderCell>
                    <CTableHeaderCell>Engine</CTableHeaderCell>
                    <CTableHeaderCell>Response</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {paginatedData.map((h, idx) => (
                    <CTableRow key={idx}>
                      <CTableDataCell>{new Date(h.timestamp).toLocaleString()}</CTableDataCell>
                      <CTableDataCell>{h.query}</CTableDataCell>
                      <CTableDataCell>{h.ollama_model}</CTableDataCell>
                      <CTableDataCell
                        className="text-primary"
                        style={{ cursor: 'pointer', whiteSpace: 'pre-wrap' }}
                        onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                      >
                        {expandedRow === idx ? h.response : h.response.slice(0, 100) + '...'}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </div>

            <CPagination align="end" className="mt-3">
              <CPaginationItem
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                «
              </CPaginationItem>
              {[...Array(pageCount)].map((_, i) => (
                <CPaginationItem
                  key={i}
                  active={i + 1 === currentPage}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </CPaginationItem>
              ))}
              <CPaginationItem
                disabled={currentPage === pageCount}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                »
              </CPaginationItem>
            </CPagination>
          </>
        )}
      </Row>
    </Container>
  )
}

export default LLMAssistant

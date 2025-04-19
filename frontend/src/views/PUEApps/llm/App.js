import React, { useState, useRef } from 'react'
import {
  CCard, CForm, CFormInput, CFormSelect, CButton,
  CAlert, CSpinner, CListGroup, CListGroupItem, CRow, CCol
} from '@coreui/react'

import { Container, Row } from 'react-bootstrap'

const LLMAssistant = () => {
  const [question, setQuestion] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [engine, setEngine] = useState('phi')
  const [updateMessage, setUpdateMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const controllerRef = useRef(null)

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
    '¿Qué variable tiene mayor correlación negativa con el PUE?'
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
          stream: true
        }),
        headers: { 'Content-Type': 'application/json' },
        signal: controllerRef.current.signal
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

  return (
    <Container className="mb-4">
      <Row>
        <CCard className="mb-4 border-info">
          <p>
            This LLM assistant (Ollama) allows you to interact with an AI model trained on your uploaded dataset.
            You can ask questions in natural language about PUE optimization, temperature trends, correlated parameters, outliers, and more.
            Select your preferred inference engine and type your question — the assistant will reply with insights based on your real data.
          </p>
        </CCard>
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
                {loading ? <CSpinner size="sm" /> : 'Ask'}
              </CButton>
              {loading && (
                <CButton type="button" color="danger" className="ms-3" onClick={stopGeneration}>
                  Stop
                </CButton>
              )}
            </CCol>
            <CCol className="text-end text-muted">
              {statusMessage}
            </CCol>
          </CRow>
        </CForm>

        {response && (
          <CAlert color="success" className="mt-4" style={{ whiteSpace: 'pre-wrap' }}>
            <strong>Response:</strong><br />{response}
          </CAlert>
        )}

        {error && <CAlert color="danger" className="mt-4">{error}</CAlert>}
        {updateMessage && <CAlert color="info" className="mt-3">{updateMessage}</CAlert>}

        <h6 className="mt-5 mb-2">📌 Example questions</h6>
        <CListGroup>
          {exampleQuestions.map((q, idx) => (
            <CListGroupItem key={idx} onClick={() => handleExampleClick(q)} role="button">
              {q}
            </CListGroupItem>
          ))}
        </CListGroup>

      </Row>
    </Container>
  )
}

export default LLMAssistant

import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Card, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap'
import { Bar } from 'react-chartjs-2'
import { Chart, registerables } from 'chart.js'
import { cilCheck, cilCheckCircle, cilXCircle } from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import { CCol, CRow } from '@coreui/react'

Chart.register(...registerables)

function FeatureSelector({ onFeatureSelect, modelName }) {
  const [suggested, setSuggested] = useState([])
  const [correlations, setCorrelations] = useState({})
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const formData = new FormData()
    const API_BASE = import.meta.env.VITE_API_BASE_URL
    formData.append('model_name', modelName)

    axios
      .post(`${API_BASE}/pulse/generator/suggest_features`, formData)
      .then((res) => {
        setSuggested(res.data.suggested_features || [])
        setCorrelations(res.data.correlations || {})
        setSelected(res.data.suggested_features || [])
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching feature suggestions:', err)
        setError('Failed to fetch feature suggestions.')
        setLoading(false)
      })
  }, [])

  const handleToggle = (feature) => {
    setSelected((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature],
    )
  }

  const handleSelectAll = () => {
    const allKeys = Object.keys(correlations).filter((k) => k !== 'pue')
    setSelected(allKeys)
  }

  const handleDeselectAll = () => {
    setSelected([])
  }

  const handleSubmit = () => {
    if (selected.length === 0) {
      setError('Please select at least one feature.')
      return
    }
    setStatus('Features selected.')
    setError('')
    onFeatureSelect(selected)
  }

  const correlationData = {
    labels: Object.keys(correlations),
    datasets: [
      {
        label: 'Correlation with PUE',
        data: Object.values(correlations),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    indexAxis: 'y',
    scales: {
      x: { beginAtZero: true },
      y: {
        ticks: {
          font: { size: 10 },
        },
      },
    },
    plugins: {
      legend: { display: false },
      datalabels: { display: false },
    },
  }

  const correlationKeys = Object.keys(correlations).filter((k) => k !== 'pue')
  const half = Math.ceil(correlationKeys.length / 2)
  const left = correlationKeys.slice(0, half)
  const right = correlationKeys.slice(half)

  return (
    <Card className="mb-4">
      <Card.Body>
        <Card.Title>2. Select predictive features</Card.Title>
        {loading ? (
          <div>
            <Spinner animation="border" size="sm" /> Loading suggestions...
          </div>
        ) : (
          <>
            {suggested.length === 0 && (
              <Alert variant="warning">No suggestions found or no correlation available.</Alert>
            )}

            <div className="mb-3 d-flex gap-2">
              <Button variant="primary" size="sm" onClick={handleSelectAll}>
                <CIcon icon={cilCheckCircle} className="me-2" /> Select all
              </Button>

              <Button variant="warning" size="sm" onClick={handleDeselectAll}>
                <CIcon icon={cilXCircle} className="me-2" /> Deselect all
              </Button>
            </div>

            <Form>
              <CRow className="mb-3">
                {[...left, ...right].map((feature, idx) => (
                  <CCol xs={12} md={3} key={idx}>
                    <Form.Check
                      type="checkbox"
                      label={feature}
                      checked={selected.includes(feature)}
                      onChange={() => handleToggle(feature)}
                    />
                  </CCol>
                ))}
              </CRow>
            </Form>

            <Button className="mt-3" onClick={handleSubmit} disabled={selected.length === 0}>
              <CIcon icon={cilCheck} className="me-2" /> Confirm selection
            </Button>

            {status && (
              <Alert variant="success" className="mt-3">
                {status}
              </Alert>
            )}
            {error && (
              <Alert variant="danger" className="mt-3">
                {error}
              </Alert>
            )}

            {correlationKeys.length > 0 && (
              <>
                <hr />
                <h5>Correlation chart</h5>
                <div style={{ overflowX: 'auto' }}>
                  <Bar data={correlationData} options={chartOptions} />
                </div>
              </>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  )
}

export default FeatureSelector

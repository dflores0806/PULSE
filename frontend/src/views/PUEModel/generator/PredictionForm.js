import React, { useState } from 'react'
import axios from 'axios'
import { Card, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap'
import { Bar } from 'react-chartjs-2'
import { Chart, registerables } from 'chart.js'
import { cilInput, cilChartLine } from '@coreui/icons'
import CIcon from '@coreui/icons-react'

Chart.register(...registerables)

function PredictionForm({ features, modelName, onPredictionSuccess, onPredictionError }) {
  const [inputs, setInputs] = useState({})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const API_BASE = import.meta.env.VITE_API_BASE_URL

  const handleChange = (e) => {
    setInputs({
      ...inputs,
      [e.target.name]: parseFloat(e.target.value),
    })
  }

  const handleFillExample = async (e) => {
    if (e) e.preventDefault()
    try {
      const formData = new FormData()
      formData.append('model_name', modelName)
      formData.append('features', JSON.stringify(features))
      const res = await axios.post(`${API_BASE}/pulse/generator/example_input`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setInputs(res.data.example || {})
    } catch (err) {
      console.error(err)
      setError('Failed to fetch example input.')
    }
  }

  const handleSubmit = async () => {
    if (features.some((f) => !(f in inputs) || isNaN(inputs[f]))) {
      setError('Please fill in all input fields with valid numbers.')
      return
    }

    setLoading(true)
    setResult(null)
    setError('')

    try {
      const formData = new FormData()
      formData.append('model_name', modelName)
      formData.append('input', JSON.stringify({ values: inputs }))
      const res = await axios.post(`${API_BASE}/pulse/generator/predict`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      if (res.data.pue_prediction !== undefined) {
        onPredictionSuccess()
      } else {
        onPredictionError()
      }

      setResult(res.data.pue_prediction)
    } catch (err) {
      console.error(err)
      setError('Prediction failed.')
      onPredictionError()
    } finally {
      setLoading(false)
    }
  }

  const chartData = {
    labels: ['Predicted PUE'],
    datasets: [
      {
        label: 'PUE Value',
        data: result !== null ? [result] : [],
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
    ],
  }

  const quarter = Math.ceil(features.length / 4)
  const col1 = features.slice(0, quarter)
  const col2 = features.slice(quarter, quarter * 2)
  const col3 = features.slice(quarter * 2, quarter * 3)
  const col4 = features.slice(quarter * 3)

  return (
    <Card className="mb-4">
      <Card.Body>
        <Card.Title>4. Predict PUE from your inputs</Card.Title>
        <Form>
          <Row>
            {[col1, col2, col3, col4].map((column, colIdx) => (
              <Col md={3} key={colIdx}>
                {column.map((feature, idx) => (
                  <Form.Group key={`${colIdx}-${idx}`} className="mb-2">
                    <Form.Label>{feature}</Form.Label>
                    <Form.Control
                      type="number"
                      step="any"
                      name={feature}
                      value={inputs[feature] !== undefined ? inputs[feature] : ''}
                      onChange={handleChange}
                    />
                  </Form.Group>
                ))}
              </Col>
            ))}
          </Row>
        </Form>

        <div className="d-flex gap-2 mt-3">
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Spinner as="span" animation="border" size="sm" /> Predicting...
              </>
            ) : (
              <>
                <CIcon icon={cilChartLine} className="me-2" /> Predict
              </>
            )}
          </Button>
          <Button type="button" variant="secondary" onClick={(e) => handleFillExample(e)}>
            <CIcon icon={cilInput} className="me-2" /> Fill example
          </Button>
        </div>

        {result !== null && (
          <>
            <Alert variant="success" className="mt-3">
              Predicted PUE: <strong>{result}</strong>
            </Alert>
            <div
              style={{
                maxWidth: '400px',
                marginTop: '1rem',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  indexAxis: 'y',
                  plugins: {
                    legend: { display: false },
                    datalabels: {
                      color: '#fff',
                      anchor: 'middle',
                      align: 'right',
                      formatter: (value) => value.toFixed(2),
                    },
                  },
                }}
              />
            </div>
          </>
        )}

        {error && (
          <Alert variant="danger" className="mt-3">
            {error}
          </Alert>
        )}
      </Card.Body>
    </Card>
  )
}

export default PredictionForm

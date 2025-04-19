import React, { useEffect, useState } from 'react'
import {
    CCard, CCardBody, CRow, CCol, CFormInput, CFormLabel, CButton, CAlert
} from '@coreui/react'
import { useModel } from '../../../context/ModelContext'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Title } from 'chart.js'
import { motion } from 'framer-motion'
import { Container, Row } from 'react-bootstrap'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Title)

import axios from 'axios'

const PredictorApp = () => {
    const model = useModel()
    const [features, setFeatures] = useState([])
    const [inputs, setInputs] = useState({})
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')
    const API_BASE = import.meta.env.VITE_API_BASE_URL

    useEffect(() => {
        if (model) {
            axios.get(`${API_BASE}/pue/exp/summary/${model}`)
                .then(res => {
                    if (res.data.features) {
                        setFeatures(res.data.features)
                        const initial = {}
                        res.data.features.forEach(f => initial[f] = '')
                        setInputs(initial)
                    }
                })
                .catch(() => {
                    setError('Failed to load model summary.')
                })
        }
    }, [model])

    const handleChange = (key, value) => {
        setInputs({ ...inputs, [key]: value })
    }

    const handleFillExample = () => {
        const formData = new FormData()
        formData.append('model_name', model)
        formData.append('features', JSON.stringify(features))
        axios.post(`${import.meta.env.VITE_API_BASE_URL}/pue/gen/example_input`, formData)
            .then(res => {
                setInputs(res.data.example || {})
            })
            .catch(() => {
                setError('Failed to fetch example input.')
            })
    }

    const handleSubmit = () => {
        if (features.some(f => !(f in inputs) || isNaN(inputs[f]))) {
            setError('Please fill in all input fields with valid numbers.')
            return
        }

        const formData = new FormData()
        formData.append('model_name', model)
        formData.append('input', JSON.stringify({ values: inputs }))

        axios.post(`${import.meta.env.VITE_API_BASE_URL}/pue/gen/predict`, formData)
            .then(res => {
                setResult(res.data.pue_prediction)
                setError('')
            })
            .catch(() => {
                setResult(null)
                setError('Prediction failed.')
            })
    }

    return (
        <Container className="mb-4">
            <Row>
                <CCard className="mb-4 border-info">
                    <p>
                        This module allows you to manually enter input values for the features used by your trained model and instantly obtain the predicted Power Usage Effectiveness (PUE).
                        You can use the “Fill Example” button to load a real sample from your dataset, modify any values, and click “Predict” to visualize the result and assess energy performance.
                    </p>
                </CCard>
                {error && <CAlert color="danger">{error}</CAlert>}
                <CRow className="mb-3">
                    {features.map((f, i) => (
                        <CCol md={3} key={i}>
                            <CFormLabel>{f}</CFormLabel>
                            <CFormInput
                                type="number"
                                value={inputs[f] !== undefined ? inputs[f] : ''}
                                onChange={(e) => handleChange(f, e.target.value)}
                            />
                        </CCol>
                    ))}
                </CRow>


                <CRow className="mb-3">
                    <CCol>
                        <CButton type="button" color="secondary" onClick={handleFillExample}>Fill Example</CButton>
                        <CButton type="button" className="ms-3" color="primary" onClick={handleSubmit}>Predict</CButton>
                    </CCol>
                </CRow>



                {result !== null && (
                    <>
                        <CAlert color="success" className="mt-4">
                            <strong>PUE Prediction:</strong> {result !== null && !isNaN(result) ? result.toFixed(4) : 'N/A'}
                        </CAlert>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1 }}
                        >
                            <CCard className="mt-4">
                                <CCardBody style={{ maxHeight: '200px' }}>
                                    <Bar
                                        data={{
                                            labels: ['Predicted PUE'],
                                            datasets: [
                                                {
                                                    label: 'PUE',
                                                    data: [result],
                                                    backgroundColor:
                                                        result < 1.5
                                                            ? '#2ecc71'
                                                            : result < 2
                                                                ? '#f39c12'
                                                                : '#e74c3c',
                                                    borderRadius: 4,
                                                    barThickness: 30,
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
                                                    text: 'Predicted PUE Value',
                                                    font: { size: 16 },
                                                },
                                            },
                                            scales: {
                                                x: {
                                                    beginAtZero: true,
                                                    max: 3,
                                                    ticks: { stepSize: 0.5 },
                                                },
                                            },
                                        }}
                                        height={120}
                                    />
                                </CCardBody>
                            </CCard>
                        </motion.div>
                    </>
                )}
            </Row>
        </Container>
    )
}

export default PredictorApp

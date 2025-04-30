import React, { useEffect, useState } from 'react'
import {
    CCard, CCardBody, CCardHeader,
    CCol, CRow, CAlert,
    CWidgetStatsF
} from '@coreui/react'
import { cilChart, cilSettings, cilLightbulb, cilGraph, cilMagnifyingGlass, cilCursor } from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import { CWidgetStatsC } from '@coreui/react'
import { cilLibrary, cilCheckCircle, cilChatBubble } from '@coreui/icons'
import axios from 'axios'

import ChartDataLabels from 'chartjs-plugin-datalabels'
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels)


import { useModel } from '../../context/ModelContext'

import { Bar, Line } from 'react-chartjs-2'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend)

const Dashboard = () => {
    const model = useModel()
    const [summary, setSummary] = useState(null)

    const [stats, setStats] = useState(null)

    useEffect(() => {
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/pue/stats/dashboard`)
            .then(res => setStats(res.data))
            .catch(() => setStats(null))
    }, [])

    useEffect(() => {
        if (model) {
            fetch(import.meta.env.VITE_API_BASE_URL + '/pue/exp/summary/' + model)
                .then(res => res.json())
                .then(data => setSummary(data))
                .catch(() => setSummary(null))
        }
    }, [model])

    return (
        <div>
            <h2 className="mb-4">Welcome to PULSE – PUE Unified Learning & Simulation Engine</h2>
            <CAlert color="info">
                PULSE is a platform for building, evaluating and interacting with energy efficiency models in data centers.
            </CAlert>

            <CRow className="mb-4">
                <CCol sm={6}>
                    {stats?.accuracy_by_model?.length > 0 && (
                        <CCard className="mb-4">
                            <CCardHeader>Model Accuracy (R² per model)</CCardHeader>
                            <CCardBody>
                                <Bar
                                    data={{
                                        labels: stats.accuracy_by_model.map(m => m.model),
                                        datasets: [{
                                            label: 'R²',
                                            data: stats.accuracy_by_model.map(m => m.r2),
                                            backgroundColor: '#4e73df',
                                        }]
                                    }}
                                    options={{
                                        responsive: true,
                                        plugins: {
                                            legend: { display: false },
                                            title: {
                                                display: true,
                                                text: 'Model R² Scores'
                                            },
                                            datalabels: {
                                                anchor: 'middle',
                                                align: 'right',
                                                color: '#fff',
                                                formatter: value => value.toFixed(2)
                                            }
                                        },
                                        scales: {
                                            y: {
                                                beginAtZero: true,
                                                max: 1
                                            }
                                        }
                                    }}
                                />

                            </CCardBody>
                        </CCard>
                    )}
                </CCol>
                <CCol sm={6}>
                    {stats?.predictions_by_month && (
                        <CCard className="mb-4">
                            <CCardHeader>Predictions per Month</CCardHeader>
                            <CCardBody>
                                <Line
                                    data={{
                                        labels: Object.keys(stats.predictions_by_month),
                                        datasets: [{
                                            label: 'Predictions',
                                            data: Object.values(stats.predictions_by_month),
                                            borderColor: '#4e73df',
                                            tension: 0.3,
                                        }]
                                    }}
                                    options={{
                                        responsive: true,
                                        plugins: {
                                            legend: { display: true },
                                            title: { display: true, text: 'Monthly Predictions' }
                                        },
                                        scales: { y: { beginAtZero: true } }
                                    }}
                                />
                            </CCardBody>
                        </CCard>
                    )}
                </CCol>
            </CRow>


            <CRow className="mb-4">
                <CCol sm={3}>
                    <CWidgetStatsC
                        className="mb-3"
                        icon={<CIcon icon={cilLibrary} height={36} />}
                        value={stats?.models_count ?? '—'}
                        title="Models Created"
                        color="primary"
                        progress={{ color: 'white', value: 75 }}
                        inverse
                    />
                </CCol>
                <CCol sm={3}>

                    <CWidgetStatsC
                        className="mb-3"
                        icon={<CIcon icon={cilCheckCircle} height={36} />}
                        value={stats ? `${(stats.avg_accuracy * 100).toFixed(1)}%` : '—'}
                        title="Avg. Accuracy (R²)"
                        color="success"
                        progress={{ color: 'white', value: 80 }}
                        inverse
                    />
                </CCol>
                <CCol sm={3}>
                    <CWidgetStatsC
                        className="mb-3"
                        icon={<CIcon icon={cilChart} height={36} />}
                        value={stats?.total_predictions ?? '—'}
                        title="Predictions Made"
                        color="info"
                        inverse
                    />
                </CCol>
                <CCol sm={3}>
                    <CWidgetStatsC
                        className="mb-3"
                        icon={<CIcon icon={cilChatBubble} height={36} />}
                        value={stats?.llm_questions ?? '—'}
                        title="LLM Questions"
                        color="warning"
                        inverse
                    />
                </CCol>
            </CRow>

            {/* Navigation Cards */}
            <CRow className="mb-4">
                <CCol md={4}>
                    <CWidgetStatsF
                        icon={<CIcon icon={cilSettings} height={24} />}
                        title="PUE Model generator"
                        value="Train your own PUE prediction model"
                        footer={<a href="#/puemodels/generator">Go to generator</a>}
                    />
                </CCol>
                <CCol md={4}>
                    <CWidgetStatsF
                        icon={<CIcon icon={cilMagnifyingGlass} height={24} />}
                        title="Model explorer"
                        value="Manage and inspect trained models"
                        footer={<a href="#/puemodels/explorer">View models</a>}
                    />
                </CCol>
                <CCol md={4}>
                    <CWidgetStatsF
                        icon={<CIcon icon={cilGraph} height={24} />}
                        title="PUE Monitoring"
                        value="Integrate with real-time data (coming soon)"
                        footer={<a href="#">Open monitoring</a>}
                    />
                </CCol>
            </CRow>

            <CRow className="mb-4">
                <CCol md={4}>
                    <CWidgetStatsF
                        icon={<CIcon icon={cilCursor} height={24} />}
                        title="Predictor"
                        value="Predict PUE from your input variables"
                        footer={<a href="#/PUEApps/predictor">Try it</a>}
                    />
                </CCol>
                <CCol md={4}>
                    <CWidgetStatsF
                        icon={<CIcon icon={cilLightbulb} height={24} />}
                        title="LLM Assistant"
                        value="Ask anything about energy efficiency"
                        footer={<a href="#/PUEApps/llm">Open assistant</a>}
                    />
                </CCol>
                <CCol md={4}>
                    <CWidgetStatsF
                        icon={<CIcon icon={cilSettings} height={24} />}
                        title="Settings"
                        value="Configure app and model preferences"
                        footer={<a href="#/settings">Go to settings</a>}
                    />
                </CCol>
            </CRow>

            {/* Model Summary */}
            {model && summary && (
                <>
                    <CCard className="mb-4">
                        <CCardHeader>Active Model Summary – <strong>{model}</strong></CCardHeader>
                        <CCardBody>
                            <CRow className="mb-3">
                                <CCol md={4}><strong>Epochs:</strong> {summary.epochs}</CCol>
                                <CCol md={4}><strong>Test Size (%):</strong> {summary.test_size}</CCol>
                                <CCol md={4}><strong>Features:</strong> {Array.isArray(summary.features) ? summary.features.join(', ') : 'N/A'}</CCol>
                            </CRow>
                            <CRow>
                                <CCol md={4}><strong>Loss:</strong> {summary.metrics?.loss?.toFixed(4) ?? 'N/A'}</CCol>
                                <CCol md={4}><strong>MAE:</strong> {summary.metrics?.mae?.toFixed(4) ?? 'N/A'}</CCol>
                                <CCol md={4}><strong>R² (%):</strong> {summary.metrics?.r2 ? (summary.metrics.r2 * 100).toFixed(2) + '%' : 'N/A'}</CCol>

                            </CRow>
                        </CCardBody>
                    </CCard>

                    {/* Feature Importance Bar Chart */}
                    {summary.feature_importance && (
                        <CCard className="mb-4">
                            <CCardHeader>Feature Importance (Top 5)</CCardHeader>
                            <CCardBody>
                                <Bar
                                    data={{
                                        labels: summary.feature_importance.map(f => f.name),
                                        datasets: [{
                                            label: 'Correlation with PUE',
                                            data: summary.feature_importance.map(f => f.value),
                                            backgroundColor: '#4e73df',
                                        }]
                                    }}
                                    options={{
                                        responsive: true,
                                        plugins: {
                                            legend: { display: false },
                                            title: { display: true, text: 'Feature Correlation (%)' }
                                        },
                                        scales: {
                                            y: {
                                                beginAtZero: true,
                                                max: 1
                                            }
                                        }
                                    }}
                                />
                            </CCardBody>
                        </CCard>
                    )}
                </>
            )}
        </div>
    )
}

export default Dashboard

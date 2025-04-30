import React, { useEffect, useState } from 'react'
import {
    CCard, CCardBody, CCardHeader, CFormSelect, CSpinner,
    CButton, CAlert, CBadge, CListGroup, CListGroupItem,
    CNav, CNavItem, CNavLink, CTabContent, CTabPane, CTabs, CTabList, CTab, CTabPanel
} from '@coreui/react'
import {
    cilDescription, cilMemory, cilGraph, cilTrash
} from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import axios from 'axios'
import { Container, Row } from 'react-bootstrap'
import DataTable from 'react-data-table-component'

const ExplorerApp = () => {
    const [models, setModels] = useState([])
    const [selected, setSelected] = useState('')
    const [summary, setSummary] = useState(null)
    const [deleted, setDeleted] = useState(false)
    const [error, setError] = useState('')
    const [summaries, setSummaries] = useState([])
    const [defaultModel, setDefaultModel] = useState('')

    const [datasetSample, setDatasetSample] = useState([])
    const [datasetSummary, setDatasetSummary] = useState(null)
    const [datasetHistogram, setDatasetHistogram] = useState(null)
    const [columns, setColumns] = useState([])
    const [activeTab, setActiveTab] = useState('summary')

    const API_BASE = import.meta.env.VITE_API_BASE_URL

    useEffect(() => {
        axios.get(`${API_BASE}/pue/set/default_model`)
            .then(res => setDefaultModel(res.data.default_model || ''))
            .catch(() => setDefaultModel(''))
    }, [])

    useEffect(() => {
        async function fetchSummaries() {
            const all = []
            for (const name of models) {
                try {
                    const res = await axios.get(`${API_BASE}/pue/exp/summary/${name}`)
                    all.push({ name, ...res.data })
                } catch (err) {
                    all.push({ name, error: true })
                }
            }
            setSummaries(all)
        }
        if (models.length > 0) fetchSummaries()
    }, [models])

    useEffect(() => {
        axios.get(`${API_BASE}/pue/exp/models`).then(res => {
            setModels(res.data.models || [])
        })
    }, [deleted])

    useEffect(() => {
        if (selected) {
            axios.get(`${API_BASE}/pue/exp/summary/${selected}`)
                .then(async (res) => {
                    setSummary(res.data)
                    try {
                        const datasetFileName = res.data.dataset_name || `${res.data.model_name}.csv`;

                        const datasetResponse = await axios.get(`${API_BASE}/pue/datasets/load/${datasetFileName}`);
                        setDatasetSample(datasetResponse.data.sample);
                        setDatasetSummary(datasetResponse.data.summary);
                        setColumns(datasetResponse.data.columns.map(col => ({
                            name: col,
                            selector: row => row[col],
                            sortable: true,
                        })));

                        const plotResponse = await axios.get(`${API_BASE}/pue/datasets/plots/${datasetFileName}`);
                        setDatasetHistogram(plotResponse.data.histogram);
                    } catch (err) {
                        console.error('Error loading dataset or plot:', err)
                    }

                })
                .catch(() => setSummary(null))
        }
    }, [selected])

    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete model "${selected}"?`)) {
            axios.delete(`${API_BASE}/pue/exp/delete/${selected}`)
                .then(() => {
                    setDeleted(true)
                    setSelected('')
                    setSummary(null)
                })
                .catch(() => {
                    setError('Failed to delete model')
                })
        }
    }

    return (
        <Container className="mb-4">
            <Row>
                <CAlert color="info">
                    <p>This section allows you to:</p>
                    <CListGroup flush className="mb-3">
                        <CListGroupItem color="white">
                            🔍 Select and view detailed summaries of your trained models
                        </CListGroupItem>
                        <CListGroupItem color="white">
                            🧾 Inspect <strong>features</strong>, <strong>training configuration</strong>, and performance metrics like <strong>loss</strong>, <strong>MAE</strong>, and <strong>R²</strong>
                        </CListGroupItem>
                        <CListGroupItem color="white">
                            📥 Download trained models including the scaler and dataset in a ZIP file
                        </CListGroupItem>
                        <CListGroupItem color="white">
                            🗑️ Delete models <em>(except for the currently active one)</em>
                        </CListGroupItem>
                    </CListGroup>

                    <p className="mb-0">
                        The active model is marked with a <CBadge color="success">Active</CBadge> badge and cannot be deleted.
                    </p>
                </CAlert>

                <CFormSelect className="mb-3" value={selected} onChange={e => {
                    const value = e.target.value
                    setSelected(e.target.value)
                    setDeleted(false)
                    if (!value) {
                        setSummary(null)
                    }
                }}>
                    <option value="">Select a model</option>
                    {models.map((name, idx) => (
                        <option key={idx} value={name}>{name}</option>
                    ))}
                </CFormSelect>

                {summary && (
                    <>
                        <CCard>
                            <CTabs activeItemKey="model_summary">
                                <CTabList variant="tabs">
                                    <CTab itemKey="model_summary">Model summary</CTab>
                                    <CTab itemKey="dataset_viewer">Dataset viewer</CTab>
                                </CTabList>
                                <CTabContent>
                                    <CTabPanel className="p-3" itemKey="model_summary">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <h5><CIcon icon={cilDescription} className="me-2" />Model Summary</h5>
                                            <div className="d-flex gap-2">
                                                <CButton color="danger" size="sm" onClick={handleDelete} disabled={selected === defaultModel}>
                                                    <CIcon icon={cilTrash} className="me-1" />Delete
                                                </CButton>
                                                <CButton color="info" size="sm" onClick={() => {
                                                    const link = document.createElement('a')
                                                    link.href = `${API_BASE}/pue/exp/download/${selected}.zip`
                                                    link.download = `${selected}.zip`
                                                    document.body.appendChild(link)
                                                    link.click()
                                                    document.body.removeChild(link)
                                                }}>
                                                    <CIcon icon={cilDescription} className="me-1" />Download
                                                </CButton>
                                            </div>
                                        </div>
                                        <p><strong><CIcon icon={cilMemory} className="me-2" />Model:</strong> {summary.model_name} {summary.model_name === defaultModel && (<span className="ms-2 badge bg-success">Active</span>)}</p>
                                        <p><strong><CIcon icon={cilGraph} className="me-2" />Features:</strong> {summary.features.join(', ')}</p>
                                        <p><strong>Epochs:</strong> {summary.epochs}</p>
                                        <p><strong>Test size:</strong> {summary.test_size}%</p>
                                        <p><strong>Loss:</strong> {summary.metrics.loss}</p>
                                        <p><strong>MAE:</strong> {summary.metrics.mae}</p>
                                        <p><strong>R²:</strong> {summary.metrics.r2.toFixed(4)} ({(summary.metrics.r2 * 100).toFixed(2)}%)</p>
                                    </CTabPanel>
                                    <CTabPanel className="p-3" itemKey="dataset_viewer">
                                        <h5><CIcon icon={cilDescription} className="me-2" />Dataset viewer</h5>
                                        <DataTable
                                            columns={columns}
                                            data={datasetSample}
                                            pagination
                                            striped
                                            highlightOnHover
                                            dense
                                        />
                                        <h5 className="mt-4">Dataset statistics</h5>
                                        <pre>{JSON.stringify(datasetSummary, null, 2)}</pre>
                                        {datasetHistogram && (
                                            <div className="text-center mt-4">
                                                <h5>Histogram</h5>
                                                <img
                                                    src={`data:image/png;base64,${datasetHistogram}`}
                                                    alt="Histogram"
                                                    style={{ maxWidth: '100%', borderRadius: '8px' }}
                                                />
                                            </div>
                                        )}
                                    </CTabPanel>
                                </CTabContent>
                            </CTabs>
                        </CCard>
                    </>
                )}

                {selected && !summary && <CSpinner />}
                {error && <CAlert color="danger">{error}</CAlert>}

                {summaries.length > 0 && (
                    <div className="mt-4">
                        <h5>All models summary</h5>
                        <div className="table-responsive">
                            <table className="table table-striped table-bordered">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Epochs</th>
                                        <th>Test size (%)</th>
                                        <th>Loss</th>
                                        <th>MAE</th>
                                        <th>R² (%)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaries.map((s, idx) => (
                                        <tr key={idx}>
                                            <td>{s.name} {s.name === defaultModel && (<span className="ms-2 badge bg-success">Active</span>)}</td>
                                            <td>{s.epochs ?? '-'}</td>
                                            <td>{s.test_size ?? '-'}</td>
                                            <td>{s.metrics?.loss.toFixed(4) ?? '-'}</td>
                                            <td>{s.metrics?.mae.toFixed(4) ?? '-'}</td>
                                            <td>{s.metrics?.r2 !== undefined ? `${(s.metrics.r2 * 100).toFixed(2)}` : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Row>
        </Container>
    )
}

export default ExplorerApp
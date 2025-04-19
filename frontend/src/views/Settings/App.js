import React, { useEffect, useState } from 'react'
import {
    CCard, CRow, CCol, CFormSelect, CFormLabel, CButton, CBadge
} from '@coreui/react'
import axios from 'axios'
import { Container, Row } from 'react-bootstrap'


const Settings = () => {
    const [models, setModels] = useState([])
    const [selected, setSelected] = useState('')
    const [connection, setConnection] = useState(false)
    const [version] = useState('0.0.1a')
    const API_BASE = import.meta.env.VITE_API_BASE_URL

    useEffect(() => {
        axios.get(`${API_BASE}/pue/exp/models`)
            .then(async res => {
                const modelList = res.data.models || []
                setModels(modelList)
                setConnection(true)

                const defaultModelRes = await axios.get(`${API_BASE}/pue/set/default_model`)
                setSelected(defaultModelRes.data.default_model || '')
            })
            .catch(() => setConnection(false))
    }, [])

    const handleSetActive = () => {
        const formData = new FormData()
        formData.append('model_name', selected)
        axios.post(`${API_BASE}/pue/set/default_model`, formData)
            .then(() => {
                alert(`Model "${selected}" set as default`)
                window.location.reload()
            })
            .catch(() => {
                alert('Failed to set default model')
            })
    }

    const handleDeleteAll = () => {
        if (window.confirm('Are you sure you want to delete ALL models and their CSV files?')) {
            axios.delete(`${API_BASE}/pue/set/delete_all`)
                .then(() => {
                    alert('All models deleted successfully')
                    window.location.reload()
                })
                .catch(() => alert('Failed to delete models'))
        }
    }


    const handleDownloadAll = () => {
        const link = document.createElement('a')
        link.href = `${API_BASE}/pue/set/download_all`
        link.download = 'all_models.zip'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }


    return (

        <Container className="mb-4">
            <Row>
                <CCard className="mb-4 border-info">
                    <p>Set de default settings for the PUSLE platform. Also, you can check the connection with the server, download and delete all models.</p>
                </CCard>
                <CRow className="mb-4">
                    <CCol sm={6}>
                        <CFormLabel>Select default model</CFormLabel>
                        {models.length === 0 && (
                            <p className="text-danger">
                                No models available. Please go to <a href="/generator">PUE Models → PUE Models Generator</a> to create one.
                            </p>
                        )}

                        <CFormSelect value={selected} onChange={e => setSelected(e.target.value)} disabled={models.length === 0}>
                            <option value="">Select a model</option>
                            {models.map((m, i) => (
                                <option key={i} value={m}>{m}</option>
                            ))}
                        </CFormSelect>
                        <CButton color="primary" className="mt-2" onClick={handleSetActive} disabled={!selected}>Set as default</CButton>
                    </CCol>
                    <CCol sm={6}>
                        <CFormLabel>Server connection</CFormLabel>
                        <div>
                            {connection ? (
                                <CBadge color="success">Connected</CBadge>
                            ) : (
                                <>
                                    <CBadge color="danger">Disconnected</CBadge>
                                    <div className="mt-2">
                                        <CFormLabel>How to start the backend:</CFormLabel>
                                        <pre className="bg-light border rounded p-2 text-dark font-monospace">
                                            cd backend
                                            uvicorn main:app --reload
                                        </pre>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="mt-3">
                            <CFormLabel>Application version</CFormLabel>
                            <div>
                                <CBadge color="secondary">PULSE v{version}</CBadge>
                            </div>
                        </div>
                    </CCol>
                </CRow>

                <hr />

                <CRow className="mb-3">
                    <CCol>
                        <CButton color="danger" onClick={handleDeleteAll}>Delete all models</CButton>
                        <CButton color="primary" className="ms-3" onClick={handleDownloadAll}>Download all models</CButton>
                    </CCol>
                </CRow>

                <hr />
                <h6 className="text-muted">Advanced Settings (coming soon)</h6>
                <ul>
                    <li>Change languageqq</li>
                    <li>Theme preferences</li>
                    <li>Debug mode toggle</li>
                    <li>Custom backend endpoint</li>
                </ul>

            </Row>
        </Container>
    )

}

export default Settings

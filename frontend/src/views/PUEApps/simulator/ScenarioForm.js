import React, { useEffect, useState } from 'react'
import { CForm, CFormInput, CButton, CRow, CCol } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMediaPlay, cilReload, cilInput } from '@coreui/icons'


const ScenarioForm = ({ features, onSimulate, onReset, onFill, restoredInputs }) => {
  const [formData, setFormData] = useState(() => {
    const initial = {}
    features.forEach(f => initial[f] = 0)
    return initial
  })

  useEffect(() => {
    if (restoredInputs) {
      setFormData(restoredInputs)
    }
  }, [restoredInputs])

  const handleChange = (e, feature) => {
    setFormData({ ...formData, [feature]: parseFloat(e.target.value) || 0 })
  }

  const handleSimulate = (e) => {
    e.preventDefault()
    onSimulate(formData)
  }

  const handleReset = () => {
    const resetData = {}
    features.forEach(f => resetData[f] = 0)
    setFormData(resetData)
    onReset()
  }

  const handleFillScenario = () => {
    if (onFill) {
      const filledData = onFill()
      if (filledData) {
        const newFormData = {}
        features.forEach(f => {
          if (f in filledData) {
            let value = filledData[f]
            if (typeof value === 'string') {
              value = value.replace(',', '.')
            }
            newFormData[f] = parseFloat(value) || 0
          } else {
            newFormData[f] = 0
          }
        })
        setFormData(newFormData)
      }
    }
  }

  return (
    <CForm onSubmit={handleSimulate} className="mb-4">
      <CRow className="g-3">
        {features.map((feature, idx) => (
          <CCol xs={12} md={3} key={idx}>
            <CFormInput
              type="number"
              label={feature}
              value={formData[feature]}
              onChange={(e) => handleChange(e, feature)}
            />
          </CCol>
        ))}
      </CRow>
      <div className="d-flex gap-2 mt-3">
        <div className="d-flex gap-2 mt-3">
          <CButton type="submit" color="primary">
            <CIcon icon={cilMediaPlay} className="me-2" /> Simulate scenario
          </CButton>
          <CButton type="button" color="secondary" onClick={handleReset}>
            <CIcon icon={cilReload} className="me-2" /> Reset values
          </CButton>
          <CButton type="button" color="info" onClick={handleFillScenario}>
            <CIcon icon={cilInput} className="me-2" /> Fill example scenario
          </CButton>
        </div>

      </div>
    </CForm>
  )
}

export default ScenarioForm

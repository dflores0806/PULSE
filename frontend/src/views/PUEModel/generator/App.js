import React, { useState } from 'react'
import UploadCSV from './UploadCSV'
import FeatureSelector from './FeatureSelector'
import ModelTrainer from './ModelTrainer'
import PredictionForm from './PredictionForm'
import ModelSummary from './ModelSummary'
import ModelSetup from './ModelSetup'
import AccordionStep from './AccordionStep'
import { Accordion, Container, Row, Col } from 'react-bootstrap'
import { CCard, CCardBody, CAlert, CBadge, CRow, CCol } from '@coreui/react'


const GeneratorApp = () => {
  const [modelName, setModelName] = useState(null)
  const [columns, setColumns] = useState([])
  const [features, setFeatures] = useState([])
  const [modelReady, setModelReady] = useState(false)
  const [summary, setSummary] = useState(null)
  const [stepStatus, setStepStatus] = useState({
    upload: null,
    suggest: null,
    train: null,
    predict: null,
    finish: null,
  })
  const [openKeys, setOpenKeys] = useState(['0'])

  const updateStatus = (step, result) => {
    setStepStatus(prev => ({ ...prev, [step]: result }))
  }

  return (
    <Container className="mb-4">
      <Row>
        <CCard className="mb-4 border-info">
          <p>
            This module allows you to upload a dataset in CSV format, select relevant input features,
            and train a deep learning model for PUE prediction. The trained model can then be used in other sections of the platform.
          </p>
          <CCardBody>
            <CRow>
              <CCol md={6}>
                <CAlert color="warning">
                  <strong>CSV Requirements:</strong>
                  <ul className="mb-0">
                    <li>The file must be <CBadge color="secondary">semicolon-separated (;)</CBadge></li>
                    <li>It must contain a column named <CBadge color="primary">pue</CBadge> (target variable)</li>
                    <li>All other input columns must be numerical</li>
                  </ul>
                </CAlert>
              </CCol>

              <CCol md={6}>
                <div className="h-100 d-flex flex-column justify-content-center">
                  <strong>📋 Example CSV structure:</strong>
                  <pre className="bg-dark p-2 rounded mb-0">
                    timestamp;temperature;humidity;load;airflow;pue<br />
                    2023-01-01 00:00:00;24.5;40;70;1200;1.45<br />
                    2023-01-01 01:00:00;25.0;42;65;1180;1.42<br />
                  </pre>
                </div>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        <Col md={10} className="mx-auto">
          {!modelName && <ModelSetup onModelNamed={setModelName} />}
          {modelName && (
            <Accordion activeKey={openKeys} onSelect={key => setOpenKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])}>
              <AccordionStep eventKey="0" title="1. Upload CSV" status={stepStatus.upload}>
                <UploadCSV
                  modelName={modelName}
                  onUploadSuccess={(cols) => {
                    setColumns(cols)
                    updateStatus('upload', 'success')
                    setOpenKeys(['1'])
                  }}
                />
              </AccordionStep>

              <AccordionStep eventKey="1" title="2. Select Features" status={stepStatus.suggest}>
                {columns.length > 0 && (
                  <FeatureSelector
                    modelName={modelName}
                    onFeatureSelect={(f) => {
                      setFeatures(f)
                      updateStatus('suggest', 'success')
                      setOpenKeys(['2'])
                    }}
                  />
                )}
              </AccordionStep>

              <AccordionStep eventKey="2" title="3. Train Model" status={stepStatus.train}>
                {features.length > 0 && (
                  <ModelTrainer
                    modelName={modelName}
                    features={features}
                    onTrainingComplete={(success, metrics, epochs, testSize) => {
                      if (success) {
                        setModelReady(true)
                        setSummary({ modelName, features, metrics, epochs, testSize })
                        updateStatus('train', 'success')
                        setOpenKeys(['3'])
                      } else {
                        updateStatus('train', 'error')
                      }
                    }}
                  />
                )}
              </AccordionStep>

              <AccordionStep eventKey="3" title="4. Predict PUE" status={stepStatus.predict}>
                {modelReady && (
                  <PredictionForm
                    features={features}
                    modelName={modelName}
                    onPredictionSuccess={() => {
                      updateStatus('predict', 'success')
                      updateStatus('finish', 'success')
                      setOpenKeys(prev => [...new Set([...prev, '4'])])
                    }}
                    onPredictionError={() => {
                      updateStatus('predict', 'error')
                      updateStatus('finish', 'error')
                      setOpenKeys(prev => [...new Set([...prev, '4'])])
                    }}
                  />
                )}
              </AccordionStep>

              <AccordionStep eventKey="4" title="5. Finish" status={stepStatus.finish}>
                {summary ? (
                  <>
                    <div className="alert alert-success">✅ Model training and prediction completed successfully.</div>
                    <ModelSummary {...summary} />
                  </>
                ) : (
                  <div className="alert alert-danger">❌ Something went wrong during model training or prediction.</div>
                )}
              </AccordionStep>
            </Accordion>
          )}
        </Col>
      </Row>
    </Container>
  )
}

export default GeneratorApp

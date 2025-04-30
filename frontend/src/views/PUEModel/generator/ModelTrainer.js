
import React, { useState } from 'react';
import axios from 'axios';
import { Card, Button, Alert, Spinner, Form } from 'react-bootstrap';
import { cilBolt } from '@coreui/icons'
import CIcon from '@coreui/icons-react'


function ModelTrainer({ features, onTrainingComplete, modelName }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [epochs, setEpochs] = useState(50);
  const [testSize, setTestSize] = useState(20);
  const [resultLog, setResultLog] = useState('');
  const API_BASE = import.meta.env.VITE_API_BASE_URL

  const handleTrain = async () => {
    if (!features || features.length === 0 || !modelName) {
      setError('No features selected or model name missing.');
      return;
    }

    setLoading(true);
    setStatus('');
    setError('');
    setResultLog('');

    try {
      const formData = new FormData();
      formData.append('model_name', modelName);
      formData.append('features', JSON.stringify(features));
      formData.append('epochs', epochs.toString());
      formData.append('test_size', testSize.toString());

      const res = await axios.post(`${API_BASE}/pue/gen/train_model`, formData);
      const { loss, mae, r2 } = res.data;
      const log = `Training complete.\nLoss: ${loss.toFixed(4)}\nMAE: ${mae.toFixed(4)}\nR²: ${r2.toFixed(4)}`;
      setResultLog(log);
      setStatus(res.data.message || 'Model trained successfully.');
      onTrainingComplete(true, { loss, mae, r2 }, epochs, testSize);
    } catch (err) {
      console.error(err);
      setError('Error during model training.');
      onTrainingComplete(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-4">
      <Card.Body>
        <Card.Title>3. Train the prediction model</Card.Title>

        <Form.Group className="mb-3">
          <Form.Label>Epochs: {epochs}</Form.Label>
          <Form.Range min={50} max={500} value={epochs} onChange={e => setEpochs(Number(e.target.value))} />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Test size (%): {testSize}</Form.Label>
          <Form.Range min={0} max={100} value={testSize} onChange={e => setTestSize(Number(e.target.value))} />
        </Form.Group>

        <Button onClick={handleTrain} disabled={loading}>
          {loading ? (
            <>
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
              {' '}Training...
            </>
          ) : (
            <>
              <CIcon icon={cilBolt} className="me-2" /> Train model
            </>
          )}
        </Button>

        {status && <Alert variant="success" className="mt-3">{status}</Alert>}
        {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

        {resultLog && (
          <Form.Group className="mt-3">
            <Form.Label>Training Output</Form.Label>
            <Form.Control as="textarea" value={resultLog} readOnly rows={6} style={{ whiteSpace: 'pre-wrap' }} />
          </Form.Group>
        )}
      </Card.Body>
    </Card>
  );
}

export default ModelTrainer;

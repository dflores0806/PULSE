
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

      setStatus('Training started...');
      setLoading(true);

      const res = await axios.post(`${API_BASE}/pulse/generator/train_model`, formData);
      const { task_id } = res.data;

      const socket = new WebSocket(`${API_BASE.replace(/^http/, 'ws')}/ws/train/${task_id}`);

      socket.onmessage = (event) => {
        socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          setStatus(`Epoch ${data.epoch} / ${data.total_epochs} — Loss: ${data.loss.toFixed(4)} | MAE: ${data.mae.toFixed(4)} | MSE: ${data.mse.toFixed(4)}`);
        };

      };

      const checkStatus = async () => {
        const statusRes = await axios.get(`${API_BASE}/pue/gen/status/${task_id}`);
        const status = statusRes.data.status;

        if (status === 'completed') {
          const summaryRes = await axios.get(`${API_BASE}/pulse/explorer/summary/${modelName}`);
          const metrics = summaryRes.data.metrics;
          const log = `Training complete.\nLoss: ${metrics.loss.toFixed(4)}\nMAE: ${metrics.mae.toFixed(4)}\nR²: ${metrics.r2.toFixed(4)}`;
          setResultLog(log);
          setStatus('Model trained successfully.');
          onTrainingComplete(true, metrics, epochs, testSize);
          setLoading(false);
        } else if (status.startsWith('error')) {
          setError(`Training failed: ${status}`);
          onTrainingComplete(false);
          setLoading(false);
        } else {
          setTimeout(checkStatus, 2000); // 2 segundos
        }
      };

      checkStatus();

    } catch (err) {
      console.error(err);
      setError('Error starting training task.');
      onTrainingComplete(false);
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

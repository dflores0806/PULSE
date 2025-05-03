
import React, { useState } from 'react';
import axios from 'axios';
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';

function PredictorForm({ features }) {
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState('');
  const API_BASE = import.meta.env.VITE_API_BASE_URL

  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: parseFloat(e.target.value) });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setPrediction(null);

    try {
      const res = await axios.post(`${API_BASE}/pulse/generator/predict`, {
        values
      });
      setPrediction(res.data.pue_prediction);
    } catch (err) {
      console.error(err);
      setError('Prediction failed. Make sure all inputs are valid numbers.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-4">
      <Card.Body>
        <Card.Title>4. Predict PUE with your inputs</Card.Title>
        <Form>
          {features.map((feat, idx) => (
            <Form.Group key={idx} className="mb-2">
              <Form.Label>{feat}</Form.Label>
              <Form.Control
                type="number"
                step="any"
                name={feat}
                onChange={handleChange}
              />
            </Form.Group>
          ))}
        </Form>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <Spinner animation="border" size="sm" /> Predicting...
            </>
          ) : (
            'Predict'
          )}
        </Button>
        {prediction !== null && (
          <Alert variant="success" className="mt-3">
            Predicted PUE: <strong>{prediction}</strong>
          </Alert>
        )}
        {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
      </Card.Body>
    </Card>
  );
}

export default PredictorForm;

import React from 'react';
import { Card, Button, ListGroup } from 'react-bootstrap';

function ModelSummary({ modelName, features, epochs, testSize, metrics }) {
  const API_BASE = import.meta.env.VITE_API_BASE_URL
  const handleExport = () => {
    const summary = {
      model_name: modelName,
      features,
      epochs,
      test_size: testSize,
      metrics
    };
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${modelName}_summary.json`;
    a.click();
  };

  return (
    <Card className="mb-4">
      <Card.Body>
        <Card.Title>📊 Model Training Summary</Card.Title>
        <ListGroup variant="flush">
          <ListGroup.Item><strong>Model name:</strong> {modelName}</ListGroup.Item>
          <ListGroup.Item><strong>Features:</strong> {features.join(', ')}</ListGroup.Item>
          <ListGroup.Item><strong>Epochs:</strong> {epochs}</ListGroup.Item>
          <ListGroup.Item><strong>Test size:</strong> {testSize}%</ListGroup.Item>
          <ListGroup.Item><strong>Loss:</strong> {metrics.loss.toFixed(4)}</ListGroup.Item>
          <ListGroup.Item><strong>MAE:</strong> {metrics.mae.toFixed(4)}</ListGroup.Item>
          <ListGroup.Item><strong>R²:</strong> {metrics.r2.toFixed(4)} ({(metrics.r2 * 100).toFixed(2)}%)</ListGroup.Item>
        </ListGroup>
        <Button className="mt-3" onClick={handleExport}>Export Summary</Button>

        <Button className="mt-3" variant="outline-primary" onClick={() => {
          const download = (filename) => {
            const link = document.createElement('a');
            link.href = `${API_BASE}/pue/gen/download/${filename}`;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          };
          download(`${modelName}.zip`);
        }}>Download Model Files</Button>
      </Card.Body>
    </Card>
  );
}

export default ModelSummary;

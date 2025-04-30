
import React, { useState } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { cilMediaPlay } from '@coreui/icons'
import CIcon from '@coreui/icons-react'


function ModelSetup({ onModelNamed }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleStart = () => {
    if (!name.trim()) {
      setError('Please enter a name for your model.');
      return;
    }
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 13);
    const fullName = `${name.trim()}-${timestamp}`;
    onModelNamed(fullName);
  };

  return (
    <Card className="mb-4">
      <Card.Body>
        <Card.Title>Name your model</Card.Title>
        <Form.Group>
          <Form.Label>Base name:</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter model name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Form.Group>
        <Button className="mt-3" onClick={handleStart}>
          <CIcon icon={cilMediaPlay} className="me-2" /> Start
        </Button>

        {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
      </Card.Body>
    </Card>
  );
}

export default ModelSetup;


import React, { useState } from 'react';
import axios from 'axios';
import { Form, Button, Alert, Card } from 'react-bootstrap';
import { cilCloudUpload } from '@coreui/icons'
import CIcon from '@coreui/icons-react'

function UploadCSV({ onUploadSuccess, modelName }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const API_BASE = import.meta.env.VITE_API_BASE_URL

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };


  const handleLoadSample = async () => {
    const formData = new FormData();
    formData.append('model_name', modelName);
    try {
      const res = await axios.post(`${API_BASE}/pulse/generator/load_sample`, formData);
      setStatus(res.data.message || '');
      setError('');
      onUploadSuccess(res.data.columns);
    } catch (err) {
      console.error(err);
      setStatus('');
      setError('Failed to load sample.');
    }
  };

  const handleUpload = async () => {
    if (!file || !modelName) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model_name', modelName);
    try {
      const response = await axios.post(`${API_BASE}/pulse/generator/upload_data`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setStatus('File uploaded successfully.');
      setError('');
      onUploadSuccess(response.data.columns);
    } catch (err) {
      console.error(err);
      setStatus('');
      setError('Failed to upload file.');
    }
  };

  return (
    <Card className="mb-4">
      <Card.Body>
        <Card.Title>1. Upload your CSV dataset</Card.Title>
        <Form.Group controlId="formFile">
          <Form.Control type="file" accept=".csv" onChange={handleFileChange} />
        </Form.Group>
        <div className="d-flex gap-2 mt-2">
          <Button onClick={handleUpload}> <CIcon icon={cilCloudUpload} className="me-2" /> Upload</Button>
          {/*<Button variant="outline-secondary" onClick={handleLoadSample}>Load sample</Button>*/}
        </div>
        {status && <Alert variant="success" className="mt-3">{status}</Alert>}
        {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
      </Card.Body>
    </Card>
  );
}

export default UploadCSV;

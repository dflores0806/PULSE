
import React from 'react';
import { Accordion } from 'react-bootstrap';
import { CheckCircleFill, XCircleFill } from 'react-bootstrap-icons';

function AccordionStep({ eventKey, title, status, children }) {
  const getIcon = () => {
    if (status === 'success') return <CheckCircleFill className="text-success me-2" />;
    if (status === 'error') return <XCircleFill className="text-danger me-2" />;
    return null;
  };

  return (
    <Accordion.Item eventKey={eventKey}>
      <Accordion.Header>
        <div className="d-flex align-items-center">
          {getIcon()}
          <span>{title}</span>
        </div>
      </Accordion.Header>
      <Accordion.Body>{children}</Accordion.Body>
    </Accordion.Item>
  );
}

export default AccordionStep;

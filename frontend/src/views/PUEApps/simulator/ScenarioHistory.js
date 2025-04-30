import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CPagination,
  CPaginationItem
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLoopCircular, cilTrash } from '@coreui/icons'

const ITEMS_PER_PAGE = 5

const ScenarioHistory = ({ history, onRestore, onDelete, onClearAll }) => {
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.ceil(history.length / ITEMS_PER_PAGE)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages || 1)
    }
  }, [history, currentPage, totalPages])

  const paginatedHistory = [...history].reverse().slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <CCard className="mt-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <span>Simulation history</span>
        {history.length > 0 && (
          <CButton size="sm" color="danger" onClick={onClearAll}>
            <CIcon icon={cilTrash} className="me-2" /> Clear All
          </CButton>
        )}
      </CCardHeader>
      <CCardBody>
        {history.length === 0 ? (
          <p>No simulations yet.</p>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-striped table-bordered">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Timestamp</th>
                    <th>Inputs Used</th>
                    <th>Predicted PUE</th>
                    <th style={{ width: '1%' }} className="text-center text-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHistory.map((h, idx) => (
                    <tr key={h.id ?? idx}>
                      <td>{h.id ?? idx + 1}</td>
                      <td>{h.timestamp ? new Date(h.timestamp).toLocaleString() : 'N/A'}</td>
                      <td>
                        {Object.entries(h.inputs).map(([key, value]) => (
                          <div key={key}><strong>{key}:</strong> {value}</div>
                        ))}
                      </td>
                      <td>{typeof h.pue === 'number' ? h.pue.toFixed(4) : 'N/A'}</td>
                      <td className="text-center text-nowrap">
                        <div className="d-flex justify-content-center gap-2">
                          <CButton size="sm" color="warning" onClick={() => onRestore(h.inputs)}>
                            <CIcon icon={cilLoopCircular} className="me-2" /> Re-simulate
                          </CButton>
                          {h.id !== undefined && (
                            <CButton size="sm" color="danger" onClick={() => onDelete(h.id)}>
                              <CIcon icon={cilTrash} className="me-2" /> Delete
                            </CButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="d-flex justify-content-center mt-3">
                <CPagination align="center">
                  {[...Array(totalPages)].map((_, i) => (
                    <CPaginationItem
                      key={i + 1}
                      active={currentPage === i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </CPaginationItem>
                  ))}
                </CPagination>
              </div>
            )}
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default ScenarioHistory

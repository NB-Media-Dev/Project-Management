import React, { useState } from 'react';

function RejectionModal({ title = 'Reject Deliverable', itemName, onConfirm, onCancel, isSubmitting = false }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please enter a clear explanation for why this item/stage is being rejected.');
      return;
    }
    setError('');
    onConfirm(reason.trim());
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        <div className="d-flex items-center gap-2 mb-2">
          <div className="profile-header-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div>
            <h2 className="modal-title text-danger mb-0" style={{ color: '#dc2626' }}>{title}</h2>
            {itemName && (
              <p className="text-xs text-muted mt-0 mb-0">
                Target Item: <strong>{itemName}</strong>
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-3">
          <div className="form-group mb-4">
            <label htmlFor="rejectionReason" className="ui-label font-bold text-main">
              Reason for Rejection (Required)
            </label>
            <textarea
              id="rejectionReason"
              rows={4}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="Explain what needs to be fixed or modified by the team before re-submitting..."
              className="ui-input w-full mt-1"
              style={{ fontSize: '0.9rem' }}
              required
            />
            {error && <p className="text-xs text-danger font-bold mt-1.5">{error}</p>}
          </div>

          <div className="modal-actions d-flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="btn-secondary" disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="create-btn"
              style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RejectionModal;

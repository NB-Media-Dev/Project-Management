import React from 'react';

function AdminModal({
  isOpen,
  onClose,
  title,
  error,
  children,
  maxWidthClass = 'modal-content-sm',
}) {
  if (!isOpen) return null;

  return (
    <dialog open className="modal-overlay" aria-modal="true">
      <button
        type="button"
        className="modal-backdrop-btn"
        onClick={onClose}
        aria-label="Close modal backdrop"
      />
      <div className={`modal-content ${maxWidthClass}`}>
        <h2 className="modal-title">{title}</h2>
        {error && (
          <div className="alert-banner danger mb-4" style={{ justifyContent: 'center', textAlign: 'center' }}>
            {error}
          </div>
        )}
        {children}
      </div>
    </dialog>
  );
}

export default AdminModal;

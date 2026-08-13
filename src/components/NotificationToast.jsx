import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { formatTime } from '../utils/fileUtils';

function ToastItem({ toast, onClose, onClickToast }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClickToast) {
      onClickToast(toast);
    }
    onClose(toast.id);
  };

  const handleCloseClick = (e) => {
    e.stopPropagation();
    onClose(toast.id);
  };

  return (
    <div
      className="human-toast-card"
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <div className="human-toast-header">
        <div className="human-toast-meta">
          <span className="human-toast-dot" />
          <span className="human-toast-title">Project Activity</span>
          <span className="human-toast-bullet">&bull;</span>
          <span className="human-toast-time">{formatTime(toast.createdAt)}</span>
        </div>
        <button
          type="button"
          className="human-toast-close"
          onClick={handleCloseClick}
          aria-label="Dismiss notification"
          title="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="human-toast-body">
        <p className="human-toast-message">{toast.message}</p>
      </div>

      <div className="human-toast-footer">
        <span className="human-toast-action">
          View details
          <svg className="human-toast-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </span>
      </div>
    </div>
  );
}

function NotificationToast({ toasts, onClose, onClickToast }) {
  if (!toasts || toasts.length === 0) return null;

  return ReactDOM.createPortal(
    <div className="human-toast-container">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={onClose}
          onClickToast={onClickToast}
        />
      ))}
    </div>,
    document.body
  );
}

export default NotificationToast;

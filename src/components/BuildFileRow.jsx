import React from 'react';
import { getFileTypeDetails, stripTimestampPrefix } from '../utils/fileUtils';

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

function BuildFileRow({ build, onView, onEdit, onDelete }) {
  const typeInfo = getFileTypeDetails(build.fileName);

  return (
    <div className="pdf-container build-file-card">
      <div className="build-file-header">
        <div className="build-file-info">
          <div className="pdf-icon-box" style={{ backgroundColor: typeInfo.color }}>
            <span className="pdf-label">{typeInfo.label}</span>
          </div>
          <div className="pdf-details build-file-details">
            <span className="pdf-name build-file-name">
              {build.name || 'Code Build File'}
            </span>
            <span className="pdf-size build-file-meta">
              {stripTimestampPrefix(build.fileName)} · {build.fileSize}
            </span>
            {build.uploadedBy && (
              <span className="build-file-uploader">
                Uploaded by: {build.uploadedBy}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="build-file-actions-row">
        <button type="button" className="view-btn" onClick={() => onView(build)} title="View / Download Work File">
          <EyeIcon />
        </button>
        {onEdit && (
          <button type="button" className="view-btn" onClick={() => onEdit(build)} title="Edit or Replace File">
            <EditIcon />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className="view-btn build-file-delete-btn"
            onClick={() => onDelete(build.id)}
            title="Delete File"
          >
            <TrashIcon />
          </button>
        )}
      </div>
    </div>
  );
}

export default BuildFileRow;

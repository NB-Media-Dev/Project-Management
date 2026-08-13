import React from 'react';
import { formatTimestamp, getFullUrl, getRoleBadgeStyle, getStatusBadgeClass } from '../utils/fileUtils';

function RoleHistoryTable({ items, loading, setViewedPdf, emptyMessage }) {
  if (loading) {
    return (
      <div className="p-6 text-center text-subtle font-bold">
        Loading role activity history...
      </div>
    );
  }

  if (!items || items.length === 0) {
    if (emptyMessage) {
      return emptyMessage;
    }
    return (
      <div className="p-6 text-center text-subtle font-bold">
        No role activity history found for the selected filters.
      </div>
    );
  }

  return (
    <table className="data-table w-full">
      <thead>
        <tr>
          <th>Role &amp; Action</th>
          <th>Task Title / Project</th>
          <th>Details &amp; Attachment</th>
          <th>Status</th>
          <th>Timestamp</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, idx) => {
          const roleStyle = getRoleBadgeStyle(item.role);
          const itemKey = item.id ? `hist-${item.id}` : `hist-${idx}`;
          return (
            <tr key={itemKey}>
              <td>
                <div className="d-flex flex-col gap-1">
                  <span
                    className="ui-badge ui-badge-sm"
                    style={{
                      backgroundColor: roleStyle.bg,
                      color: roleStyle.color,
                      borderColor: roleStyle.border,
                    }}
                  >
                    {item.role}
                  </span>
                  <span className="text-xs text-subtle font-semibold">
                    {item.actionType}
                  </span>
                </div>
              </td>
              <td>
                <div className="d-flex flex-col">
                  <strong className="text-main text-md">{item.title}</strong>
                  <span className="text-xs text-subtle font-semibold mt-1">
                    {item.projectName} · {item.packageName}
                  </span>
                </div>
              </td>
              <td>
                <div className="d-flex flex-col gap-1">
                  <span className="text-sm text-muted">{item.description}</span>
                  {item.fileName && (
                    <button
                      type="button"
                      className="ui-btn ui-btn-secondary ui-btn-sm mt-1"
                      onClick={() => setViewedPdf(item)}
                      title="View / Download file"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      View Attachment ({item.fileSize || 'File'})
                    </button>
                  )}
                  {item.demoUrl && (
                    <a
                      href={getFullUrl(item.demoUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-extrabold text-primary-color underline mt-1"
                    >
                      Open Live Demo &rarr;
                    </a>
                  )}
                </div>
              </td>
              <td>
                <span className={`status-badge ${getStatusBadgeClass(item.status)}`}>
                  {item.status}
                </span>
              </td>
              <td>
                <span className="text-xs text-subtle font-semibold">
                  {formatTimestamp(item.timestamp)}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default RoleHistoryTable;

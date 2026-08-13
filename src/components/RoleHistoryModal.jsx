import React from 'react';
import DocumentViewerModal from './DocumentViewerModal';
import RoleHistoryTable from './RoleHistoryTable';
import { useRoleHistory } from '../hooks/useRoleHistory';

function RoleHistoryModal({ initialRole = 'All Roles', currentRole, onClose }) {
  const {
    isAdmin,
    selectedRole,
    setSelectedRole,
    selectedProject,
    setSelectedProject,
    searchQuery,
    setSearchQuery,
    filteredItems,
    projectsList,
    loading,
    viewedPdf,
    setViewedPdf,
    visibleRoles,
    totalFiles,
    totalCompleted,
  } = useRoleHistory({ initialRole, currentUser: { role: currentRole } });

  return (
    <dialog
      open
      className="modal-overlay"
      aria-modal="true"
    >
      <button
        type="button"
        className="modal-backdrop-btn"
        onClick={onClose}
        aria-label="Close modal backdrop"
      />
      <div className="modal-content doc-modal-container">
        <div className="d-flex justify-between items-center mb-4">
          <div>
            <h2 className="modal-title mb-0">Role Activity History</h2>
            <p className="text-sm text-subtle font-semibold mt-1 mb-0">
              Chronological log of past tasks, uploads, deployments, and bug reports
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="btn-secondary" 
          >
            Close
          </button>
        </div>
        <div className="d-flex gap-2 overflow-auto mb-4 pb-1">
          {visibleRoles.map(r => {
            let isActive = true;
            if (isAdmin) {
              isActive = selectedRole === r;
            }
            return (
              <button
                key={r}
                type="button"
                className={`platform-tab ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (isAdmin) setSelectedRole(r);
                }}
              >
                {r}
              </button>
            );
          })}
        </div>

        <div className="d-flex gap-4 mb-4 items-center">
          <div className="flex-1 position-relative d-inline-flex items-center">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="search"
              placeholder="Search history by task name, package, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input w-full"
            />
          </div>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="ui-select"
          >
            <option value="All Projects">All Projects</option>
            {projectsList.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="grid-3col mb-6">
          <div className="stat-card p-4">
            <div className="stat-icon blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="stat-body">
              <span className="stat-value text-xl">{filteredItems.length}</span>
              <span className="stat-label text-xs">Logs</span>
            </div>
          </div>

          <div className="stat-card p-4">
            <div className="stat-icon teal">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="stat-body">
              <span className="stat-value text-xl">{totalCompleted}</span>
              <span className="stat-label text-xs">Completed</span>
            </div>
          </div>

          <div className="stat-card p-4">
            <div className="stat-icon cyan">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="stat-body">
              <span className="stat-value text-xl">{totalFiles}</span>
              <span className="stat-label text-xs">Files &amp; Links</span>
            </div>
          </div>
        </div>
        <div className="flex-grow-1 overflow-auto ui-card p-0">
          <RoleHistoryTable
            items={filteredItems}
            loading={loading}
            setViewedPdf={setViewedPdf}
          />
        </div>
      </div>
      {viewedPdf && (
        <DocumentViewerModal
          viewedPdf={viewedPdf}
          setViewedPdf={setViewedPdf}
        />
      )}
    </dialog>
  );
}

export default RoleHistoryModal;
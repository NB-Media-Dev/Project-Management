import React from 'react';
import DocumentViewerModal from './DocumentViewerModal';
import RoleHistoryTable from './RoleHistoryTable';
import { useRoleHistory } from '../hooks/useRoleHistory';

function RoleHistoryView({ defaultRole = 'All Roles', selectedProject = 'All Projects', currentUser }) {
  const {
    isAdmin,
    selectedRole: activeRole,
    setSelectedRole: setActiveRole,
    selectedProject: filterProject,
    setSelectedProject: setFilterProject,
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
  } = useRoleHistory({ initialRole: defaultRole, initialProject: selectedProject, currentUser });

  const emptyViewMessage = (
    <div className="p-8 text-center d-flex flex-col items-center justify-center">
      <h3 className="text-xl font-extrabold text-main mb-2">
        No history found
      </h3>
      <p className="text-sm text-muted mb-0 font-medium">
        Try adjusting your filters or check back later for updates.
      </p>
    </div>
  );

  return (
    <div>
      <div className="content-header mb-6">
        <div>
          <h1 className="dashboard-title">Activity Log &amp; Audit History</h1>
          <p className="dashboard-subtitle">
            Audit trail of completed team tasks, files, and project updates
          </p>
        </div>
      </div>

      <div className="ui-card p-2 mb-6">
        <div className="d-flex gap-2 overflow-auto items-center">
          {visibleRoles.map(r => {
            const isActive = isAdmin ? (activeRole === r) : true;
            return (
              <button
                key={r}
                type="button"
                onClick={() => {
                  if (isAdmin) setActiveRole(r);
                }}
                className={`role-filter-tab ${isActive ? 'active' : ''}`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      <div className="d-flex gap-4 mb-6 items-center">
        <div className="flex-1 position-relative d-inline-flex items-center">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="search"
            placeholder="Search activity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input w-full"
          />
        </div>

        <div className="position-relative">
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="ui-select"
          >
            <option value="All Projects">All Projects</option>
            {projectsList.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid-3col mb-8">
        <div className="ui-card d-flex items-center gap-4">
          <div className="page-nav-avatar bg-primary text-inverse">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-main">
              {filteredItems.length}
            </div>
            <div className="text-xs text-muted font-semibold mt-1">
              Logs
            </div>
          </div>
        </div>

        <div className="ui-card d-flex items-center gap-4">
          <div className="page-nav-avatar bg-emerald-600 text-inverse">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-main">
              {totalCompleted}
            </div>
            <div className="text-xs text-muted font-semibold mt-1">
              Completed
            </div>
          </div>
        </div>

        <div className="ui-card d-flex items-center gap-4">
          <div className="page-nav-avatar bg-cyan-600 text-inverse">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-main">
              {totalFiles}
            </div>
            <div className="text-xs text-muted font-semibold mt-1">
              Files &amp; Links
            </div>
          </div>
        </div>
      </div>

      <div className="ui-card p-0 overflow-hidden">
        <RoleHistoryTable
          items={filteredItems}
          loading={loading}
          setViewedPdf={setViewedPdf}
          emptyMessage={emptyViewMessage}
        />
      </div>

      {viewedPdf && (
        <DocumentViewerModal
          viewedPdf={viewedPdf}
          setViewedPdf={setViewedPdf}
        />
      )}
    </div>
  );
}

export default RoleHistoryView;

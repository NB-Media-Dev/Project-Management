import React, { useState } from 'react';
import DashboardShell from './DashboardShell';
import CreatePackageModal from './CreatePackageModal';
import EditPackageModal from './EditPackageModal';
import RoleHistoryView from './RoleHistoryView';
import FlowChartView from './FlowChartView';
import ProjectsView from './ProjectsView';
import { usePackages } from '../hooks/usePackages';
import { api } from '../services/api';
import { getFileTypeDetails, stripTimestampPrefix, triggerFilePicker } from '../utils/fileUtils';

function renderContentStatus(pkg) {
  let label = 'Draft In Progress';
  let badgeClass = 'pending';
  if (pkg.contentTlApproved) {
    label = 'Approved by Project Manager';
    badgeClass = 'completed';
  } else if (pkg.contentUploaded) {
    label = 'Uploaded (Pending PM Approval)';
  }
  return {
    label,
    badgeClass,
    linkText: 'Manage Copy & Task Details',
    linkColor: '#2563eb',
  };
}

function ContentDashboard({ currentUser, onLogout, onUpdateUser }) {
  const packagesState = usePackages('All Projects');
  const {
    activeNav, setActiveNav,
    selectedProject, setSelectedProject,
    setSelectedPackageId,
    selectedPackage, triggerReload,
    searchQuery,
  } = packagesState;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewedPdf, setViewedPdf] = useState(null);

  const handleCreateSubmit = async ({ name, project, description, dueDate }) => {
    try {
      const resData = await api.packages.create({
        name,
        project,
        description,
        dueDate,
        createdByRole: currentUser?.role || 'Content Team',
        createdBy: currentUser?.username || 'Content Member',
      });
      triggerReload();
      setSelectedProject(project);
      setSelectedPackageId(resData.insertId);
      setActiveNav('projects');
      setIsModalOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to create task.');
    }
  };

  const handleUpdateDueDate = async (packageId, newDueDate) => {
    try {
      await api.packages.updateDueDate(packageId, newDueDate);
      triggerReload();
    } catch (err) {
      alert(err.message || 'Failed to update due date.');
    }
  };

  const handleEditSubmit = async (updatedData) => {
    try {
      await api.packages.update(selectedPackage.id, updatedData);
      triggerReload();
      if (updatedData.project) setSelectedProject(updatedData.project);
      setIsEditModalOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to update task.');
    }
  };

  const handleDeletePackage = async (packageId) => {
    if (!window.confirm(`Are you sure you want to delete task "${selectedPackage.name}"? This action cannot be undone.`)) return;
    try {
      await api.packages.delete(packageId);
      setSelectedPackageId(null);
      triggerReload();
    } catch (err) {
      alert(err.message || 'Failed to delete task.');
    }
  };

  const handleAddRequirement = async () => {
    const name = window.prompt('Enter new requirement item title (e.g., Compliance Checklist):');
    if (!name?.trim()) return;
    try {
      await api.packages.addContentReq(selectedPackage.id, name.trim());
      triggerReload();
    } catch (err) {
      alert(err.message || 'Failed to add requirement item.');
    }
  };

  const handleDeleteReqRow = async (packageId, reqId, reqName) => {
    if (!window.confirm(`Are you sure you want to remove requirement item "${reqName}"?`)) return;
    try {
      await api.packages.deleteContentReqRow(packageId, reqId);
      triggerReload();
    } catch (err) {
      alert(err.message || 'Failed to delete requirement item.');
    }
  };

  const handleFileUpload = (packageId, reqId) => {
    triggerFilePicker('.pdf,.doc,.docx,.xls,.xlsx,.zip', async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadedBy', currentUser?.username || 'Content Member');
      try {
        await api.packages.uploadContentFile(packageId, reqId, formData);
        triggerReload();
      } catch (err) {
        alert(err.message || 'Failed to upload file.');
      }
    });
  };

  const handleApproveTL = async (packageId, reqId) => {
    try {
      await api.packages.approveContentTL(packageId, reqId, currentUser?.username || 'Content TL');
      triggerReload();
    } catch (err) {
      alert(err.message || 'Failed to approve content.');
    }
  };

  const handleDeleteFile = async (packageId, reqId) => {
    if (!window.confirm('Are you sure you want to clear/delete this uploaded file?')) return;
    try {
      await api.packages.deleteContentFile(packageId, reqId);
      triggerReload();
    } catch (err) {
      alert(err.message || 'Failed to delete file.');
    }
  };

  const handleResolveFeedback = async (packageId, feedbackId) => {
    try {
      await api.packages.resolveDesignFeedback(packageId, feedbackId);
      triggerReload();
    } catch (err) {
      alert(err.message || 'Failed to resolve feedback.');
    }
  };




  let content = null;

  if (activeNav === 'dashboard' && !selectedPackage) {
    content = (
      <RoleHistoryView
        defaultRole={currentUser?.role ?? 'Content Team'}
        selectedProject="All Projects"
        currentUser={currentUser}
        onSelectPackage={(pkgId) => {
          setSelectedPackageId(pkgId);
          setActiveNav('projects');
        }}
      />
    );
  } else if (activeNav === 'flowchart' && !selectedPackage) {
    content = (
      <FlowChartView
        currentUser={currentUser}
        selectedProject={selectedProject}
        setSelectedProject={setSelectedProject}
        onSelectPackage={(pkgId) => {
          setSelectedPackageId(pkgId);
          setActiveNav('projects');
        }}
        triggerReload={triggerReload}
      />
    );
  } else if (selectedPackage) {
    let headerStatusBadge = <span className="status-badge pending ui-badge-lg">Draft In Progress</span>;
    if (selectedPackage.contentTlApproved) {
      headerStatusBadge = <span className="status-badge completed ui-badge-lg">TL Approved</span>;
    } else if (selectedPackage.contentUploaded) {
      headerStatusBadge = <span className="status-badge pending ui-badge-lg">Pending TL Approval</span>;
    }

    content = (
      <div>
        <div className="content-header">
          <div className="navigation-breadcrumbs">
            <button onClick={() => setSelectedPackageId(null)} className="back-btn">
              &larr; Back to {selectedProject || 'Projects'}
            </button>
            <span className="breadcrumb-separator">/</span>
            <span className="current-breadcrumb">{selectedPackage.name}</span>
          </div>
          <div className="d-flex justify-between items-center flex-wrap gap-4 mt-2">
            <div>
              <h1 className="dashboard-title">{selectedPackage.name} - Content</h1>
              <p className="dashboard-subtitle">
                {selectedPackage.project || 'Project'} · Content Team
              </p>
            </div>
            <div className="d-flex items-center gap-2 flex-wrap">
              <div className="d-flex items-center gap-1.5 bg-white border rounded px-2 py-1 shadow-xs" style={{ borderColor: '#cbd5e1' }} title="Fix or update due date">
                <span className="text-xs font-bold text-slate-600 uppercase">Due Date:</span>
                <input
                  type="date"
                  value={selectedPackage.dueDate || ''}
                  onChange={(e) => handleUpdateDueDate(selectedPackage.id, e.target.value)}
                  className="ui-input"
                  style={{ padding: '2px 6px', fontSize: '0.8rem', width: '135px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="ui-btn ui-btn-outline ui-btn-sm"
              >
                Edit Task
              </button>
              {currentUser?.role?.includes('Project Manager') && (
                <>
                  <button
                    type="button"
                    onClick={() => handleDeletePackage(selectedPackage.id)}
                    className="ui-btn ui-btn-danger ui-btn-sm"
                  >
                    Delete Task
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="create-btn ui-btn-sm"
                  >
                    + New Task
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="ui-card mb-6 p-4 d-flex justify-between items-center flex-wrap gap-3">
          <div>
            <h3 className="ui-card-title mb-0">Content Status</h3>
          </div>
          <div className="d-flex items-center gap-3">
            {headerStatusBadge}
          </div>
        </div>

        <div className="d-flex justify-between items-center mb-4">
          <h2 className="section-title mb-0">Requirement Documents</h2>
          <button
            type="button"
            onClick={handleAddRequirement}
            className="ui-btn ui-btn-outline ui-btn-sm"
          >
            + Add Requirement Item
          </button>
        </div>

        <div className="requirements-grid">
          {selectedPackage.contentFiles?.map((req) => {
            const typeInfo = getFileTypeDetails(req.fileName);
            return (
              <div key={req.id} className="requirement-card">
                <div className="req-card-header d-flex justify-between items-center">
                  <div>
                    <h3 className="req-title">{req.name}</h3>
                    {req.fileName && (
                      <div className="d-flex gap-1 mt-1 flex-wrap">
                        <span className={`build-file-approval-badge ${req.tlApproval === 'Approved' ? 'build-file-approval-approved' : (req.tlApproval === 'Rejected' ? 'build-file-approval-rejected' : 'build-file-approval-pending')}`} style={req.tlApproval === 'Rejected' ? { backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fca5a5' } : {}}>
                          PM Approval: {req.tlApproval}
                        </span>
                      </div>
                    )}
                    {req.tlApproval === 'Rejected' && req.rejectionReason && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded-md mt-2" style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5', padding: '6px 10px', borderRadius: '6px' }}>
                        <span className="text-xs font-extrabold text-red-800 d-block" style={{ color: '#991b1b' }}>
                          REJECTED BY PROJECT MANAGER:
                        </span>
                        <span className="text-xs text-red-700 font-medium" style={{ color: '#b91c1c' }}>
                          {req.rejectionReason}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteReqRow(selectedPackage.id, req.id, req.name)}
                    className="view-btn build-file-delete-btn"
                    title="Remove requirement item row"
                    style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                  >
                    Remove
                  </button>
                </div>

                {req.fileName ? (
                  <div className="pdf-container">
                    <div className="pdf-icon-box" style={{ backgroundColor: typeInfo.color }}>
                      <span className="pdf-label">{typeInfo.label}</span>
                    </div>
                    <div className="pdf-details">
                      <span className="pdf-name">{stripTimestampPrefix(req.fileName)}</span>
                      <span className="pdf-size">{req.fileSize}</span>
                      {req.uploadedBy && (
                        <span className="build-file-uploader">
                          Uploaded by: {req.uploadedBy}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="upload-container w-full"
                    onClick={() => handleFileUpload(selectedPackage.id, req.id)}
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="upload-icon">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p className="upload-text">Click to upload document</p>
                    <p className="upload-subtext">PDF, DOC, DOCX, XLS</p>
                  </button>
                )}

                <div className="req-card-footer">
                  <div className="action-group w-full justify-between items-center">
                    {req.fileName ? (
                      <>
                        <div className="d-flex gap-1">
                          <button type="button" className="view-btn" onClick={() => setViewedPdf(req)} title="Read Document">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          {req.fileName && (
                            <a
                              href={`${typeof window !== 'undefined' && window.API_BASE_URL ? window.API_BASE_URL : 'http://localhost:3001'}/uploads/${req.fileName}`}
                              download={stripTimestampPrefix(req.fileName) || req.name}
                              target="_blank"
                              rel="noreferrer"
                              className="view-btn"
                              title="Download File"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                            </a>
                          )}
                          <button type="button" className="view-btn" onClick={() => handleFileUpload(selectedPackage.id, req.id)} title="Replace File">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                            </svg>
                          </button>
                          <button type="button" className="view-btn build-file-delete-btn" onClick={() => handleDeleteFile(selectedPackage.id, req.id)} title="Clear File">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                        {(currentUser?.role?.includes('Project Manager') || currentUser?.role === 'CTO' || currentUser?.role === 'Admin') && req.tlApproval !== 'Approved' && (
                          <button
                            type="button"
                            onClick={() => handleApproveTL(selectedPackage.id, req.id)}
                            className="build-file-tl-btn"
                          >
                            Approve Content (PM)
                          </button>
                        )}
                      </>
                    ) : <div />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
<br/>
        <div className="ui-card mt-8">
          <div className="d-flex justify-between items-center mb-4">
            <div>
              <h2 className="section-title mb-0">Design Feedback</h2>
              <p className="text-sm text-muted mt-1 mb-0">
                Feedback from Design Team on requirements.
              </p>
            </div>
            {selectedPackage.designFeedbacks?.some((f) => !f.resolved) && (
              <span className="status-badge pending text-xs">
                Updates Requested ({selectedPackage.designFeedbacks.filter((f) => !f.resolved).length})
              </span>
            )}
          </div>

          {selectedPackage.designFeedbacks?.length > 0 ? (
            <div className="d-flex flex-col gap-3">
              {selectedPackage.designFeedbacks.map((fb) => (
                <div key={fb.id} className="build-file-item">
                  <div>
                    <div className="d-flex items-center gap-2 mb-1">
                      <span className="font-extrabold text-main text-md">{fb.title}</span>
                      <span className={`ui-badge ui-badge-sm ${fb.severity === 'High' ? 'ui-badge-danger' : 'ui-badge-warning'}`}>
                        {fb.severity} Priority
                      </span>
                    </div>
                    <p className="text-sm text-muted mb-0">{fb.description}</p>
                  </div>
                  <div>
                    {fb.resolved ? (
                      <span className="status-badge completed">Resolved</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleResolveFeedback(selectedPackage.id, fb.id)}
                        className="create-btn ui-btn-sm"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5 text-center text-subtle text-sm italic ui-card">
              No feedback from Design Team yet.
            </div>
          )}
        </div>
      </div>
    );
  } else {
    content = (
      <ProjectsView
        packages={packagesState.packages}
        searchQuery={searchQuery}
        selectedProject={selectedProject}
        onSelectProject={(proj) => {
          setSelectedProject(proj);
          setSelectedPackageId(null);
        }}
        onSelectPackage={(pkgId) => {
          setSelectedPackageId(pkgId);
          setActiveNav('projects');
        }}
        renderStatus={renderContentStatus}
        triggerReload={triggerReload}
        currentUser={currentUser}
      />
    );
  }

  return (
    <DashboardShell
      currentUser={currentUser}
      onLogout={onLogout}
      onUpdateUser={onUpdateUser}
      packagesState={packagesState}
      viewedPdf={viewedPdf}
      setViewedPdf={setViewedPdf}
      overlay={
        <>
          {isModalOpen && (
            <CreatePackageModal
              currentUser={currentUser}
              onSubmit={handleCreateSubmit}
              onCancel={() => setIsModalOpen(false)}
            />
          )}
          {isEditModalOpen && selectedPackage && (
            <EditPackageModal
              pkg={selectedPackage}
              onSubmit={handleEditSubmit}
              onCancel={() => setIsEditModalOpen(false)}
            />
          )}
        </>
      }
    >
      {content}
    </DashboardShell>
  );
}

export default ContentDashboard;

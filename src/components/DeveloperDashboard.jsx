import React, { useState } from 'react';
import DashboardShell from './DashboardShell';
import BuildFileRow from './BuildFileRow';
import ProjectsView from './ProjectsView';
import { renderSharedDashboardNav } from './dashboardHelpers';
import { usePackages } from '../hooks/usePackages';
import { api } from '../services/api';
import { getFileTypeDetails, stripTimestampPrefix, getFullUrl, renderVideoThumbnail } from '../utils/fileUtils';

function AssetCard({ asset, baseUrl, setViewedPdf }) {
  const typeInfo = getFileTypeDetails(asset.fileName);
  const ext = asset.fileName ? asset.fileName.split('.').pop().toLowerCase() : '';
  const isImg = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext);
  const isVid = ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext);
  const fileUrl = asset.fileName ? `${baseUrl}/uploads/${asset.fileName}` : null;

  let thumbContent = (
    <div className="digital-doc-thumb" style={{ backgroundColor: typeInfo.color }}>
      <span>{typeInfo.label}</span>
    </div>
  );
  if (isImg && fileUrl) {
    thumbContent = <img src={fileUrl} alt={asset.name} className="digital-file-thumb" />;
  } else if (isVid) {
    thumbContent = renderVideoThumbnail();
  }

  const handleView = () => setViewedPdf(asset);

  return (
    <div key={asset.id} className="digital-file-item">
      <button
        type="button"
        className="digital-file-preview-box w-full text-left"
        onClick={handleView}
      >
        {thumbContent}
      </button>

      <div className="digital-file-details">
        <span className="digital-file-name text-xs font-bold block truncate overflow-hidden text-ellipsis whitespace-nowrap" title={asset.name}>
          {asset.name}
        </span>
        <span className="digital-file-meta text-xs text-muted block truncate overflow-hidden text-ellipsis whitespace-nowrap" title={asset.fileName}>
          {stripTimestampPrefix(asset.fileName)} ({asset.fileSize || 'Asset'})
        </span>

        <div className="d-flex gap-1 mt-2 flex-wrap">
          <button type="button" className="view-btn py-1 px-2 text-xs flex-1 text-center" onClick={handleView} title="View Asset">
            View
          </button>
          {fileUrl && (
            <a
              href={fileUrl}
              download={asset.name || stripTimestampPrefix(asset.fileName)}
              target="_blank"
              rel="noreferrer"
              className="view-btn py-1 px-2 text-xs flex-1 text-center text-decoration-none"
              style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
              title="Download asset"
            >
              Download
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function getDevBuildFilesList(pkg) {
  if (!pkg) return [];
  if (pkg.devBuildFiles) return pkg.devBuildFiles;
  if (pkg.devBuilds) return pkg.devBuilds;
  if (pkg.devBuildFile) return [pkg.devBuildFile];
  return [];
}

// NOTE: this is gated on `designUploaded`, which is a different condition
// than the package-card status shown inside this dashboard (see
// `renderDeveloperCardStatus` below, gated on content-TL approval). Keep
// these distinct on purpose — don't merge without confirming both call
// sites should share one gate.
export function renderDevStatus(pkg) {
  const isDesignReady = Boolean(
    pkg.designUploaded || (pkg.designFiles?.some((f) => Boolean(f.fileName)))
  );
  const devBuilds = pkg.devBuildFiles || pkg.devBuilds || [];

  if (!isDesignReady) {
    return {
      label: 'Awaiting Digital Assets',
      badgeClass: 'pending',
      linkText: 'View Task Details',
      linkColor: '#64748b',
    };
  }
  let label = 'In Development';
  let badgeClass = 'pending';
  if (pkg.submittedToDevops) {
    label = 'Submitted to DevOps';
    badgeClass = 'completed';
  } else if (devBuilds.length > 0) {
    label = `${devBuilds.length} Build(s) Uploaded`;
    badgeClass = 'approved';
  }
  return {
    label,
    badgeClass,
    linkText: 'Manage Build Files & Submission',
    linkColor: '#3b82f6',
  };
}

function DevBuildUploadModal({
  isOpen,
  editingBuildId,
  buildNameInput,
  setBuildNameInput,
  platformInput,
  setPlatformInput,
  setSelectedFileInput,
  onClose,
  onSubmit,
}) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content-sm">
        <h2 className="modal-title">{editingBuildId ? 'Edit Build File' : 'Upload Build Zip (Max 15MB)'}</h2>
        <form onSubmit={onSubmit}>
          <div className="form-group mb-4">
            <label htmlFor="buildPlatform" className="ui-label">Target Platform</label>
            <select
              id="buildPlatform"
              value={platformInput}
              onChange={(e) => setPlatformInput(e.target.value)}
              className="ui-select mt-1 w-full"
            >
              <option value="App">App Build (.zip)</option>
              <option value="Web">Web Build (.zip)</option>
            </select>
          </div>

          <div className="form-group mb-4">
            <label htmlFor="buildName" className="ui-label">Build Title</label>
            <input
              type="text"
              id="buildName"
              value={buildNameInput}
              onChange={(e) => setBuildNameInput(e.target.value)}
              placeholder={platformInput === 'App' ? 'e.g. Android / iOS App Source Code .zip' : 'e.g. Web App Frontend Source Code .zip'}
              className="mt-1"
            />
          </div>

          <div className="form-group mb-6">
            <label className="ui-label">
              {editingBuildId ? 'Replace Zip File (Max 15MB)' : 'Select Build File (.zip - Max 15MB)'}
            </label>
            <input
              type="file"
              accept=".zip,.rar,.tar,.gz"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file && file.size > 15 * 1024 * 1024) {
                  alert('File size exceeds the 15MB maximum limit! Please select a zip file under 15MB.');
                  e.target.value = null;
                  setSelectedFileInput(null);
                  return;
                }
                setSelectedFileInput(file);
              }}
              className="mt-1"
            />
            <span className="text-xs text-muted mt-1 block">Maximum allowed file size: 15MB</span>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="create-btn">{editingBuildId ? 'Save Changes' : 'Upload & Submit to DevOps'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeveloperPackageDetailsView({
  selectedPackage,
  selectedProject,
  setSelectedPackageId,
  openCreateModal,
  isContentApproved,
  buildFilesList,
  setViewedPdf,
  openEditModal,
  handleDeleteBuildFile,
  handleResolveBug,
}) {
  const allDesignAssets = selectedPackage?.designFiles || [];
  const webDesignAssets = allDesignAssets.filter(
    (f) => f.platform === 'Web' || (!f.platform && f.platform !== 'Mobile' && f.platform !== 'Video')
  );
  const mobileDesignAssets = allDesignAssets.filter(
    (f) => f.platform === 'Mobile' || f.platform === 'App'
  );
  const videoDesignAssets = allDesignAssets.filter((f) => {
    if (f.platform === 'Video') return true;
    const ext = f.fileName ? f.fileName.split('.').pop().toLowerCase() : '';
    return ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext);
  });

  const appBuilds = buildFilesList.filter(
    (b) => b.platform === 'App' || b.platform === 'Mobile'
  );
  const webBuilds = buildFilesList.filter(
    (b) => b.platform !== 'App' && b.platform !== 'Mobile'
  );

  const renderAssetGrid = (assets, emptyMessage) => {
    if (assets.length === 0) {
      return <p className="no-data text-xs text-muted mb-0">{emptyMessage}</p>;
    }
    const baseUrl = typeof window !== 'undefined' && window.API_BASE_URL ? window.API_BASE_URL : 'http://localhost:3001';
    return (
      <div className="digital-files-grid mt-2">
        {assets.map((asset) => (
          <AssetCard key={asset.id} asset={asset} baseUrl={baseUrl} setViewedPdf={setViewedPdf} />
        ))}
      </div>
    );
  };

  return (
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
            <h1 className="dashboard-title">{selectedPackage.name} - Developer</h1>
            <p className="dashboard-subtitle">
              {selectedPackage.project || 'Project'} · Developer Team
            </p>
          </div>
        </div>
      </div>

      {!isContentApproved && (
        <div className="testing-alert-banner mb-6">
          Notice: Content requirements for this task are currently pending Content TL approval.
        </div>
      )}

      {selectedPackage.figmaLink && (
        <div className="p-4 rounded-lg bg-purple-50 border border-purple-200 mb-6 d-flex justify-between items-center flex-wrap gap-3">
          <div>
            <span className="text-xs font-extrabold text-purple-900 uppercase">Figma Canvas Prototype</span>
            <p className="text-sm font-semibold text-purple-800 mt-1 mb-0">
              Design team provided an interactive Figma link for this task:
            </p>
          </div>
          <a
            href={selectedPackage.figmaLink}
            target="_blank"
            rel="noreferrer"
            className="ui-btn ui-btn-purple ui-btn-sm"
          >
            Open Figma Link &rarr;
          </a>
        </div>
      )}

      {/* SEPARATE BUILD RELEASES TABLES: APP & WEB */}
      <div className="grid-2col mb-8">
        {/* APP BUILDS TABLE SECTION */}
        <section className="digital-section">
          <div className="d-flex justify-between items-center mb-3 flex-wrap gap-2">
            <div className="d-flex items-center gap-2">
              <span className="ui-badge ui-badge-success font-bold text-xs">APP SIDE</span>
              <h2 className="section-title mb-0">App Builds ({appBuilds.length})</h2>
            </div>
            <button
              type="button"
              onClick={() => openCreateModal('App')}
              className="ui-btn ui-btn-success ui-btn-xs"
            >
              + Upload App Zip
            </button>
          </div>

          {appBuilds.length > 0 ? (
            <div className="d-flex flex-col gap-3">
              {appBuilds.map((build) => (
                <BuildFileRow
                  key={build.id}
                  build={build}
                  onView={setViewedPdf}
                  onEdit={openEditModal}
                  onDelete={(fileId) => handleDeleteBuildFile(selectedPackage.id, fileId)}
                />
              ))}
            </div>
          ) : (
            <div>
              <button
                type="button"
                className="upload-container p-5 w-full text-left"
                onClick={() => openCreateModal('App')}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="upload-icon">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
                <p className="upload-text">Click to upload App build (.zip - Max 15MB)</p>
              </button>
            </div>
          )}
        </section>

        {/* WEB BUILDS TABLE SECTION */}
        <section className="digital-section">
          <div className="d-flex justify-between items-center mb-3 flex-wrap gap-2">
            <div className="d-flex items-center gap-2">
              <span className="ui-badge ui-badge-primary font-bold text-xs">WEB SIDE</span>
              <h2 className="section-title mb-0">Web Builds ({webBuilds.length})</h2>
            </div>
            <button
              type="button"
              onClick={() => openCreateModal('Web')}
              className="ui-btn ui-btn-primary ui-btn-xs"
            >
              + Upload Web Zip
            </button>
          </div>

          {webBuilds.length > 0 ? (
            <div className="d-flex flex-col gap-3">
              {webBuilds.map((build) => (
                <BuildFileRow
                  key={build.id}
                  build={build}
                  onView={setViewedPdf}
                  onEdit={openEditModal}
                  onDelete={(fileId) => handleDeleteBuildFile(selectedPackage.id, fileId)}
                />
              ))}
            </div>
          ) : (
            <div>
              <button
                type="button"
                className="upload-container p-5 w-full text-left"
                onClick={() => openCreateModal('Web')}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="upload-icon">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                <p className="upload-text">Click to upload Web build (.zip - Max 15MB)</p>
              </button>
            </div>
          )}
        </section>
      </div>

        <section className="digital-section d-flex flex-col justify-center">
          <h2 className="section-title mb-3">Live Status</h2>
          {selectedPackage.deployed ? (
            <div>
              <span className="status-badge completed mb-3">Live Active</span>
              <p className="text-sm font-extrabold mb-2">Live Link:</p>
              <a href={selectedPackage.demoUrl} target="_blank" rel="noreferrer" className="link-preview-card">
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">{selectedPackage.demoUrl}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          ) : (
            <span className="status-badge pending items-start">Awaiting Production Deployment</span>
          )}
        </section>

      {/* Content Requirements & Copy Details */}
      <div className="ui-card mb-8">
        <div className="d-flex justify-between items-center mb-4">
          <h3 className="ui-card-title mb-0">
            Content Requirements &amp; Documents ({selectedPackage.contentFiles?.length || 0})
          </h3>
          {(() => {
            if (selectedPackage.contentTlApproved) return <span className="ui-badge ui-badge-success">Content Approved</span>;
            if (selectedPackage.contentUploaded) return <span className="ui-badge ui-badge-warning">Pending Approval</span>;
            return <span className="ui-badge ui-badge-secondary">Draft / Uploading</span>;
          })()}
        </div>
        <div className="grid-2col">
          {selectedPackage.contentFiles?.length > 0 ? (
            selectedPackage.contentFiles.map((req) => {
              const baseUrl = typeof window !== 'undefined' && window.API_BASE_URL ? window.API_BASE_URL : 'http://localhost:3001';
              const fileUrl = req.fileName ? `${baseUrl}/uploads/${req.fileName}` : null;
              const typeInfo = getFileTypeDetails(req.fileName);
              return (
                <div key={req.id} className="pdf-container mb-0 justify-between p-3 rounded-lg border">
                  <div className="d-flex items-center gap-3 flex-grow-1 overflow-hidden">
                    <div className="pdf-icon-box" style={{ backgroundColor: req.tlApproval === 'Approved' ? '#2563eb' : '#64748b' }}>
                      <span className="pdf-label">{req.fileName ? typeInfo.label : 'DOC'}</span>
                    </div>
                    <div className="pdf-details">
                      <span className="pdf-name font-extrabold text-sm">{req.name}</span>
                      <span className={`pdf-size text-xs ${req.fileName ? 'text-muted' : 'text-danger'}`}>
                        {req.fileName ? `${stripTimestampPrefix(req.fileName)} · ${req.fileSize || ''}` : 'No file uploaded yet'}
                      </span>
                    </div>
                  </div>
                  <div className="d-flex items-center gap-2">
                    {req.fileName ? (
                      <>
                        <button type="button" className="view-btn py-1 px-2 text-xs" onClick={() => setViewedPdf(req)} title="View Document">
                          View
                        </button>
                        {fileUrl && (
                          <a
                            href={fileUrl}
                            download={req.name || stripTimestampPrefix(req.fileName)}
                            target="_blank"
                            rel="noreferrer"
                            className="view-btn py-1 px-2 text-xs text-center text-decoration-none"
                            style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
                            title="Download document"
                          >
                            Download
                          </a>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted font-semibold">Pending</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="no-data text-xs text-muted mb-0">No content requirement documents uploaded yet.</p>
          )}
        </div>
      </div>

      {/* Approved Design Assets Containers */}
      <section className="digital-section mb-8">
        <div className="d-flex justify-between items-center mb-4 flex-wrap gap-2">
          <h2 className="section-title mb-0">Approved Design Assets ({allDesignAssets.length})</h2>
          {allDesignAssets.length > 0 && (
            <span className="ui-badge ui-badge-success text-xs">Design Assets Approved</span>
          )}
        </div>

        <div className="grid-2col mb-6">
          <div className="digital-container-card ui-card p-4 sm:p-5">
            <div className="d-flex items-center justify-between gap-3 mb-4 border-bottom pb-3 flex-wrap">
              <div className="d-flex items-center gap-3">
                <div className="digital-container-icon web-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <div>
                  <h3 className="ui-card-title mb-0">Site Images (Web)</h3>
                  <span className="text-xs text-muted font-semibold">{webDesignAssets.length} file(s)</span>
                </div>
              </div>
            </div>
            {renderAssetGrid(webDesignAssets, 'No Web design assets uploaded.')}
          </div>

          <div className="digital-container-card ui-card p-4 sm:p-5">
            <div className="d-flex items-center justify-between gap-3 mb-4 border-bottom pb-3 flex-wrap">
              <div className="d-flex items-center gap-3">
                <div className="digital-container-icon mobile-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" />
                  </svg>
                </div>
                <div>
                  <h3 className="ui-card-title mb-0">App Images (Mobile)</h3>
                  <span className="text-xs text-muted font-semibold">{mobileDesignAssets.length} file(s)</span>
                </div>
              </div>
            </div>
            {renderAssetGrid(mobileDesignAssets, 'No Mobile app assets uploaded.')}
          </div>
        </div>

        {videoDesignAssets.length > 0 && (
          <div className="digital-container-card ui-card mb-6 p-4 sm:p-5 border-l-4 border-l-rose-500">
            <div className="d-flex items-center justify-between gap-3 mb-4 border-bottom pb-3 flex-wrap">
              <div className="d-flex items-center gap-3">
                <div className="digital-container-icon video-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                </div>
                <div>
                  <h3 className="ui-card-title mb-0">Landing Page Video</h3>
                  <span className="text-xs text-muted font-semibold">{videoDesignAssets.length} file(s)</span>
                </div>
              </div>
            </div>
            {renderAssetGrid(videoDesignAssets, 'No video assets uploaded.')}
          </div>
        )}
      </section>

      <section className="digital-section mb-8">
        <div className="d-flex justify-between items-center mb-4">
          <h2 className="section-title mb-0">Test Tester Bug Reports ({selectedPackage.bugs?.length || 0})</h2>
          {selectedPackage.bugs?.some(b => !b.resolved) && (
            <span className="ui-badge ui-badge-warning">
              {selectedPackage.bugs.filter(b => !b.resolved).length} Unresolved Bug(s)
            </span>
          )}
        </div>

        <div className="testing-staging-card">
          <div className="testing-staging-title-group mb-3">
            <span className="testing-staging-label">Staging Server URL</span>
            <div className="mt-1">
              {selectedPackage.stagingUrl ? (
                <a
                  href={getFullUrl(selectedPackage.stagingUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="testing-staging-link font-bold text-sky-600"
                >
                  {selectedPackage.stagingUrl}
                </a>
              ) : (
                <span className="testing-staging-none">Staging URL not yet submitted by DevOps</span>
              )}
            </div>
          </div>

          {selectedPackage.bugs && selectedPackage.bugs.length > 0 ? (
            <div className="d-flex flex-col gap-3 mt-4 border-top pt-3">
              <h4 className="text-xs font-bold text-muted uppercase mb-2">Reported Test Issues:</h4>
              {selectedPackage.bugs.map((bug, index) => {
                const urlToDisplay = bug.bugUrl || selectedPackage.stagingUrl;
                let severityBg = '#0284c7';
                if (bug.severity === 'Critical') severityBg = '#dc2626';
                else if (bug.severity === 'High') severityBg = '#ea580c';

                return (
                  <div
                    key={bug.id || index}
                    className="p-4 rounded-lg border d-flex justify-between items-center flex-wrap gap-3"
                    style={{
                      backgroundColor: bug.resolved ? '#f8fafc' : '#fff1f2',
                      borderColor: bug.resolved ? '#e2e8f0' : '#fecdd3',
                    }}
                  >
                    <div className="flex-1">
                      <div className="d-flex items-center gap-2 mb-1">
                        <span
                          className="ui-badge ui-badge-sm"
                          style={{
                            backgroundColor: severityBg,
                            color: '#ffffff',
                          }}
                        >
                          {bug.severity || 'Normal'}
                        </span>
                        <h4 className="text-sm font-extrabold text-main mb-0">
                          {bug.title || 'Reported Bug'}
                        </h4>
                        {bug.reportedBy && (
                          <span className="text-xs text-muted">by {bug.reportedBy}</span>
                        )}
                      </div>

                      {urlToDisplay && (
                        <div className="mt-1">
                          <a
                            href={getFullUrl(urlToDisplay)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-sky-600 underline"
                            style={{ wordBreak: 'break-all' }}
                          >
                            Bug Link: {urlToDisplay} &rarr;
                          </a>
                        </div>
                      )}

                      {bug.description && (
                        <p className="text-xs text-muted mt-2 mb-0">
                          <strong>Details:</strong> {bug.description}
                        </p>
                      )}
                    </div>

                    <div>
                      {bug.resolved ? (
                        <span className="ui-badge ui-badge-success ui-badge-md">
                          Fixed &amp; Resolved
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleResolveBug(selectedPackage.id, bug.id)}
                          className="ui-btn ui-btn-success ui-btn-sm font-bold"
                          style={{ backgroundColor: '#10b981', borderColor: '#059669', color: '#ffffff' }}
                        >
                          Fix &amp; Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted mt-3">
              No Test bugs reported for this Task yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function getDeveloperDashboardContent({
  activeNav,
  selectedPackage,
  currentUser,
  selectedProject,
  setSelectedProject,
  setSelectedPackageId,
  setActiveNav,
  triggerReload,
  searchQuery,
  packagesState,
  renderDeveloperCardStatus,
  openCreateModal,
  isContentApproved,
  buildFilesList,
  setViewedPdf,
  openEditModal,
  handleDeleteBuildFile,
  handleResolveBug,
}) {
  const sharedContent = renderSharedDashboardNav({
    activeNav,
    selectedPackage,
    currentUser,
    defaultRole: 'Developer Team',
    selectedProject,
    setSelectedProject,
    setSelectedPackageId,
    setActiveNav,
    triggerReload,
  });
  if (sharedContent) return sharedContent;

  if (selectedPackage) {
    return (
      <DeveloperPackageDetailsView
        selectedPackage={selectedPackage}
        selectedProject={selectedProject}
        setSelectedPackageId={setSelectedPackageId}
        openCreateModal={openCreateModal}
        isContentApproved={isContentApproved}
        buildFilesList={buildFilesList}
        setViewedPdf={setViewedPdf}
        openEditModal={openEditModal}
        handleDeleteBuildFile={handleDeleteBuildFile}
        handleResolveBug={handleResolveBug}
      />
    );
  }

  return (
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
      renderStatus={renderDeveloperCardStatus}
      triggerReload={triggerReload}
      currentUser={currentUser}
    />
  );
}

function DeveloperDashboard({ currentUser, onLogout, onUpdateUser }) {
  const packagesState = usePackages('All Projects');
  const {
    activeNav, setActiveNav,
    selectedProject, setSelectedProject,
    setSelectedPackageId,
    selectedPackage, triggerReload,
    searchQuery,
  } = packagesState;

  const [viewedPdf, setViewedPdf] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingBuildId, setEditingBuildId] = useState(null);
  const [platformInput, setPlatformInput] = useState('App');
  const [buildNameInput, setBuildNameInput] = useState('');
  const [selectedFileInput, setSelectedFileInput] = useState(null);

  const handleResolveBug = async (packageId, bugId) => {
    try {
      await api.packages.resolveBug(packageId, bugId);
      triggerReload();
    } catch { }
  };

  const isDesignUploaded = Boolean(
    selectedPackage?.designUploaded ||
    (selectedPackage?.designFiles?.some((f) => Boolean(f.fileName || f.file_name)))
  );

  const openCreateModal = (platform = 'App') => {
    if (!isDesignUploaded) {
      alert('Requirement Failed: Design Team has not uploaded design assets for this Task yet. Developer Team cannot upload build ZIP files until Design Team uploads design assets.');
      return;
    }
    setEditingBuildId(null);
    setPlatformInput(platform || 'App');
    setBuildNameInput('');
    setSelectedFileInput(null);
    setIsUploadModalOpen(true);
  };

  const openEditModal = (build) => {
    setEditingBuildId(build.id);
    setPlatformInput(build.platform === 'App' || build.platform === 'Mobile' ? 'App' : 'Web');
    setBuildNameInput(build.name || '');
    setSelectedFileInput(null);
    setIsUploadModalOpen(true);
  };

  const handleSaveBuild = async (e, packageId) => {
    e.preventDefault();
    if (!isDesignUploaded) {
      alert('Requirement Failed: Design Team has not uploaded design assets for this Task yet. Developer Team cannot upload build ZIP files until Design Team uploads design assets.');
      return;
    }
    if (!editingBuildId && !selectedFileInput) {
      alert('Please choose a .zip file from your computer to upload.');
      return;
    }

    if (selectedFileInput && selectedFileInput.size > 15 * 1024 * 1024) {
      alert('Upload failed: File size exceeds maximum limit of 15MB. Please select a zip file under 15MB.');
      return;
    }

    const formData = new FormData();
    formData.append('platform', platformInput);
    if (buildNameInput.trim() !== '') formData.append('name', buildNameInput.trim());
    if (selectedFileInput) formData.append('file', selectedFileInput);
    formData.append('uploadedBy', currentUser?.username || 'Dev Member');
    try {
      if (editingBuildId) {
        await api.packages.updateDevBuild(packageId, editingBuildId, formData);
      } else {
        await api.packages.createDevBuild(packageId, formData);
      }
      triggerReload();
      setIsUploadModalOpen(false);
      setEditingBuildId(null);
      setBuildNameInput('');
      setSelectedFileInput(null);
    } catch (err) {
      alert(err.message || 'Failed to upload build zip file.');
    }
  };

  const handleDeleteBuildFile = async (packageId, fileId) => {
    if (window.confirm('Are you sure you want to delete this build file?')) {
      try {
        await api.packages.deleteDevBuild(packageId, fileId);
        triggerReload();
      } catch { }
    }
  };

  const buildFilesList = getDevBuildFilesList(selectedPackage);
  const isContentApproved = selectedPackage?.contentTlApproved || selectedPackage?.contentAdminApproved;

  const renderDeveloperCardStatus = (pkg) => {
    const hasDev = pkg.devBuildFiles?.some((f) => f.fileName);
    const hasStagingOrBugs = pkg.devopsStagingUploaded || pkg.stagingUrl || (pkg.bugs && pkg.bugs.length > 0);
    if (!pkg.contentTlApproved && !pkg.contentAdminApproved) {
      return {
        label: 'Awaiting Content TL Approval',
        badgeClass: 'pending',
        linkText: 'View Task Details',
        linkColor: '#64748b',
      };
    }
    let labelText = 'In Development';
    if (pkg.submittedToDevops) labelText = 'Sent to DevOps';
    else if (hasStagingOrBugs) labelText = 'Staging / Test Active';
    else if (hasDev) labelText = 'Build Zip Uploaded';

    let badgeClass = 'pending';
    if (pkg.submittedToDevops || hasStagingOrBugs) badgeClass = 'completed';
    else if (hasDev) badgeClass = 'approved';

    return {
      label: labelText,
      badgeClass,
      linkText: 'Open Code Builds',
      linkColor: '#059669',
    };
  };

  const content = getDeveloperDashboardContent({
    activeNav,
    selectedPackage,
    currentUser,
    selectedProject,
    setSelectedProject,
    setSelectedPackageId,
    setActiveNav,
    triggerReload,
    searchQuery,
    packagesState,
    renderDeveloperCardStatus,
    openCreateModal,
    isContentApproved,
    buildFilesList,
    setViewedPdf,
    openEditModal,
    handleDeleteBuildFile,
    handleResolveBug,
  });

  const uploadModal = (
    <DevBuildUploadModal
      isOpen={isUploadModalOpen}
      editingBuildId={editingBuildId}
      buildNameInput={buildNameInput}
      setBuildNameInput={setBuildNameInput}
      platformInput={platformInput}
      setPlatformInput={setPlatformInput}
      setSelectedFileInput={setSelectedFileInput}
      onClose={() => setIsUploadModalOpen(false)}
      onSubmit={(e) => handleSaveBuild(e, selectedPackage?.id)}
    />
  );

  return (
    <DashboardShell
      currentUser={currentUser}
      onLogout={onLogout}
      onUpdateUser={onUpdateUser}
      packagesState={packagesState}
      viewedPdf={viewedPdf}
      setViewedPdf={setViewedPdf}
      overlay={uploadModal}
    >
      {content}
    </DashboardShell>
  );
}
export default DeveloperDashboard;
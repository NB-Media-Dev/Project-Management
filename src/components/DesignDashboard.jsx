import React, { useState, useEffect } from 'react';
import DashboardShell from './DashboardShell';
import FlowChartView from './FlowChartView';
import ProjectsView from './ProjectsView';
import RoleHistoryView from './RoleHistoryView';
import { renderSharedDashboardNav } from './dashboardHelpers';
import { usePackages } from '../hooks/usePackages';
import { api } from '../services/api';
import { getFileTypeDetails, stripTimestampPrefix, triggerFilePicker, renderVideoThumbnail } from '../utils/fileUtils';

function renderDesignThumbnail(isImg, isVid, fileUrl, displayName, typeInfo) {
  if (isImg && fileUrl) {
    return <img src={fileUrl} alt={displayName} className="digital-file-thumb" />;
  }
  if (isVid) {
    return renderVideoThumbnail();
  }
  return (
    <div className="digital-doc-thumb" style={{ backgroundColor: typeInfo.color }}>
      <span>{typeInfo.label}</span>
    </div>
  );
}

export function renderDesignStatus(pkg) {
  const reqFiles = pkg.reqFiles ? pkg.reqFiles.filter((f) => Boolean(f.fileName)) : [];
  const reqUploaded = pkg.contentUploaded || reqFiles.length > 0;
  const reqApproved = pkg.contentTlApproved || (reqFiles.length > 0 && reqFiles.every((f) => f.tlApproval === 'Approved'));
  const isReqReady = Boolean(reqUploaded || reqApproved);
  const imgCount = pkg.designFiles ? pkg.designFiles.filter((f) => Boolean(f.fileName)).length : 0;
  if (!isReqReady) {
    return {
      label: 'Awaiting Content Requirements',
      badgeClass: 'pending',
      linkText: 'View Task Details',
      linkColor: '#64748b',
    };
  }
  let label = 'Pending Design Assets';
  let badgeClass = 'pending';
  if (pkg.designTlApproved) {
    label = 'Design Approved by TL';
    badgeClass = 'completed';
  } else if (imgCount > 0) {
    label = `${imgCount} Assets Uploaded`;
    badgeClass = 'approved';
  }
  return {
    label,
    badgeClass,
    linkText: 'Manage Digital Assets & Design Images',
    linkColor: '#d97706',
  };
}

const WEB_OPTIONS = [
  { id: 'desktop', name: 'Desktop', dimension: '1920*600 px', platform: 'Web' },
  { id: 'demo_exam', name: 'Demo Exam', dimension: '383*120 px', platform: 'Web' },
  { id: 'current_packages', name: 'Current Packages', dimension: '383*120 px', platform: 'Web' },
  { id: 'subscription_schedule', name: 'Subscription in Schedule Exam', dimension: '383*120 px', platform: 'Web' },
  { id: 'view_details_icon', name: 'View Details - Icon', dimension: '159*152 px', platform: 'Web' },
  { id: 'signin_top', name: 'Signin Page Top', dimension: '1152*366 px', platform: 'Web' },
  { id: 'dashboard_left', name: 'Dashboard Left Opt', dimension: '1152*366 px', platform: 'Web' },
];

const MOBILE_OPTIONS = [
  { id: 'mobile', name: 'Mobile', dimension: '320*480 px', platform: 'Mobile' },
  { id: 'mobile_icon', name: 'Mobile Icon', dimension: '363*360 px', platform: 'Mobile' },
];

const VIDEO_OPTIONS = [
  { id: 'past_event_video', name: 'Past Event Videos in Landing Page', dimension: 'Video (MP4 / WEBM)', platform: 'Video', isVideo: true },
];

const ALL_KNOWN_TITLES = [
  'Desktop',
  'Demo Exam',
  'Current Packages',
  'Subscription in Schedule Exam',
  'View Details - Icon',
  'Signin Page Top',
  'Dashboard Left Opt',
  'Mobile',
  'Mobile Icon',
  'Past Event Videos in Landing Page',
];

function validateAssetFile(file, isVideo) {
  const ext = file.name.toLowerCase().split('.').pop();
  if (isVideo) {
    return ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext) || file.type.startsWith('video/');
  }
  return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext) || file.type.startsWith('image/');
}

function OptionCard({
  title,
  dimension,
  platform,
  isVideo = false,
  subBadge = null,
  designImages = [],
  selectedPackage,
  handleUploadOptionAsset,
  handleDeleteDesignFile,
  setViewedPdf,
}) {
  const optionFiles = designImages.filter((f) => {
    if (!f.name) return false;
    const fName = f.name.trim();
    const t = title.trim();
    return (
      fName === t ||
      fName.startsWith(`${t} -`) ||
      fName.startsWith(`${t} (`) ||
      fName.startsWith(`${t} #`)
    );
  });

  const baseUrl = typeof window !== 'undefined' && window.API_BASE_URL ? window.API_BASE_URL : 'http://localhost:3001';
  const hasFiles = optionFiles.length > 0;

  const getCleanDisplayName = (file) => {
    if (file?.name?.startsWith(`${title} - `)) {
      return file.name.substring(`${title} - `.length);
    }
    return file?.name || '';
  };

  return (
    <div key={title} className={`digital-option-card ${hasFiles ? 'has-files' : ''}`}>
      <div className="digital-option-header">
        <div className="flex-1">
          <div className="d-flex items-center gap-2 flex-wrap mb-1">
            <h4 className="digital-option-title mb-0">{title}</h4>
            {subBadge && <span className="ui-badge ui-badge-sm ui-badge-neutral">{subBadge}</span>}
            {hasFiles && (
              <span className="ui-badge ui-badge-sm ui-badge-purple font-bold">
                {optionFiles.length} file{optionFiles.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <span className="digital-option-dim">{dimension}</span>
        </div>

        {hasFiles && (
          <button
            type="button"
            className="digital-add-btn"
            onClick={() => handleUploadOptionAsset(selectedPackage.id, title, platform, isVideo)}
            title={`Add file to ${title}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add File
          </button>
        )}
      </div>

      {hasFiles ? (
        <div className="digital-files-grid mt-3">
          {optionFiles.map((file) => {
            const fileUrl = file.fileName ? `${baseUrl}/uploads/${file.fileName}` : null;
            const typeInfo = getFileTypeDetails(file.fileName);
            const ext = file.fileName ? file.fileName.split('.').pop().toLowerCase() : '';
            const isImg = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext);
            const isVid = ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext);
            const displayName = getCleanDisplayName(file);

            return (
              <div key={file.id} className="digital-file-item">
                <button
                  type="button"
                  className="digital-file-preview-box w-full text-left"
                  onClick={() => setViewedPdf(file)}
                >
                  {renderDesignThumbnail(isImg, isVid, fileUrl, displayName, typeInfo)}
                  <span className={`digital-approval-tag ${file.tlApproval === 'Approved' ? 'approved' : 'pending'}`}>
                    {file.tlApproval === 'Approved' ? 'Approved' : 'Pending'}
                  </span>
                </button>

                <div className="digital-file-meta">
                  <span className="digital-file-name" title={displayName}>{displayName}</span>
                  <div className="d-flex justify-between items-center mt-1">
                    <span className="digital-file-size">{file.fileSize || file.platform || 'File'}</span>
                    <button
                      type="button"
                      className="digital-file-delete-btn"
                      onClick={() => handleDeleteDesignFile(selectedPackage.id, file.id)}
                      title="Delete file"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            className="digital-add-tile"
            onClick={() => handleUploadOptionAsset(selectedPackage.id, title, platform, isVideo)}
            title="Add another file"
          >
            <div className="digital-add-tile-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <span className="text-xs font-bold text-muted mt-1">Add File</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="digital-empty-dropzone w-full text-left"
          onClick={() => handleUploadOptionAsset(selectedPackage.id, title, platform, isVideo)}
        >
          <div className="digital-dropzone-icon">
            {isVideo ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            )}
          </div>
          <span className="digital-dropzone-title">Add {dimension} File</span>
        </button>
      )}
    </div>
  );
}

function DesignPackageDetailsView({
  selectedPackage,
  selectedProject,
  setSelectedPackageId,
  isContentApproved,
  assetCount,
  isCountValid,
  currentUser,
  handleApproveTLAll,
  setViewedPdf,
  handleReportFeedback,
  feedbackTitle,
  setFeedbackTitle,
  feedbackDesc,
  setFeedbackDesc,
  feedbackSeverity,
  setFeedbackSeverity,
  figmaInput,
  setFigmaInput,
  handleSaveFigmaLink,
  figmaSaveMsg,
  designImages,
  handleUploadOptionAsset,
  handleDeleteDesignFile,
  handleUpdateDesignFile,
  uncategorizedFiles,
}) {
  return (
    <div>
      <div className="content-header mb-6">
        <div className="navigation-breadcrumbs">
          <button onClick={() => setSelectedPackageId(null)} className="back-btn">
            &larr; Back to {selectedProject || 'Projects'}
          </button>
          <span className="breadcrumb-separator">/</span>
          <span className="current-breadcrumb">{selectedPackage.name}</span>
        </div>

        <div className="d-flex justify-between items-center flex-wrap gap-4 mt-2">
          <div>
            <h1 className="dashboard-title">
              {selectedPackage.name} - Digital Design &amp; Assets
            </h1>
            <p className="dashboard-subtitle">
              {selectedPackage.project || 'Project'} · UI/UX Design Dashboard
            </p>
          </div>
          <div>
            {selectedPackage.designTlApproved ? (
              <span className="status-badge completed ui-badge-lg">
                Approved &amp; Sent to Developers
              </span>
            ) : (
              <span className="status-badge pending ui-badge-lg">
                Pending TL Approval ({assetCount} Asset{assetCount === 1 ? '' : 's'})
              </span>
            )}
          </div>
        </div>
      </div>

      {!isContentApproved && (
        <div className="testing-alert-banner mb-6">
          Content requirement doc is pending Content TL approval.
        </div>
      )}

      {/* Approved Content Requirements Card */}
      <div className="ui-card mb-8">
        <h3 className="ui-card-title mb-4">
          Approved Content Requirements
        </h3>
        <div className="grid-2col">
          {selectedPackage.contentFiles?.length > 0 ? (
            selectedPackage.contentFiles.map((req) => (
              <div key={req.id} className="pdf-container mb-0 justify-between">
                <div className="d-flex items-center gap-3 flex-grow-1 overflow-hidden">
                  <div className="pdf-icon-box" style={{ backgroundColor: req.tlApproval === 'Approved' ? '#2563eb' : '#94a3b8' }}>
                    <span className="pdf-label">{req.fileName ? getFileTypeDetails(req.fileName).label : 'DOC'}</span>
                  </div>
                  <div className="pdf-details">
                    <span className="pdf-name font-extrabold">{req.name}</span>
                    <span className={`pdf-size ${req.tlApproval === 'Approved' ? 'text-muted' : 'text-danger'}`}>
                      {req.tlApproval === 'Approved' ? `${stripTimestampPrefix(req.fileName)} · ${req.fileSize}` : 'Awaiting Approval'}
                    </span>
                  </div>
                </div>
                <div>
                  {req.tlApproval === 'Approved' && req.fileName ? (
                    <button type="button" className="view-btn" onClick={() => setViewedPdf(req)} title="View Document">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  ) : (
                    <span className="text-xs text-danger font-bold">Pending</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="no-data">No content docs yet.</p>
          )}
        </div>
      </div>

      {/* Feedback Section */}
      <div className="ui-card mb-8">
        <div className="mb-4">
          <h3 className="ui-card-title mb-1">
            Feedback &amp; Clarifications
          </h3>
        </div>
        <form
          onSubmit={(e) => handleReportFeedback(e, selectedPackage.id)}
          className="d-flex flex-wrap items-end gap-3 mb-5"
        >
          <div className="form-group flex-1">
            <label htmlFor="design-feedback-title" className="text-xs">Title</label>
            <input id="design-feedback-title" type="text" value={feedbackTitle} onChange={(e) => setFeedbackTitle(e.target.value)} placeholder="e.g. Missing labels" required />
          </div>
          <div className="form-group flex-1">
            <label htmlFor="design-feedback-desc" className="text-xs">Details</label>
            <input id="design-feedback-desc" type="text" value={feedbackDesc} onChange={(e) => setFeedbackDesc(e.target.value)} placeholder="What needs updating?" />
          </div>
          <div className="form-group">
            <label htmlFor="design-feedback-severity" className="text-xs">Priority</label>
            <select id="design-feedback-severity" value={feedbackSeverity} onChange={(e) => setFeedbackSeverity(e.target.value)}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <button type="submit" className="create-btn ui-btn-sm">
            Send Feedback
          </button>
        </form>
      </div>

      {/* Figma Link Card */}
      <div className="ui-card mb-8">
        <h3 className="ui-card-title mb-3">
          Figma Prototype Link (Optional)
        </h3>
        <div className="d-flex gap-3 items-center">
          <input
            type="text"
            value={figmaInput}
            onChange={(e) => setFigmaInput(e.target.value)}
            placeholder="e.g. https://www.figma.com/file/..."
            className="ui-input flex-grow-1"
          />
          <button
            type="button"
            onClick={() => handleSaveFigmaLink(selectedPackage.id)}
            className="ui-btn ui-btn-purple"
          >
            Save Link &rarr;
          </button>
        </div>
        {figmaSaveMsg && (
          <span className="text-sm text-emerald-700 font-extrabold mt-2 d-block">
            {figmaSaveMsg}
          </span>
        )}
        {selectedPackage.figmaLink && (
          <div className="mt-3 p-3 rounded-md bg-purple-50 border border-purple-200 d-flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900">
              Saved Figma Link:
            </span>
            <a
              href={selectedPackage.figmaLink}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-extrabold text-purple-700 underline"
            >
              Open Figma Canvas &rarr;
            </a>
          </div>
        )}
      </div>

      {selectedPackage.designFiles?.some(f => f.tlApproval === 'Rejected') && (
        <div className="qa-banner-card mb-6" style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5', padding: '1rem 1.25rem', borderRadius: '8px' }}>
          <h4 className="text-sm font-extrabold mb-1" style={{ color: '#991b1b' }}>
            REJECTED BY PROJECT MANAGER
          </h4>
          <p className="text-xs mb-0 font-medium" style={{ color: '#b91c1c' }}>
            Reason: {selectedPackage.designFiles.find(f => f.tlApproval === 'Rejected')?.rejectionReason || 'Designs require modification. Please update or re-upload assets.'}
          </p>
        </div>
      )}

      {/* DIGITAL DASHBOARD: UPLOAD IMAGES & ASSETS CONTAINER */}
      <div className="digital-dashboard-wrapper">
        <div className="digital-section-header d-flex justify-between items-center flex-wrap gap-4 mb-6">
          <div>
            <h2 className="section-title mb-0">
              Digital Dashboard Assets ({assetCount})
            </h2>
          </div>

          {(currentUser?.role?.includes('Project Manager') || currentUser?.role === 'CTO' || currentUser?.role === 'Admin') && !selectedPackage.designTlApproved && (
            <button
              type="button"
              onClick={() => handleApproveTLAll(selectedPackage.id)}
              className={`ui-btn ${isCountValid ? 'ui-btn-success' : 'ui-btn-secondary'}`}
              disabled={!isCountValid}
            >
              Approve (Project Manager)
            </button>
          )}
        </div>

        {/* CONTAINER 1: SITE IMAGES (WEB) */}
        <div className="digital-container-card ui-card mb-8 p-6">
          <div className="digital-container-title-bar mb-5">
            <div className="d-flex items-center gap-3">
              <div className="digital-container-icon web-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <div>
                <h3 className="ui-card-title mb-0">Site Images (Web)</h3>
              </div>
            </div>
          </div>

          <div className="digital-options-grid">
            {WEB_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.name}
                title={opt.name}
                dimension={opt.dimension}
                platform={opt.platform}
                designImages={designImages}
                selectedPackage={selectedPackage}
                handleUploadOptionAsset={handleUploadOptionAsset}
                handleDeleteDesignFile={handleDeleteDesignFile}
                setViewedPdf={setViewedPdf}
              />
            ))}
          </div>
        </div>

        {/* CONTAINER 2: APP IMAGES (MOBILE) */}
        <div className="digital-container-card ui-card mb-8 p-6">
          <div className="digital-container-title-bar mb-5">
            <div className="d-flex items-center gap-3">
              <div className="digital-container-icon mobile-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" />
                </svg>
              </div>
              <div>
                <h3 className="ui-card-title mb-0">App Images (Mobile)</h3>
              </div>
            </div>
          </div>

          <div className="digital-options-grid">
            {MOBILE_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.name}
                title={opt.name}
                dimension={opt.dimension}
                platform={opt.platform}
                designImages={designImages}
                selectedPackage={selectedPackage}
                handleUploadOptionAsset={handleUploadOptionAsset}
                handleDeleteDesignFile={handleDeleteDesignFile}
                setViewedPdf={setViewedPdf}
              />
            ))}
          </div>
        </div>

        {/* CONTAINER 3: PAST EVENT VIDEOS (LANDING PAGE) */}
        <div className="digital-container-card ui-card mb-8 p-6 border-l-4 border-l-rose-500">
          <div className="digital-container-title-bar mb-5">
            <div className="d-flex items-center gap-3">
              <div className="digital-container-icon video-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </div>
              <div>
                <h3 className="ui-card-title mb-0">Landing Page Video</h3>
              </div>
            </div>
          </div>

          <div className="digital-options-grid">
            {VIDEO_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.name}
                title={opt.name}
                dimension={opt.dimension}
                platform={opt.platform}
                isVideo={opt.isVideo}
                designImages={designImages}
                selectedPackage={selectedPackage}
                handleUploadOptionAsset={handleUploadOptionAsset}
                handleDeleteDesignFile={handleDeleteDesignFile}
                setViewedPdf={setViewedPdf}
              />
            ))}
          </div>
        </div>

        {/* UNCATEGORIZED / OTHER ASSETS */}
        {uncategorizedFiles.length > 0 && (
          <div className="digital-container-card ui-card mb-8 p-6 border-l-4 border-l-amber-500">
            <h3 className="ui-card-title mb-3">Other / Legacy Assets ({uncategorizedFiles.length})</h3>
            <div className="digital-files-grid">
              {uncategorizedFiles.map((file) => {
                const baseUrl = typeof window !== 'undefined' && window.API_BASE_URL ? window.API_BASE_URL : 'http://localhost:3001';
                const fileUrl = file.fileName ? `${baseUrl}/uploads/${file.fileName}` : null;
                const typeInfo = getFileTypeDetails(file.fileName);
                const ext = file.fileName ? file.fileName.split('.').pop().toLowerCase() : '';
                const isImg = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext);

                return (
                  <div key={file.id} className="digital-file-item">
                    <button
                      type="button"
                      className="digital-file-preview-box w-full text-left"
                      onClick={() => setViewedPdf(file)}
                    >
                      {isImg && fileUrl ? (
                        <img src={fileUrl} alt={file.name} className="digital-file-thumb" />
                      ) : (
                        <div className="digital-doc-thumb" style={{ backgroundColor: typeInfo.color }}>
                          <span>{typeInfo.label}</span>
                        </div>
                      )}
                    </button>
                    <div className="digital-file-details">
                      <span className="digital-file-name text-xs font-bold">{file.name || stripTimestampPrefix(file.fileName)}</span>
                      <div className="d-flex gap-1 mt-2">
                        <button type="button" className="view-btn py-1 px-2 text-xs flex-1" style={{ backgroundColor: '#0284c7', color: '#ffffff' }} onClick={() => handleUpdateDesignFile(selectedPackage.id, file.id, file.name, file.platform, false)}>Update</button>
                        <button type="button" className="view-btn build-file-delete-btn py-1 px-2 text-xs flex-1" onClick={() => handleDeleteDesignFile(selectedPackage.id, file.id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getDesignDashboardContent({
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
  renderDesignStatus,
  isContentApproved,
  assetCount,
  isCountValid,
  handleApproveTLAll,
  setViewedPdf,
  handleReportFeedback,
  feedbackTitle,
  setFeedbackTitle,
  feedbackDesc,
  setFeedbackDesc,
  feedbackSeverity,
  setFeedbackSeverity,
  figmaInput,
  setFigmaInput,
  handleSaveFigmaLink,
  figmaSaveMsg,
  designImages,
  handleUploadOptionAsset,
  handleDeleteDesignFile,
  handleUpdateDesignFile,
  uncategorizedFiles,
}) {
  const sharedContent = renderSharedDashboardNav({
    activeNav,
    selectedPackage,
    currentUser,
    defaultRole: 'Design Team',
    selectedProject,
    setSelectedProject,
    setSelectedPackageId,
    setActiveNav,
    triggerReload,
  });
  if (sharedContent) return sharedContent;

  if (selectedPackage) {
    return (
      <DesignPackageDetailsView
        selectedPackage={selectedPackage}
        selectedProject={selectedProject}
        setSelectedPackageId={setSelectedPackageId}
        isContentApproved={isContentApproved}
        assetCount={assetCount}
        isCountValid={isCountValid}
        currentUser={currentUser}
        handleApproveTLAll={handleApproveTLAll}
        setViewedPdf={setViewedPdf}
        handleReportFeedback={handleReportFeedback}
        feedbackTitle={feedbackTitle}
        setFeedbackTitle={setFeedbackTitle}
        feedbackDesc={feedbackDesc}
        setFeedbackDesc={setFeedbackDesc}
        feedbackSeverity={feedbackSeverity}
        setFeedbackSeverity={setFeedbackSeverity}
        figmaInput={figmaInput}
        setFigmaInput={setFigmaInput}
        handleSaveFigmaLink={handleSaveFigmaLink}
        figmaSaveMsg={figmaSaveMsg}
        designImages={designImages}
        handleUploadOptionAsset={handleUploadOptionAsset}
        handleDeleteDesignFile={handleDeleteDesignFile}
        handleUpdateDesignFile={handleUpdateDesignFile}
        uncategorizedFiles={uncategorizedFiles}
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
      renderStatus={renderDesignStatus}
      triggerReload={triggerReload}
      currentUser={currentUser}
    />
  );
}

function DesignDashboard({ currentUser, onLogout, onUpdateUser }) {
  const packagesState = usePackages('All Projects');
  const {
    activeNav, setActiveNav,
    selectedProject, setSelectedProject,
    setSelectedPackageId,
    selectedPackage, triggerReload,
    searchQuery,
  } = packagesState;

  const [viewedPdf, setViewedPdf] = useState(null);
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackDesc, setFeedbackDesc] = useState('');
  const [feedbackSeverity, setFeedbackSeverity] = useState('Medium');
  const [figmaInput, setFigmaInput] = useState('');
  const [figmaSaveMsg, setFigmaSaveMsg] = useState('');

  useEffect(() => {
    if (selectedPackage) {
      setFigmaInput(selectedPackage.figmaLink || '');
    }
  }, [selectedPackage]);

  const handleReportFeedback = async (e, packageId) => {
    e.preventDefault();
    if (feedbackTitle.trim() === '') return;
    try {
      await api.packages.createDesignFeedback(packageId, {
        title: feedbackTitle.trim(),
        description: feedbackDesc.trim(),
        severity: feedbackSeverity,
      });
      triggerReload();
      setFeedbackTitle('');
      setFeedbackDesc('');
    } catch { }
  };

  const handleSaveFigmaLink = async (packageId) => {
    if (!figmaInput || figmaInput.trim() === '') {
      alert('Please enter a valid Figma prototype link before saving.');
      return;
    }
    let formattedLink = figmaInput.trim();
    if (!formattedLink.startsWith('http://') && !formattedLink.startsWith('https://')) {
      formattedLink = 'https://' + formattedLink;
      setFigmaInput(formattedLink);
    }
    try {
      await api.packages.updateFigmaLink(packageId, formattedLink);
      setFigmaSaveMsg('Figma link saved!');
      setTimeout(() => setFigmaSaveMsg(''), 4000);
      triggerReload();
    } catch (err) {
      alert(err.message || 'Failed to save Figma link.');
    }
  };

  const hasUploadedContent = Boolean(
    selectedPackage?.contentUploaded ||
    selectedPackage?.contentFiles?.some((f) => Boolean(f.fileName || f.file_name))
  );
  const isContentApproved = Boolean(
    selectedPackage?.contentTlApproved ||
    selectedPackage?.contentAdminApproved ||
    hasUploadedContent
  );

  const handleUploadOptionAsset = (packageId, optionTitle, platform, isVideo = false) => {
    if (!isContentApproved) {
      alert('Requirement Failed: Content Team has not uploaded or approved requirements for this Task yet. Design assets cannot be uploaded until Content Team completes requirements.');
      return;
    }
    const acceptTypes = isVideo
      ? '.mp4,.webm,.mov,.avi,video/*'
      : '.jpeg,.jpg,.png,.webp,image/*';

    triggerFilePicker(acceptTypes, async (selectedFiles) => {
      const filesArray = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];

      for (const file of filesArray) {
        if (!validateAssetFile(file, isVideo)) {
          alert(`Invalid ${isVideo ? 'video' : 'image'} format for ${file.name}.`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        const uniqueAssetName = `${optionTitle} - ${file.name}`;
        formData.append('name', uniqueAssetName);
        formData.append('platform', platform);
        formData.append('uploadedBy', currentUser?.username || 'Design Member');
        if (figmaInput.trim() !== '') {
          formData.append('figmaLink', figmaInput.trim());
        }

        try {
          await api.packages.uploadDesignFile(packageId, formData);
        } catch (err) {
          alert(err.message || 'Upload error');
        }
      }
      triggerReload();
    }, true);
  };

  const handleApproveTLAll = async (packageId) => {
    const imageCount = selectedPackage?.designFiles?.length || 0;
    if (imageCount < 1) {
      alert('Requirement failed: At least 1 design asset is required before TL approval.');
      return;
    }
    try {
      await api.packages.approveDesignTLAll(packageId, currentUser?.username || 'Design TL');
      triggerReload();
    } catch (err) {
      alert(err.message || 'Failed to approve.');
    }
  };

  const handleDeleteDesignFile = async (packageId, fileId) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    try {
      await api.packages.deleteDesignFile(packageId, fileId);
      triggerReload();
    } catch (err) {
      alert(err.message || 'Failed to delete design file.');
    }
  };

  const handleUpdateDesignFile = (packageId, fileId, title, platform, isVideo = false) => {
    if (!isContentApproved) {
      alert('Requirement Failed: Content Team has not uploaded or approved requirements for this Task yet. Design assets cannot be updated until Content Team completes requirements.');
      return;
    }
    const acceptTypes = isVideo
      ? '.mp4,.webm,.mov,.avi,video/*'
      : '.jpeg,.jpg,.png,.webp,image/*';

    triggerFilePicker(acceptTypes, async (file) => {
      if (!validateAssetFile(file, isVideo)) {
        alert(`Invalid ${isVideo ? 'video' : 'image'} format for ${file.name}.`);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      const uniqueAssetName = title ? `${title} - ${file.name}` : file.name;
      formData.append('name', uniqueAssetName);
      if (platform) formData.append('platform', platform);
      formData.append('uploadedBy', currentUser?.username || 'Design Member');

      try {
        await api.packages.updateDesignFile(packageId, fileId, formData);
        triggerReload();
      } catch (err) {
        alert(err.message || 'Failed to update design asset.');
      }
    }, false);
  };

  const designImages = selectedPackage?.designFiles || [];
  const assetCount = designImages.length;
  const isCountValid = assetCount >= 1;

  const renderDesignStatus = (pkg) => {
    const imgCount = pkg?.designFiles?.length || 0;
    if (!pkg?.contentTlApproved && !pkg?.contentAdminApproved) {
      return {
        label: 'Awaiting Content TL Approval',
        badgeClass: 'pending',
        linkText: 'View Task Details',
        linkColor: '#64748b',
      };
    }
    let label = 'Pending Design Assets';
    let badgeClass = 'pending';
    if (pkg.designTlApproved) {
      label = 'Design Approved by TL';
      badgeClass = 'completed';
    } else if (imgCount > 0) {
      label = `${imgCount} Assets Uploaded`;
      badgeClass = 'approved';
    }
    return {
      label,
      badgeClass,
      linkText: 'Manage Digital Assets & Design Images',
      linkColor: '#d97706',
    };
  };

  const uncategorizedFiles = designImages.filter((f) => {
    if (!f.name) return true;
    const fName = f.name.trim();
    return !ALL_KNOWN_TITLES.some((t) =>
      fName === t ||
      fName.startsWith(`${t} -`) ||
      fName.startsWith(`${t} (`) ||
      fName.startsWith(`${t} #`)
    );
  });

  const content = getDesignDashboardContent({
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
    renderDesignStatus,
    isContentApproved,
    assetCount,
    isCountValid,
    handleApproveTLAll,
    setViewedPdf,
    handleReportFeedback,
    feedbackTitle,
    setFeedbackTitle,
    feedbackDesc,
    setFeedbackDesc,
    feedbackSeverity,
    setFeedbackSeverity,
    figmaInput,
    setFigmaInput,
    handleSaveFigmaLink,
    figmaSaveMsg,
    designImages,
    handleUploadOptionAsset,
    handleDeleteDesignFile,
    handleUpdateDesignFile,
    uncategorizedFiles,
  });

  return (
    <DashboardShell
      currentUser={currentUser}
      onLogout={onLogout}
      onUpdateUser={onUpdateUser}
      packagesState={packagesState}
      viewedPdf={viewedPdf}
      setViewedPdf={setViewedPdf}
    >
      {content}
    </DashboardShell>
  );
}

export default DesignDashboard;

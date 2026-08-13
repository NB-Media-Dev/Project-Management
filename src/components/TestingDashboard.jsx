import React, { useState } from 'react';
import DashboardShell from './DashboardShell';
import ProjectsView from './ProjectsView';
import { renderSharedDashboardNav } from './dashboardHelpers';
import { usePackages } from '../hooks/usePackages';
import { api } from '../services/api';
import { stripTimestampPrefix, getFullUrl } from '../utils/fileUtils';

function renderTestingStatus(pkg) {
  const isDevopsDeployed = Boolean(
    pkg.stagingUrl || pkg.demoUrl || pkg.devopsStagingUploaded || pkg.devopsDeployed
  );
  const openBugs = pkg.bugs ? pkg.bugs.filter((b) => !b.resolved).length : 0;
  const linkText = 'Perform Test Testing & Bug Reports';
  const linkColor = '#dc2626';

  if (pkg.deployed || pkg.finalAdminApproved) {
    return {
      label: 'Production Released',
      badgeClass: 'completed',
      linkText: 'View Task Testing Details',
      linkColor: '#059669',
    };
  }
  if (!isDevopsDeployed) {
    return {
      label: 'Awaiting DevOps Staging Link',
      badgeClass: 'pending',
      linkText: 'View Task Details',
      linkColor: '#64748b',
    };
  }
  if (openBugs > 0) {
    return { label: `${openBugs} Bugs Open`, badgeClass: 'pending', linkText, linkColor };
  }
  if (pkg.testingTlApproved) {
    return { label: 'Test Pass Approved', badgeClass: 'completed', linkText, linkColor };
  }
  return { label: 'Test Testing', badgeClass: 'in-progress', linkText, linkColor };
}

function getTestingBuildFilesList(selectedPackage) {
  if (!selectedPackage) return [];
  if (selectedPackage.devBuildFiles) return selectedPackage.devBuildFiles;
  if (selectedPackage.devBuildFile) return [selectedPackage.devBuildFile];
  return [];
}

function TestBannerCard({ devopsReceivedZip, hasStagingLink, openBugsCount, onApproveTesting, packageId }) {
  let bannerTitle = 'Test Testing Ready for Sign-Off (0 Open Bugs)';
  let bannerSubtitle = 'All tests pass with 0 unresolved bugs. Click the button to approve Test Pass and send to Admin for Final Production Approval!';
  if (!devopsReceivedZip) {
    bannerTitle = 'Test Approval Blocked: Awaiting DevOps Build Zip';
    bannerSubtitle = 'Developer team has not uploaded the build zip file to DevOps yet.';
  } else if (!hasStagingLink) {
    bannerTitle = 'Test Approval Blocked: Awaiting DevOps Staging Link';
    bannerSubtitle = 'DevOps team has not submitted the staging deployment link yet. Testing & Test Pass approval are locked.';
  } else if (openBugsCount > 0) {
    bannerTitle = `Test Approval Blocked: ${openBugsCount} Unresolved Bug(s)`;
    bannerSubtitle = 'All open bugs must be resolved before Test Pass can be approved and sent to Admin.';
  }

  const isBlocked = !devopsReceivedZip || !hasStagingLink || openBugsCount > 0;

  return (
    <div className="qa-banner-card mb-6 d-flex justify-between items-center flex-wrap gap-4">
      <div>
        <h3 className="qa-banner-title">{bannerTitle}</h3>
        <p className="qa-banner-subtitle">{bannerSubtitle}</p>
      </div>
      <button
        type="button"
        onClick={() => onApproveTesting(packageId)}
        disabled={isBlocked}
        className={`btn-approve-qa-main ${isBlocked ? 'disabled' : ''}`}
      >
        Approve Test Pass &amp; Send to Admin &rarr;
      </button>
    </div>
  );
}

function TestingPackageDetailsView({
  selectedPackage,
  selectedProject,
  setSelectedPackageId,
  openBugsCount,
  devopsReceivedZip,
  hasStagingLink,
  handleApproveTesting,
  getFullStagingUrl,
  devBuildFiles,
  setViewedPdf,
  handleOpenBugModal,
  canReportBug,
}) {
  let badgeClass = 'in-progress';
  let label = 'Under Test Testing';
  if (selectedPackage.deployed || selectedPackage.testingTlApproved) {
    badgeClass = 'completed';
    label = selectedPackage.deployed ? 'Live Production Deployed' : 'Test Pass Approved';
  } else if (openBugsCount > 0) {
    badgeClass = 'pending';
    label = `${openBugsCount} Bugs Pending Fix`;
  }

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
        <div className="d-flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="dashboard-title">{selectedPackage.name} -Testing</h1>
            <p className="dashboard-subtitle">{selectedPackage.project || 'Project'} · Testing Team</p>
          </div>
          <div>
            <span className={`status-badge ${badgeClass} ui-badge-lg`}>
              {label}
            </span>
          </div>
        </div>
      </div>

      {!selectedPackage.testingTlApproved ? (
        <TestBannerCard
          devopsReceivedZip={devopsReceivedZip}
          hasStagingLink={hasStagingLink}
          openBugsCount={openBugsCount}
          onApproveTesting={handleApproveTesting}
          packageId={selectedPackage.id}
        />
      ) : (
        <div className="qa-banner-card qa-approved-banner mb-6 d-flex justify-between items-center flex-wrap gap-3">
          <div>
            <h3 className="qa-banner-title text-emerald-900">
              Test Pass Approved by {selectedPackage.testingTlApprovedBy || 'Testing Team'}
            </h3>
            <p className="qa-banner-subtitle text-emerald-800">
              Testing is complete with 0 open bugs. Task sent to CTO for final production release sign-off.
            </p>
          </div>
          <span className="status-badge completed ui-badge-lg">
            Sent to CTO for Final Approval
          </span>
        </div>
      )}

      <div className="grid-2col mb-8">
        <section className="digital-section">
          <div className="d-flex justify-between items-center mb-4">
            <h2 className="section-title mb-0">Staging Environment &amp; Test Sign-Off</h2>
            {!selectedPackage.testingTlApproved ? (
              <button
                type="button"
                onClick={() => handleApproveTesting(selectedPackage.id)}
                className="btn-teal-pill"
              >
                Approve Test Pass &rarr;
              </button>
            ) : (
              <span className="status-badge completed">
                Test Approved
              </span>
            )}
          </div>

          <div className="testing-staging-card">
            <div className="testing-staging-title-group">
              <span className="testing-staging-label">STAGING SERVER URL</span>
              <div className="mt-1">
                {selectedPackage.stagingUrl ? (
                  <a href={getFullStagingUrl(selectedPackage.stagingUrl)} target="_blank" rel="noopener noreferrer" className="testing-staging-link">
                    {selectedPackage.stagingUrl}
                  </a>
                ) : (
                  <span className="testing-staging-none">Staging URL not yet provided by DevOps</span>
                )}
              </div>
            </div>

            <div>
              <span className="testing-staging-label">AVAILABLE CODE BUILD FILES</span>
              <div className="build-files-list">
                {devBuildFiles.map((build) => (
                  <div key={build.id} className="build-file-item">
                    <span className="build-file-item-name">{build.name || build.fileName}</span>
                    <button type="button" onClick={() => setViewedPdf(build)} className="view-btn">
                      View Build Info
                    </button>
                  </div>
                ))}
                {devBuildFiles.length === 0 && <span className="testing-staging-none">No dev build files attached</span>}
              </div>
            </div>
          </div>
        </section>

        <section className="digital-section">
          <div className="d-flex justify-between items-center mb-4">
            <h2 className="section-title mb-0">Bug Reports &amp; Links ({selectedPackage.bugs ? selectedPackage.bugs.length : 0})</h2>
            <button
              type="button"
              onClick={handleOpenBugModal}
              disabled={!canReportBug}
              className={`btn-purple-pill ${!canReportBug ? 'btn-disabled cursor-not-allowed opacity-60' : ''}`}
            >
              + Report Bug (Send Link)
            </button>
          </div>

          {!devopsReceivedZip && (
            <p className="text-sm font-medium text-slate-600 mb-5 leading-relaxed">
              DevOps team has not received the build .zip file from the Developer team yet.
            </p>
          )}
          {devopsReceivedZip && !hasStagingLink && (
            <p className="text-sm font-medium text-slate-600 mb-5 leading-relaxed">
              DevOps team received the build zip, but has not submitted the staging link yet.
            </p>
          )}
          {selectedPackage.bugs && selectedPackage.bugs.length > 0 ? (
            <div className="d-flex flex-col gap-3">
              {selectedPackage.bugs.map((bug) => (
                <div key={bug.id} className={`bug-card-item ${bug.resolved ? 'bug-card-resolved' : 'bug-card-unresolved'}`}>
                  <div className="bug-card-header">
                    <span className="bug-card-title">{bug.title}</span>
                    <span className={bug.resolved ? 'bug-badge-resolved' : 'bug-badge-pending'}>
                      {bug.resolved ? 'Fixed by Developer' : `Open (${bug.severity || 'Normal'})`}
                    </span>
                  </div>
                  <p className="bug-card-desc">{bug.description}</p>
                  {bug.bugUrl && (
                    <div className="testing-staging-card mb-3 p-3.5" style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                      <div className="testing-staging-title-group mb-0">
                        <div className="d-flex justify-between items-center mb-1">
                          <span className="testing-staging-label" style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Reported Bug URL
                          </span>
                          <span className="text-xs text-subtle" style={{ fontStyle: 'italic' }}>Click link to open &amp; inspect</span>
                        </div>
                        <div className="d-flex items-center justify-between gap-3 flex-wrap mt-2">
                          <a
                            href={getFullStagingUrl(bug.bugUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="testing-staging-link d-inline-flex items-center gap-2"
                            style={{ color: '#0284c7', fontWeight: '700', textDecoration: 'underline', fontSize: '0.925rem', wordBreak: 'break-all' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>{bug.bugUrl}</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, display: 'inline-block' }}>
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </a>
                          <a
                            href={getFullStagingUrl(bug.bugUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ui-btn ui-btn-outline ui-btn-xs d-inline-flex items-center gap-1"
                            style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Open Link &rarr;
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                  {bug.fileName && !bug.bugUrl && (
                    <div className="mb-2">
                      <span className="bug-card-file-link">
                         Attached Report: {stripTimestampPrefix(bug.fileName)} ({bug.fileSize || 'File'})
                      </span>
                    </div>
                  )}
                  <div className="bug-card-meta">
                    <span>Reported by: {bug.reportedBy || 'Test Tester'}</span>
                    <span className={`font-bold ${bug.resolved ? 'text-emerald-700' : 'text-amber-600'}`}>
                      {bug.resolved ? 'Fixed by Developer' : 'Awaiting Developer Fix'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm font-medium text-slate-600 mb-0 leading-relaxed">
              No bugs reported. Testing passing cleanly! Click "Approve Test Pass" above when ready.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function getTestingDashboardContent({
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
  renderTestingStatus,
  openBugsCount,
  devopsReceivedZip,
  hasStagingLink,
  handleApproveTesting,
  getFullStagingUrl,
  devBuildFiles,
  setViewedPdf,
  handleOpenBugModal,
  canReportBug,
}) {
  const sharedContent = renderSharedDashboardNav({
    activeNav,
    selectedPackage,
    currentUser,
    defaultRole: 'Testing Team',
    selectedProject,
    setSelectedProject,
    setSelectedPackageId,
    setActiveNav,
    triggerReload,
  });
  if (sharedContent) return sharedContent;

  if (selectedPackage) {
    return (
      <TestingPackageDetailsView
        selectedPackage={selectedPackage}
        selectedProject={selectedProject}
        setSelectedPackageId={setSelectedPackageId}
        openBugsCount={openBugsCount}
        devopsReceivedZip={devopsReceivedZip}
        hasStagingLink={hasStagingLink}
        handleApproveTesting={handleApproveTesting}
        getFullStagingUrl={getFullStagingUrl}
        devBuildFiles={devBuildFiles}
        setViewedPdf={setViewedPdf}
        handleOpenBugModal={handleOpenBugModal}
        canReportBug={canReportBug}
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
      renderStatus={renderTestingStatus}
      triggerReload={triggerReload}
      currentUser={currentUser}
    />
  );
}

function TestingDashboard({ currentUser, onLogout, onUpdateUser }) {
  const packagesState = usePackages('All Projects');
  const {
    activeNav, setActiveNav,
    selectedProject, setSelectedProject,
    setSelectedPackageId,
    selectedPackage, triggerReload,
    searchQuery,
  } = packagesState;

  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [bugTitle, setBugTitle] = useState('');
  const [bugDesc, setBugDesc] = useState('');
  const [bugSeverity, setBugSeverity] = useState('Normal');
  const [bugUrl, setBugUrl] = useState('');
  const [viewedPdf, setViewedPdf] = useState(null);

  const openBugsCount = selectedPackage?.bugs ? selectedPackage.bugs.filter((b) => !b.resolved).length : 0;
  const devBuildFilesList = getTestingBuildFilesList(selectedPackage);

  const devopsReceivedZip = Boolean(selectedPackage?.submittedToDevops) || (
    devBuildFilesList.some((f) => f.fileName)
  );
  const hasStagingLink = Boolean(selectedPackage?.stagingUrl || selectedPackage?.devopsStagingUploaded || selectedPackage?.demoUrl);
  const canReportBug = devopsReceivedZip && hasStagingLink;

  const handleOpenBugModal = () => {
    if (!devopsReceivedZip) {
      alert('Cannot report bugs yet: DevOps team has not received the build .zip file from the Developer team. Testing bug reports are restricted until DevOps receives the build zip file.');
      return;
    }
    if (!hasStagingLink) {
      alert('Cannot report bugs yet: DevOps team has not submitted the Staging Link for this Task. Testing is locked until DevOps deploys to staging.');
      return;
    }
    setIsBugModalOpen(true);
  };

  const handleReportBugSubmit = async (e, packageId) => {
    e.preventDefault();
    if (!devopsReceivedZip) {
      alert('Cannot report bugs yet: DevOps team has not received the build .zip file from the Developer team.');
      return;
    }
    if (!hasStagingLink) {
      alert('Cannot report bugs yet: DevOps team has not submitted the Staging Link for this Task.');
      return;
    }
    if (bugTitle.trim() === '') return;
    if (bugUrl.trim() === '') {
      alert('Please provide a valid bug report link URL before submitting.');
      return;
    }
    try {
      await api.packages.createBug(packageId, {
        title: bugTitle.trim(),
        description: bugDesc.trim(),
        severity: bugSeverity,
        bugUrl: bugUrl.trim(),
        reportedBy: currentUser?.username || 'Test Tester',
      });
      triggerReload();
      setIsBugModalOpen(false);
      setBugTitle('');
      setBugDesc('');
      setBugUrl('');
    } catch (err) {
      alert(err.message || 'Failed to submit bug report.');
    }
  };

  const handleApproveTesting = async (packageId) => {
    if (!devopsReceivedZip) {
      alert('Cannot approve Test Pass yet: DevOps team has not received the build .zip file from the Developer team.');
      return;
    }
    if (!hasStagingLink) {
      alert('Cannot approve Test Pass yet: DevOps team has not submitted the Staging Link for this Task.');
      return;
    }
    if (openBugsCount > 0) {
      alert(`Cannot approve Test Pass: There are ${openBugsCount} open bug(s). All bugs must be fixed and resolved by the Developer team before Test approval.`);
      return;
    }
    try {
      await api.packages.approveTestingTL(packageId, currentUser?.username || 'Test Tester');
      triggerReload();
    } catch (err) {
      alert(err.message || 'Failed to approve testing pass.');
    }
  };

  const getFullStagingUrl = (url) => getFullUrl(url);
  const devBuildFiles = devBuildFilesList;

  const content = getTestingDashboardContent({
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
    renderTestingStatus,
    openBugsCount,
    devopsReceivedZip,
    hasStagingLink,
    handleApproveTesting,
    getFullStagingUrl,
    devBuildFiles,
    setViewedPdf,
    handleOpenBugModal,
    canReportBug,
  });

  const bugModal = isBugModalOpen && (
    <dialog
      open
      className="modal-overlay"
      aria-modal="true"
    >
      <button
        type="button"
        className="modal-backdrop-btn"
        onClick={() => setIsBugModalOpen(false)}
        aria-label="Close bug report modal backdrop"
      />
      <div className="modal-content modal-content-sm">
        <h2 className="modal-title">Report Bug Link to Developer</h2>
        <form onSubmit={(e) => handleReportBugSubmit(e, selectedPackage.id)}>
          <div className="form-group mb-4">
            <label htmlFor="bug-title" className="ui-label">Bug Summary / Title</label>
            <input
              id="bug-title"
              type="text"
              value={bugTitle}
              onChange={(e) => setBugTitle(e.target.value)}
              placeholder="e.g. Navigation link broken on mobile view"
              required
              className="mt-1"
            />
          </div>
          <div className="form-group mb-4">
            <label htmlFor="bug-severity" className="ui-label">Severity</label>
            <select
              id="bug-severity"
              value={bugSeverity}
              onChange={(e) => setBugSeverity(e.target.value)}
              className="mt-1"
            >
              <option value="Critical">Critical (Blocker)</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div className="form-group mb-4">
            <label htmlFor="bug-url" className="ui-label">
              Bug / Report Link (URL) <span className="text-danger">*</span>
            </label>
            <input
              id="bug-url"
              type="url"
              value={bugUrl}
              onChange={(e) => setBugUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/... or bug report URL"
              required
              className="mt-1"
            />
          </div>
          <div className="form-group mb-6">
            <label htmlFor="bug-desc" className="ui-label">Description / Notes</label>
            <textarea
              id="bug-desc"
              rows="3"
              value={bugDesc}
              onChange={(e) => setBugDesc(e.target.value)}
              placeholder="Details about the reported issue..."
              className="mt-1"
            />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={() => setIsBugModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="ui-btn ui-btn-danger">
              Send Bug Link
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );

  return (
    <DashboardShell
      currentUser={currentUser}
      onLogout={onLogout}
      onUpdateUser={onUpdateUser}
      packagesState={packagesState}
      viewedPdf={viewedPdf}
      setViewedPdf={setViewedPdf}
      overlay={bugModal}
    >
      {content}
    </DashboardShell>
  );
}

export default TestingDashboard;
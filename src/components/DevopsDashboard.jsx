import React, { useState } from 'react';
import DashboardShell from './DashboardShell';
import BuildFileRow from './BuildFileRow';
import RoleHistoryView from './RoleHistoryView';
import FlowChartView from './FlowChartView';
import ProjectsView from './ProjectsView';
import { usePackages } from '../hooks/usePackages';
import { api } from '../services/api';
import { getFullUrl } from '../utils/fileUtils';
import { broadcastPopperBlast } from '../utils/confettiPopper';

function renderDevopsStatus(pkg) {
  const hasStaging = pkg.devopsStagingUploaded || Boolean(pkg.stagingUrl) || Boolean(pkg.demoUrl);
  if (!pkg.submittedToDevops && !hasStaging) {
    return {
      label: 'Awaiting Dev Build Zip',
      badgeClass: 'pending',
      linkText: 'View Task Details',
      linkColor: '#64748b',
    };
  }
  let label = 'Staging Ready';
  if (pkg.deployed) label = 'Live Production Deployed';
  else if (pkg.finalAdminApproved) label = 'Ready for Production';
  else if (hasStaging) label = 'Sent to Testing';

  let badgeClass = 'pending';
  if (pkg.deployed || pkg.finalAdminApproved) badgeClass = 'completed';
  else if (hasStaging) badgeClass = 'in-progress';

  return {
    label,
    badgeClass,
    linkText: 'Manage Staging & Release',
    linkColor: '#0284c7',
  };
}

function ReadyForProductionSection({ readyForProductionDeploy, handleProductionDeploy }) {
  return (
    <section className="mb-8">
      <div className="d-flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-extrabold text-main mb-1">
            Admin Approved — Ready for Production Deployment ({readyForProductionDeploy.length})
          </h2>
        </div>
        {readyForProductionDeploy.length > 0 && (
          <span className="ui-badge ui-badge-success ui-badge-lg font-bold">
            {readyForProductionDeploy.length} Action Required
          </span>
        )}
      </div>

      {readyForProductionDeploy.length > 0 ? (
        <div className="d-flex flex-col gap-4 mb-6">
          {readyForProductionDeploy.map((pkg) => (
            <div
              key={pkg.id}
              className="p-5 rounded-xl border-2 ui-card d-flex justify-between items-center flex-wrap gap-4"
              style={{ backgroundColor: '#ecfdf5', borderColor: '#10b981' }}
            >
              <div className="flex-1">
                <div className="d-flex items-center gap-3 mb-2 flex-wrap">
                  <span className="asset-size-tag text-xs uppercase">{pkg.project || 'Project'}</span>
                  <h3 className="text-lg font-extrabold text-emerald-950 mb-0">{pkg.name}</h3>
                  <span className="ui-badge ui-badge-sm ui-badge-success font-bold">
                    Admin Release Approved by {pkg.finalAdminApprovedBy || 'Admin'}
                  </span>
                </div>

                {(pkg.stagingUrl || pkg.demoUrl) && (
                  <div className="text-xs text-muted mb-1">
                    <strong>Staging Link:</strong>{' '}
                    <a href={pkg.stagingUrl || pkg.demoUrl} target="_blank" rel="noreferrer" className="text-sky-600 underline font-bold">
                      {pkg.stagingUrl || pkg.demoUrl}
                    </a>
                  </div>
                )}
                <div className="text-xs text-emerald-800 font-medium">
                  Test pass &amp; Admin approval completed. Authorised for final production deployment.
                </div>
              </div>

              <div className="d-flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleProductionDeploy(pkg.id)}
                  className="ui-btn ui-btn-success ui-btn-md text-white font-extrabold"
                  style={{ backgroundColor: '#059669', borderColor: '#047857', padding: '0.75rem 1.5rem', whiteSpace: 'nowrap' }}
                >
                  Deploy to Production &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-5 rounded-xl bg-subtle text-center border text-muted mb-6">
          No packages currently awaiting production deployment.
        </div>
      )}
    </section>
  );
}

function getDevopsBuildFilesList(selectedPackage) {
  if (!selectedPackage) return [];
  if (selectedPackage.devBuildFiles) return selectedPackage.devBuildFiles;
  if (selectedPackage.devBuilds) return selectedPackage.devBuilds;
  if (selectedPackage.devBuildFile) return [selectedPackage.devBuildFile];
  return [];
}

function DevopsPackageDetailsView({
  selectedPackage,
  selectedProject,
  setSelectedPackageId,
  currentUser,
  handleProductionDeploy,
  devBuildFilesList,
  setViewedPdf,
  hasDevZip,
  handleStagingSubmit,
  inputUrl,
  setInputUrl,
  inputProdUrl,
  setInputProdUrl,
  inputDesc,
  setInputDesc,
}) {
  let badgeClass = 'pending';
  let label = 'Staging Phase';
  const hasProductionLink = Boolean(selectedPackage?.demoUrl && selectedPackage.demoUrl.trim() !== '');

  if (selectedPackage.deployed || hasProductionLink) {
    badgeClass = 'completed';
    label = 'Live Production Deployed';
  } else if (selectedPackage.finalAdminApproved) {
    badgeClass = 'in-progress';
    label = 'Approved for Production';
  }

  const appBuilds = devBuildFilesList.filter((b) => b.platform === 'App' || b.platform === 'Mobile');
  const webBuilds = devBuildFilesList.filter((b) => b.platform !== 'App' && b.platform !== 'Mobile');

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
            <h1 className="dashboard-title">{selectedPackage.name} - DevOps Staging &amp; Deployment</h1>
            <p className="dashboard-subtitle">{selectedPackage.project || 'Project'} · DevOps Team</p>
          </div>
          <div className="d-flex items-center gap-3 flex-wrap">
            <span className={`status-badge ${badgeClass} ui-badge-lg`}>
              {label}
            </span>
            {/* POPPERS OPTION: APPEARS ONLY AFTER PRODUCTION LINK IS PROVIDED */}
            {hasProductionLink && (
              <button
                type="button"
                onClick={() => broadcastPopperBlast(selectedPackage.id, currentUser?.username, selectedPackage.name, selectedPackage.project)}
                className="ui-btn ui-btn-success ui-btn-md font-bold text-white shadow-sm d-flex items-center gap-2 animate-bounce-once"
                style={{ backgroundColor: '#059669', borderColor: '#047857' }}
                title="Trigger celebratory confetti popper blast!"
              >
                Blast Popper Celebration
              </button>
            )}
          </div>
        </div>
      </div>

      {(selectedPackage.finalPmApproved || selectedPackage.finalAdminApproved) && !selectedPackage.deployed && (
        <div className="p-5 rounded-xl bg-emerald-50 border-2 border-emerald-500 mb-6 d-flex justify-between items-center flex-wrap gap-4 shadow-sm">
          <div>
            <h3 className="text-lg font-extrabold text-emerald-800 mb-0">
              Project Manager Final Production Approval Granted
            </h3>
            <p className="text-sm font-semibold text-emerald-700 mt-1 mb-0">
              CTO sign-off and Project Manager final approval are complete. Save production URL below to go live.
            </p>
          </div>
        </div>
      )}

      {/* DEVELOPER BUILD ZIPS  REVIEW */}
      <div className="ui-card p-5 mb-6">
        <h3 className="ui-card-title mb-4">Developer Build Zip Overview ({devBuildFilesList.length})</h3>
        {devBuildFilesList.length > 0 ? (
          <div className="grid-2col gap-6">
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200">
              <div className="d-flex items-center justify-between mb-3">
                <span className="font-black text-sm text-emerald-900 uppercase">App Builds ({appBuilds.length})</span>
                <span className="ui-badge ui-badge-success text-xs">App Side</span>
              </div>
              {appBuilds.length > 0 ? (
                <div className="d-flex flex-col gap-2">
                  {appBuilds.map((build) => (
                    <BuildFileRow key={build.id} build={build} onView={setViewedPdf} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted font-medium mb-0">No App build zip uploaded.</p>
              )}
            </div>

            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200">
              <div className="d-flex items-center justify-between mb-3">
                <span className="font-black text-sm text-blue-900 uppercase">Web Builds ({webBuilds.length})</span>
                <span className="ui-badge ui-badge-primary text-xs">Web Side</span>
              </div>
              {webBuilds.length > 0 ? (
                <div className="d-flex flex-col gap-2">
                  {webBuilds.map((build) => (
                    <BuildFileRow key={build.id} build={build} onView={setViewedPdf} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted font-medium mb-0">No Web build zip uploaded.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted font-medium mb-0">No developer build zip uploaded yet.</p>
        )}
      </div>

      {/* TWO UPLOAD LINK OPTIONS (STAGING & PRODUCTION) */}
      <div className="digital-section mb-6">
        <h2 className="section-title">Deployment Links Management (Staging &amp; Production Live)</h2>
        {!hasDevZip && (
          <div className="alert-banner warning mb-4">
             Developer team has not uploaded/sent the build .zip file yet.
          </div>
        )}

        <form onSubmit={(e) => handleStagingSubmit(e, selectedPackage.id)} className="mb-6">
          <div className="grid-2col gap-4 mb-4">
            {/* LINK OPTION 1: STAGING URL */}
            <div className="form-group">
              <label htmlFor="devops-staging-url" className="ui-label font-bold text-sky-900">
                Staging URL (Internal QA &amp; Testing)
              </label>
              <input
                id="devops-staging-url"
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://staging.example.com/preview"
                required
                disabled={!hasDevZip}
                className="mt-1"
              />
            </div>

            {/* LINK OPTION 2: PRODUCTION LIVE URL */}
            <div className="form-group">
              <label htmlFor="devops-production-url" className="ui-label font-bold text-emerald-900">
                Production Live URL (Public Release)
              </label>
              <input
                id="devops-production-url"
                type="url"
                value={inputProdUrl}
                onChange={(e) => setInputProdUrl(e.target.value)}
                placeholder="https://app.example.com/live"
                disabled={!hasDevZip}
                className="mt-1"
              />
            </div>
          </div>

          <div className="form-group mb-4">
            <label htmlFor="devops-staging-notes" className="ui-label">Deployment Notes &amp; Server Info</label>
            <textarea
              id="devops-staging-notes"
              rows="2"
              value={inputDesc}
              onChange={(e) => setInputDesc(e.target.value)}
              placeholder="e.g. Deployed on AWS Cluster Port 8080 with SSL SSL certificate verified."
              disabled={!hasDevZip}
              className="mt-1"
            />
          </div>

          <button
            type="submit"
            disabled={!hasDevZip}
            className={`create-btn w-full justify-center ${!hasDevZip ? 'btn-disabled cursor-not-allowed opacity-60' : ''}`}
          >
            Save Deployment Links (Staging &amp; Production)
          </button>
        </form>

        {/* DISPLAY CURRENT STAGING & PRODUCTION LINKS */}
        <div className="grid-2col gap-4">
          <div className="ui-card p-4">
            <div className="d-flex justify-between items-center mb-2">
              <span className="text-xs font-extrabold text-sky-900 uppercase">Staging Preview Link:</span>
              <span className={`status-badge ${selectedPackage.stagingUrl ? 'completed' : 'pending'}`}>
                {selectedPackage.stagingUrl ? 'Dispatched to Testing' : 'Not Set'}
              </span>
            </div>
            {selectedPackage.stagingUrl ? (
              <a
                href={getFullUrl(selectedPackage.stagingUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="testing-staging-link d-inline-flex items-center gap-2 font-bold text-sky-600 underline"
                style={{ wordBreak: 'break-all' }}
              >
                <span>{selectedPackage.stagingUrl}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            ) : (
              <span className="text-xs text-muted">No Staging URL configured yet.</span>
            )}
          </div>

          <div className="ui-card p-4 border-emerald-200 bg-emerald-50/40">
            <div className="d-flex justify-between items-center mb-2">
              <span className="text-xs font-extrabold text-emerald-900 uppercase">Production Live Link:</span>
              <span className={`status-badge ${hasProductionLink ? 'approved' : 'pending'}`}>
                {hasProductionLink ? 'Live Active' : 'Awaiting Link'}
              </span>
            </div>
            {hasProductionLink ? (
              <div>
                <a
                  href={getFullUrl(selectedPackage.demoUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="testing-staging-link d-inline-flex items-center gap-2 font-bold text-emerald-700 underline"
                  style={{ wordBreak: 'break-all' }}
                >
                  <span>{selectedPackage.demoUrl}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => broadcastPopperBlast(selectedPackage.id, currentUser?.username, selectedPackage.name, selectedPackage.project)}
                    className="ui-btn ui-btn-success ui-btn-xs font-bold text-white"
                  >
                    Blast Popper Celebration
                  </button>
                </div>
              </div>
            ) : (
              <span className="text-xs text-muted">No Production Live URL configured yet.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getDevopsDashboardContent({
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
  renderDevopsStatus,
  handleProductionDeploy,
  devBuildFilesList,
  setViewedPdf,
  hasDevZip,
  handleStagingSubmit,
  inputUrl,
  setInputUrl,
  inputProdUrl,
  setInputProdUrl,
  inputDesc,
  setInputDesc,
}) {
  if (activeNav === 'flowchart' && !selectedPackage) {
    return (
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
  }

  if (activeNav === 'dashboard' && !selectedPackage) {
    const allPkgs = packagesState.packages || [];
    const readyForProductionDeploy = allPkgs.filter(
      (p) => p.finalAdminApproved && !p.deployed
    );

    return (
      <div>
        <ReadyForProductionSection
          readyForProductionDeploy={readyForProductionDeploy}
          handleProductionDeploy={handleProductionDeploy}
        />

        <RoleHistoryView
          defaultRole={currentUser?.role ?? 'Devops Team'}
          selectedProject="All Projects"
          currentUser={currentUser}
          onSelectPackage={(pkgId) => {
            setSelectedPackageId(pkgId);
            setActiveNav('projects');
          }}
        />
      </div>
    );
  }

  if (selectedPackage) {
    return (
      <DevopsPackageDetailsView
        selectedPackage={selectedPackage}
        selectedProject={selectedProject}
        setSelectedPackageId={setSelectedPackageId}
        currentUser={currentUser}
        handleProductionDeploy={handleProductionDeploy}
        devBuildFilesList={devBuildFilesList}
        setViewedPdf={setViewedPdf}
        hasDevZip={hasDevZip}
        handleStagingSubmit={handleStagingSubmit}
        inputUrl={inputUrl}
        setInputUrl={setInputUrl}
        inputProdUrl={inputProdUrl}
        setInputProdUrl={setInputProdUrl}
        inputDesc={inputDesc}
        setInputDesc={setInputDesc}
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
      renderStatus={renderDevopsStatus}
      triggerReload={triggerReload}
      currentUser={currentUser}
    />
  );
}

function DevopsDashboard({ currentUser, onLogout, onUpdateUser }) {
  const packagesState = usePackages('All Projects');
  const {
    activeNav, setActiveNav,
    selectedProject, setSelectedProject,
    setSelectedPackageId,
    selectedPackage, triggerReload,
    searchQuery,
  } = packagesState;

  const [inputUrl, setInputUrl] = useState('');
  const [inputProdUrl, setInputProdUrl] = useState('');
  const [inputDesc, setInputDesc] = useState('');
  const [viewedPdf, setViewedPdf] = useState(null);

  React.useEffect(() => {
    if (selectedPackage) {
      setInputUrl(selectedPackage.stagingUrl || '');
      setInputProdUrl(selectedPackage.demoUrl || '');
      setInputDesc(selectedPackage.demoDescription || '');
    }
  }, [selectedPackage]);

  const devBuildFilesList = getDevopsBuildFilesList(selectedPackage);

  const hasDevZip = Boolean(selectedPackage?.submittedToDevops) || (
    devBuildFilesList.some((f) => f.fileName)
  );

  const handleStagingSubmit = async (e, packageId) => {
    e.preventDefault();
    if (!hasDevZip) {
      alert('Cannot submit staging link: Developer team has not uploaded the build .zip file for this Task yet.');
      return;
    }
    if (inputUrl.trim() === '' && inputProdUrl.trim() === '') {
      alert('Please enter at least a Staging URL or Production Live URL.');
      return;
    }
    try {
      await api.packages.updateDevopsStaging(packageId, {
        stagingUrl: inputUrl.trim(),
        productionUrl: inputProdUrl.trim(),
        demoUrl: inputProdUrl.trim() || inputUrl.trim(),
        demoDescription: inputDesc.trim(),
      });
      if (inputProdUrl.trim()) {
        broadcastPopperBlast(packageId, currentUser?.username, selectedPackage?.name, selectedPackage?.project);
      }
      triggerReload();
    } catch (err) {
      alert(err.message || 'Failed to submit deployment links.');
    }
  };

  const handleProductionDeploy = async (packageId) => {
    try {
      const allPkgs = packagesState.packages || [];
      const targetPkg = allPkgs.find((p) => String(p.id) === String(packageId)) || selectedPackage;
      const demoUrlVal = targetPkg?.demoUrl || inputProdUrl || targetPkg?.stagingUrl || inputUrl || '';
      await api.packages.deploy(packageId, {
        demoUrl: demoUrlVal,
        demoDescription: 'Production Deployment Finalized',
      });
      broadcastPopperBlast(packageId, currentUser?.username, targetPkg?.name, targetPkg?.project);
      triggerReload();
    } catch (err) {
      alert(err.message || 'Failed to deploy to production.');
    }
  };

  const content = getDevopsDashboardContent({
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
    renderDevopsStatus,
    handleProductionDeploy,
    devBuildFilesList,
    setViewedPdf,
    hasDevZip,
    handleStagingSubmit,
    inputUrl,
    setInputUrl,
    inputProdUrl,
    setInputProdUrl,
    inputDesc,
    setInputDesc,
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

export default DevopsDashboard;

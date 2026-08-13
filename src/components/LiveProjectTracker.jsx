import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

function calcTrackerContentStage(pkg, isFinalApproved) {
  const uploadedContentFiles = pkg.contentFiles ? pkg.contentFiles.filter((f) => Boolean(f.fileName || f.file_name)) : [];
  const contentHasFiles = Boolean(pkg.contentUploaded || uploadedContentFiles.length > 0);
  const contentDone = isFinalApproved || Boolean(pkg.contentTlApproved || (uploadedContentFiles.length > 0 && uploadedContentFiles.every((f) => f.tlApproval === 'Approved')));

  let status = 'pending';
  let summary = 'Awaiting Content Upload';
  if (contentDone) {
    status = 'completed';
    summary = 'Requirements Approved';
  } else if (contentHasFiles) {
    status = 'in_progress';
    summary = `${uploadedContentFiles.length} Document(s) Uploaded - Pending TL`;
  }
  return { contentDone, status, summary, uploadedContentFiles };
}

function calcTrackerDesignStage(pkg, isFinalApproved, contentDone) {
  const designHasFiles = Boolean(pkg.designUploaded || (pkg.designFiles && pkg.designFiles.length > 0));
  const designDone = isFinalApproved || Boolean(pkg.designTlApproved);

  let status = 'pending';
  let summary = 'Awaiting Digital Design Upload';
  if (designDone) {
    status = 'completed';
    summary = 'Digital Assets Approved';
  } else if (designHasFiles) {
    status = 'in_progress';
    summary = `${pkg.designFiles?.length || 0} Asset(s) Uploaded - Pending TL`;
  } else if (contentDone) {
    status = 'ready';
  }
  return { designDone, status, summary };
}

function calcTrackerDevStage(pkg, isFinalApproved, designDone) {
  const devHasBuilds = Boolean(
    (pkg.devBuildFiles && pkg.devBuildFiles.length > 0) ||
    (pkg.devBuilds && pkg.devBuilds.length > 0) ||
    pkg.submittedToDevops
  );
  const devDone = isFinalApproved || devHasBuilds;

  let status = 'pending';
  let summary = 'Awaiting Code Integration & ZIP Upload';
  if (devDone) {
    status = 'completed';
    if (isFinalApproved) {
      summary = 'Code Build Approved & Released';
    } else {
      const buildCount = pkg.devBuildFiles?.length || pkg.devBuilds?.length || 1;
      summary = `${buildCount} Build(s) Released`;
    }
  } else if (designDone) {
    status = 'ready';
  }
  return { devDone, status, summary };
}

function calcTrackerDevopsStage(pkg, isFinalApproved, devDone) {
  const devopsDone = isFinalApproved || Boolean(pkg.stagingUrl || pkg.devopsStagingUploaded || pkg.devopsDeployed);

  let status = 'pending';
  let summary = 'Awaiting Environment Deployment';
  if (devopsDone) {
    status = 'completed';
    summary = `Live on Staging: ${pkg.stagingUrl || 'Deployed'}`;
  } else if (devDone) {
    status = 'ready';
  }
  return { devopsDone, status, summary };
}

function calcTrackerTestingStage(pkg, isFinalApproved, devopsDone) {
  const unresolvedBugs = pkg.bugs ? pkg.bugs.filter((b) => !b.resolved).length : 0;
  const testingDone = isFinalApproved || Boolean(pkg.testingTlApproved || (devopsDone && unresolvedBugs === 0 && (pkg.bugs && pkg.bugs.length > 0)));

  let status = 'pending';
  let summary = 'Awaiting Verification';
  if (unresolvedBugs > 0 && !isFinalApproved) {
    status = 'action_needed';
    summary = `${unresolvedBugs} Unresolved Bug(s)`;
  } else if (testingDone) {
    status = 'completed';
    summary = 'All Tests Passed';
  } else if (devopsDone) {
    status = 'ready';
  }
  return { testingDone, status, summary };
}

function LiveProjectTracker({ selectedPackageId: propPackageId, _currentUser, onSelectPackage, _viewedPdf, _setViewedPdf }) {
  const [packages, setPackages] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState(propPackageId || null);

  const hasSelectedRef = useRef(false);

  const fetchPackagesData = useCallback(async () => {
    try {
      const data = await api.packages.getAll();
      setPackages(data || []);
      if (data && data.length > 0 && !hasSelectedRef.current) {
        const firstActive = data.find((p) => !p.adminApproved) || data[0];
        setSelectedPackageId(firstActive.id);
        hasSelectedRef.current = true;
      }
    } catch (err) {
      console.error('Failed to fetch packages for Live Tracker:', err);
    }
  }, []);

  useEffect(() => {
    fetchPackagesData();
  }, [fetchPackagesData]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'pm_packages_v4') {
        fetchPackagesData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchPackagesData]);

  const isPackageCompleted = (p) => Boolean(p.adminApproved || p.finalAdminApproved || p.final_admin_approved || p.deployed);
  const activePackages = packages.filter((p) => !isPackageCompleted(p));
  const completedPackages = packages.filter((p) => isPackageCompleted(p));

  const currentPackage = packages.find((p) => p.id === selectedPackageId) || activePackages[0] || packages[0];

  const getStageDetails = (pkg) => {
    if (!pkg) return [];
    const isFinalApproved = isPackageCompleted(pkg);

    const cRes = calcTrackerContentStage(pkg, isFinalApproved);
    const dRes = calcTrackerDesignStage(pkg, isFinalApproved, cRes.contentDone);
    const devRes = calcTrackerDevStage(pkg, isFinalApproved, dRes.designDone);
    const devopsRes = calcTrackerDevopsStage(pkg, isFinalApproved, devRes.devDone);
    const testRes = calcTrackerTestingStage(pkg, isFinalApproved, devopsRes.devopsDone);

    const adminDone = isFinalApproved;
    let adminStatus = 'pending';
    let adminSummary = 'Pending Final Admin Sign-off';
    if (adminDone) {
      adminStatus = 'completed';
      adminSummary = 'Flow Chart Complete & Released to Production';
    } else if (testRes.testingDone) {
      adminStatus = 'ready';
    }

    return [
      {
        id: 'content',
        name: '1. Content Requirements',
        role: 'Content Team',
        svgType: 'doc',
        status: cRes.status,
        summary: cRes.summary,
        itemsCount: cRes.uploadedContentFiles.length,
        files: cRes.uploadedContentFiles,
      },
      {
        id: 'design',
        name: '2. Site & App Assets',
        role: 'Design Team',
        svgType: 'design',
        status: dRes.status,
        summary: dRes.summary,
        itemsCount: pkg.designFiles?.length || 0,
        files: pkg.designFiles || [],
      },
      {
        id: 'developer',
        name: '3. Developer Build',
        role: 'Developer Team',
        svgType: 'code',
        status: devRes.status,
        summary: devRes.summary,
        itemsCount: pkg.devBuildFiles?.length || pkg.devBuilds?.length || 0,
        files: pkg.devBuildFiles || pkg.devBuilds || [],
      },
      {
        id: 'devops',
        name: '4. Staging Deployment',
        role: 'DevOps Team',
        svgType: 'server',
        status: devopsRes.status,
        summary: devopsRes.summary,
        itemsCount: pkg.stagingUrl ? 1 : 0,
        demoUrl: pkg.stagingUrl || '',
      },
      {
        id: 'testing',
        name: '5. Test & Bug Verification',
        role: 'Testing Team',
        svgType: 'bug',
        status: testRes.status,
        summary: testRes.summary,
        itemsCount: pkg.bugs?.length || 0,
        bugs: pkg.bugs || [],
      },
      {
        id: 'admin',
        name: '6. Production Deployment',
        role: 'Admin / Product Lead',
        svgType: 'rocket',
        status: adminStatus,
        summary: adminSummary,
        itemsCount: adminDone ? 1 : 0,
      },
    ];
  };

  const renderStageSvgIcon = (svgType) => {
    switch (svgType) {
      case 'doc':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        );
      case 'design':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        );
      case 'code':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        );
      case 'server':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
            <line x1="6" y1="6" x2="6.01" y2="6" strokeWidth="3" />
            <line x1="6" y1="18" x2="6.01" y2="18" strokeWidth="3" />
          </svg>
        );
      case 'test':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" />
          </svg>
        );
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        );
    }
  };

  const stages = getStageDetails(currentPackage);

  return (
    <div className="live-tracker-wrapper mb-8">
      {/* HEADER & MULTI-PROJECT SWITCHER */}
      <div className="ui-card p-6 mb-6 background-gradient-subtle border-l-4 border-l-purple-600">
        <div className="d-flex justify-between items-center flex-wrap gap-4 mb-4">
          <div className="d-flex items-center gap-3">
            <div className="live-tracker-pulse-badge">
              <span className="pulse-dot" />
              <span className="text-xs font-black uppercase text-purple-900 tracking-wider">LIVE WORKFLOW TRACKER</span>
            </div>
            {currentPackage && (
              <span className="ui-badge ui-badge-purple font-bold">
                {currentPackage.project || 'Project'}
              </span>
            )}
          </div>

          {/* PROJECT / PACKAGE SWITCHER DROPDOWN */}
          {packages.length > 0 && (
            <div className="d-flex items-center gap-2">
              <label htmlFor="live-tracker-package-select" className="text-xs font-extrabold text-muted mb-0">Switch Active Package:</label>
              <select
                id="live-tracker-package-select"
                value={selectedPackageId || ''}
                onChange={(e) => setSelectedPackageId(Number(e.target.value))}
                className="ui-input py-1 px-3 text-xs font-bold bg-white cursor-pointer"
                style={{ minWidth: '220px' }}
              >
                {activePackages.length > 0 && (
                  <optgroup label="Active Production Packages">
                    {activePackages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        [Active] {pkg.name} ({pkg.project})
                      </option>
                    ))}
                  </optgroup>
                )}
                {completedPackages.length > 0 && (
                  <optgroup label="Completed Packages (History)">
                    {completedPackages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        [Completed] {pkg.name} ({pkg.project})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          )}
        </div>

        {currentPackage ? (
          <div>
            <div className="d-flex justify-between items-center flex-wrap gap-3">
              <div>
                <h2 className="text-2xl font-black text-main mb-1 d-flex items-center gap-2 flex-wrap">
                  {currentPackage.name}
                  {currentPackage.dueDate && (
                    <span className="ui-badge ui-badge-sm font-extrabold" style={{ backgroundColor: '#fef9c3', color: '#854d0e', borderColor: '#fde047' }}>
                      Fixed Due: {currentPackage.dueDate}
                    </span>
                  )}
                  {isPackageCompleted(currentPackage) && (
                    <span className="ui-badge ui-badge-success text-xs">Flow Chart Completed &amp; Released</span>
                  )}
                </h2>
                <p className="text-xs text-muted mb-0 font-medium">
                  Project: <strong>{currentPackage.project}</strong>
                </p>
              </div>

              {onSelectPackage && (
                <button
                  type="button"
                  onClick={() => onSelectPackage(currentPackage.id)}
                  className="ui-btn ui-btn-purple ui-btn-sm"
                >
                  Manage Package Details &rarr;
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted mb-0">No active packages found in pipeline.</p>
        )}
      </div>

      {/* REAL-TIME FLOWCHART STEPPER PIPELINE */}
      {currentPackage && (
        <div className="ui-card p-6 mb-6">
          <div className="d-flex justify-between items-center mb-6 border-bottom pb-4">
            <div>
              <h3 className="ui-card-title mb-0">Real-Time Project Flow Chart</h3>
              <p className="text-xs text-muted mb-0">Live status progression across Content, Design, Development, DevOps, Testing, and Production</p>
            </div>
            <div className="d-flex gap-3 text-xs font-bold">
              <span className="d-flex items-center gap-1 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Completed
              </span>
              <span className="d-flex items-center gap-1 text-purple-700">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block animate-pulse" /> Active Stage
              </span>
              <span className="d-flex items-center gap-1 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> Pending
              </span>
            </div>
          </div>

          <div className="flowchart-pipeline-container">
            {stages.map((stage, idx) => {
              const isLast = idx === stages.length - 1;
              let stepClass = 'pending';
              if (stage.status === 'completed') stepClass = 'completed';
              else if (stage.status === 'in_progress' || stage.status === 'ready') stepClass = 'active';
              else if (stage.status === 'action_needed') stepClass = 'action-needed';

              return (
                <React.Fragment key={stage.id}>
                  <div className={`flowchart-node ${stepClass}`}>
                    <div className="flowchart-node-header">
                      <div className="flowchart-node-icon">
                        {stage.status === 'completed' ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          renderStageSvgIcon(stage.svgType)
                        )}
                      </div>
                      <span className="flowchart-role-badge">{stage.role}</span>
                    </div>

                    <div className="flowchart-node-body">
                      <h4 className="flowchart-stage-name">{stage.name}</h4>
                      <p className="flowchart-stage-summary">{stage.summary}</p>
                    </div>

                    <div className="flowchart-node-footer">
                      <span className={`flowchart-status-tag ${stepClass}`}>
                        {(() => {
                          if (stage.status === 'completed') return 'Completed';
                          if (stage.status === 'in_progress') return 'In Progress';
                          if (stage.status === 'ready') return 'Ready for Team';
                          if (stage.status === 'action_needed') return 'Action Required';
                          return 'Pending';
                        })()}
                      </span>
                    </div>
                  </div>

                  {!isLast && (
                    <div className={`flowchart-connector ${stages[idx + 1].status !== 'pending' ? 'active-line' : ''}`}>
                      <div className="connector-arrow">&rarr;</div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveProjectTracker;

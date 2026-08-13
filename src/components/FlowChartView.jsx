import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import DocumentViewerModal from './DocumentViewerModal';

const isPackageCompleted = (pkg) =>
  Boolean(pkg && (pkg.adminApproved || pkg.finalAdminApproved || pkg.final_admin_approved || pkg.deployed));

function getContentStage(pkg, finalApproved) {
  const uploadedContentFiles = pkg.contentFiles ? pkg.contentFiles.filter((f) => Boolean(f.fileName || f.file_name)) : [];
  const hasContentFiles = Boolean(pkg.contentUploaded || uploadedContentFiles.length > 0);
  const contentApproved = finalApproved || Boolean(pkg.contentTlApproved || (uploadedContentFiles.length > 0 && uploadedContentFiles.every((f) => f.tlApproval === 'Approved')));

  let status = 'pending';
  let statusText = 'Awaiting Content';
  if (contentApproved) {
    status = 'completed';
    statusText = 'Requirements Approved';
  } else if (hasContentFiles) {
    status = 'in_progress';
    statusText = 'Uploaded - Pending Approval';
  }
  return { isDone: contentApproved, status, statusText, files: uploadedContentFiles, description: pkg.description || pkg.reqText || '' };
}

function getDigitalStage(pkg, finalApproved, contentApproved) {
  const files = pkg.designFiles ? pkg.designFiles.filter((f) => Boolean(f.fileName || f.file_name)) : [];
  const isDone = finalApproved || Boolean(pkg.designTlApproved);
  const hasFiles = Boolean(pkg.designUploaded || files.length > 0);
  const figmaLink = pkg.figmaLink || '';

  if (isDone) {
    return { isDone: true, status: 'completed', statusText: 'Digital Assets Approved', files, figmaLink };
  }
  if (hasFiles) {
    return { isDone: false, status: 'in_progress', statusText: 'Uploaded - Pending Approval', files, figmaLink };
  }
  return { isDone: false, status: contentApproved ? 'ready' : 'pending', statusText: 'Awaiting Assets', files, figmaLink };
}

function getDevStage(pkg, finalApproved, designApproved) {
  const rawFiles = pkg.devBuildFiles || pkg.devBuilds || [];
  const uploadedDevBuilds = rawFiles.filter((f) => Boolean(f.fileName || f.file_name));
  const hasDevBuilds = Boolean(uploadedDevBuilds.length > 0 || pkg.submittedToDevops);
  const devApproved = finalApproved || hasDevBuilds;

  let status = 'pending';
  let statusText = 'Awaiting Integration';
  if (devApproved) {
    status = 'completed';
    statusText = 'Submitted to DevOps';
  } else if (hasDevBuilds) {
    statusText = 'Build Zip Uploaded';
  } else if (designApproved) {
    status = 'in_progress';
  }
  return { isDone: devApproved, status, statusText, files: uploadedDevBuilds, submitted: pkg.submittedToDevops };
}

function getDevopsStage(pkg, finalApproved, devApproved) {
  const stagingUrl = pkg.stagingUrl || pkg.staging_url || '';
  const demoUrl = pkg.demoUrl || pkg.demo_url || '';
  const devopsDeployed = finalApproved || Boolean(stagingUrl || demoUrl || pkg.devopsStagingUploaded || pkg.devopsDeployed);

  let status = 'pending';
  let statusText = 'Awaiting Deployment';
  if (devopsDeployed) {
    status = 'completed';
    statusText = 'Deployment Links Active';
  } else if (devApproved) {
    status = 'ready';
    statusText = 'Ready for Deployment';
  }
  return { isDone: devopsDeployed, status, statusText, devopsDeployed, stagingUrl, demoUrl };
}

function getTestingStage(pkg, finalApproved, devopsDeployed) {
  const unresolvedBugs = pkg.bugs ? pkg.bugs.filter((b) => !b.resolved).length : 0;
  const qaApproved = finalApproved || Boolean(pkg.testingTlApproved || (devopsDeployed && unresolvedBugs === 0 && (pkg.bugs && pkg.bugs.length > 0)));

  let status = 'pending';
  let statusText = 'Awaiting QA';
  if (qaApproved) {
    status = 'completed';
    statusText = 'Test Pass Approved';
  } else if (devopsDeployed) {
    status = 'in_progress';
    statusText = 'Ready for Testing';
  }
  return { isDone: qaApproved, status, statusText, unresolvedBugs };
}

function getProdStage(pkg, finalApproved, qaApproved) {
  const demoUrl = pkg?.demoUrl || pkg?.demo_url || '';
  let status = 'pending';
  let statusText = 'Awaiting Live Release';
  if (finalApproved) {
    status = 'completed';
    statusText = 'Live Deployed & Approved';
  } else if (qaApproved) {
    status = 'in_progress';
    statusText = 'Pending Final Approval';
  }
  return { isDone: finalApproved, status, statusText, demoUrl };
}

const getStageDetails = (pkg) => {
  if (!pkg) return null;
  const finalApproved = isPackageCompleted(pkg);
  const content = getContentStage(pkg, finalApproved);
  const digital = getDigitalStage(pkg, finalApproved, content.isDone);
  const developer = getDevStage(pkg, finalApproved, digital.isDone);
  const devops = getDevopsStage(pkg, finalApproved, developer.isDone);
  const testing = getTestingStage(pkg, finalApproved, devops.devopsDeployed);
  const production = getProdStage(pkg, finalApproved, testing.isDone);

  return {
    content,
    digital,
    developer,
    devops: {
      isDone: devops.isDone,
      status: devops.status,
      statusText: devops.statusText,
      stagingUrl: devops.stagingUrl,
      demoUrl: devops.demoUrl,
    },
    testing: {
      isDone: testing.isDone,
      status: testing.status,
      statusText: testing.statusText,
      bugsCount: pkg.bugs?.length || 0,
      unresolvedBugs: testing.unresolvedBugs,
    },
    production,
  };
};

function filterFlowPackages(packages, selectedProject, searchQuery) {
  return packages.filter((pkg) => {
    const matchesProject =
      !selectedProject ||
      selectedProject === 'All Projects' ||
      selectedProject === 'All' ||
      (pkg.project && pkg.project.trim().toLowerCase() === selectedProject.trim().toLowerCase());

    const matchesSearch =
      !searchQuery ||
      Boolean(pkg?.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      Boolean(pkg?.project?.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesProject && matchesSearch;
  });
}

function FlowChartHeaderControls({
  handleProjectFilterChange,
  packages,
  activePackage,
  setSelectedPackageId,
}) {
  if (!packages || packages.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="text-xs font-black uppercase text-purple-950 tracking-wider mb-3 text-left">
        Select Task Flowchart:
      </div>

      {/* SEPARATE STANDALONE TASK BOX CARDS */}
      <div className="d-flex items-center gap-4 flex-wrap">
        {packages.map((pkg) => {
          const isSelected = activePackage?.id === pkg.id;
          const isCompleted = isPackageCompleted(pkg);

          return (
            <div
              key={`standalone-task-box-${pkg.id}`}
              onClick={() => {
                if (pkg.project) {
                  handleProjectFilterChange(pkg.project);
                }
                setSelectedPackageId(pkg.id);
              }}
              className={`ui-card p-4 rounded-2xl border transition-all cursor-pointer text-left min-w-[240px] flex-1 max-w-[320px] ${
                isSelected
                  ? 'border-purple-600 bg-purple-50/90 shadow-md ring-2 ring-purple-600/30 scale-[1.02]'
                  : 'border-slate-200 bg-white hover:border-purple-300 hover:shadow-xs'
              }`}
              role="button"
              tabIndex={0}
            >
              {/* HEADER BADGE: PROJECT NAME */}
              <div className="d-flex justify-between items-center mb-2">
                <span className="ui-badge ui-badge-purple text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                  {pkg.project || 'Project'}
                </span>
                <span className={`status-badge text-xs py-0.5 px-2 ${isCompleted ? 'approved' : 'pending'}`}>
                  {isCompleted ? 'Completed' : 'In Progress'}
                </span>
              </div>

              {/* TASK TITLE WITH ICON */}
              <div className="d-flex items-center gap-3 mt-1">
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-800'}`}>
                  {isCompleted ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 2 7 12 12 22 7 12 2" />
                      <polyline points="2 17 12 22 22 17" />
                      <polyline points="2 12 17 22 12" />
                    </svg>
                  )}
                </div>

                <div className="overflow-hidden flex-1">
                  <div className="font-black text-base text-slate-900 truncate" title={pkg.name}>
                    {pkg.name}
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    Click to view flowchart &rarr;
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlowFileItem({ file, isApproved, defaultLabel, setViewedPdf }) {
  const fileName = file.name || (file.fileName ? file.fileName.substring(file.fileName.indexOf('-') + 1) : defaultLabel);
  const senderName = file.uploadedBy || file.uploaded_by || file.uploadedUser || null;

  const handleFileClick = (e) => {
    e.stopPropagation();
    if (setViewedPdf) {
      setViewedPdf(file);
      return;
    }
    const baseUrl = typeof window !== 'undefined' && window.API_BASE_URL ? window.API_BASE_URL : 'http://localhost:3001';
    const targetFile = file.fileName || file.name || file.url;
    if (targetFile) {
      const fileUrl = targetFile.startsWith('http') ? targetFile : `${baseUrl}/uploads/${targetFile}`;
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <div
      onClick={handleFileClick}
      className="d-flex items-center gap-2 p-2.5 rounded-lg bg-white border mb-2 shadow-2xs text-left cursor-pointer hover:border-emerald-400 transition-all"
      title={`Click to view ${fileName}`}
      role="button"
      tabIndex={0}
    >
      {isApproved ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="flex-shrink-0" title="Approved">
          <circle cx="12" cy="12" r="10" fill="#10b981" />
          <path d="M8 12.5l2.8 2.8 5.2-5.3" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="flex-shrink-0" title="Uploaded (Pending Approval)">
          <circle cx="12" cy="12" r="9" stroke="#10b981" strokeWidth="2.2" fill="none" />
        </svg>
      )}

      <div className="overflow-hidden flex-1">
        <span
          className="text-sm font-extrabold truncate block hover:underline"
          style={{ color: isApproved ? '#10b981' : '#1e293b' }}
        >
          {fileName}
        </span>
        {senderName && (
          <div className="text-xs font-semibold text-purple-700 truncate mt-0.5" title={`Sender: ${senderName}`}>
            Sender: {senderName}
          </div>
        )}
        <div className="text-xs text-muted d-flex items-center justify-between gap-2 mt-0.5">
          <span>{file.fileSize || defaultLabel}</span>
          <span className={`status-badge text-xs py-0.5 px-2 ${isApproved ? 'approved' : 'pending'}`}>
            {isApproved ? 'Approved' : 'Uploaded'}
          </span>
        </div>
      </div>
    </div>
  );
}

function FlowChartTeamColumns({ stages, activePackage, setViewedPdf }) {
  // Digital files separation
  const digitalFiles = stages.digital.files || [];
  const appDesignFiles = digitalFiles.filter(
    (f) => f.platform === 'App' || f.platform === 'Mobile'
  );
  const webDesignFiles = digitalFiles.filter(
    (f) => f.platform !== 'App' && f.platform !== 'Mobile'
  );

  // Developer build files separation
  const devFiles = stages.developer.files || [];
  const appDevFiles = devFiles.filter(
    (f) => f.platform === 'App' || f.platform === 'Mobile'
  );
  const webDevFiles = devFiles.filter(
    (f) => f.platform !== 'App' && f.platform !== 'Mobile'
  );

  return (
    <div className="flowchart-teams-row">
      {/* COLUMN 1: CONTENT TEAM */}
      <div className="flowchart-team-column">
        <div className={`flowchart-header-box ${stages.content.isDone ? 'completed' : ''}`}>
          Content Team
        </div>

        <div className={`flowchart-task-big-box ${stages.content.status}`}>
          <div>
            {stages.content.files.length > 0 ? (
              stages.content.files.map((file, i) => {
                const isApproved = Boolean(
                  file.tlApproval === 'Approved' ||
                  stages.content.isDone ||
                  activePackage.contentTlApproved ||
                  activePackage.adminApproved ||
                  activePackage.finalAdminApproved
                );
                const key = file.id ? `cfile-${file.id}` : `cfile-${file.name || 'item'}-${i}`;
                return (
                  <FlowFileItem
                    key={key}
                    file={file}
                    isApproved={isApproved}
                    defaultLabel="Doc File"
                    setViewedPdf={setViewedPdf}
                  />
                );
              })
            ) : (
              <div className="p-3 text-xs font-semibold text-muted text-center">
                No requirement file uploaded yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* COLUMN 2: DIGITAL TEAM (Separated into App & Web Tables) */}
      <div className="flowchart-team-column">
        <div className={`flowchart-header-box ${stages.digital.isDone ? 'completed' : ''}`}>
          Digital Team
        </div>

        <div className={`flowchart-task-big-box ${stages.digital.status}`}>
          {digitalFiles.length > 0 ? (
            <div className="d-flex flex-col gap-3">
              {/* App Designs Section */}
              <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200">
                <div className="d-flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-purple-950 uppercase tracking-wide">
                    App Designs ({appDesignFiles.length})
                  </span>
                </div>
                {appDesignFiles.length > 0 ? (
                  appDesignFiles.map((file, i) => {
                    const isApproved = Boolean(
                      file.tlApproval === 'Approved' ||
                      stages.digital.isDone ||
                      activePackage.designTlApproved ||
                      activePackage.adminApproved ||
                      activePackage.finalAdminApproved
                    );
                    const key = file.id ? `appdfile-${file.id}` : `appdfile-${i}`;
                    return <FlowFileItem key={key} file={file} isApproved={isApproved} defaultLabel="App Asset" setViewedPdf={setViewedPdf} />;
                  })
                ) : (
                  <div className="text-xs text-muted font-medium italic p-1.5 text-center bg-white rounded-lg border">
                    No App designs uploaded
                  </div>
                )}
              </div>

              {/* Web Designs Section */}
              <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200">
                <div className="d-flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-blue-950 uppercase tracking-wide">
                    Web Designs ({webDesignFiles.length})
                  </span>
                </div>
                {webDesignFiles.length > 0 ? (
                  webDesignFiles.map((file, i) => {
                    const isApproved = Boolean(
                      file.tlApproval === 'Approved' ||
                      stages.digital.isDone ||
                      activePackage.designTlApproved ||
                      activePackage.adminApproved ||
                      activePackage.finalAdminApproved
                    );
                    const key = file.id ? `webdfile-${file.id}` : `webdfile-${i}`;
                    return <FlowFileItem key={key} file={file} isApproved={isApproved} defaultLabel="Web Asset" setViewedPdf={setViewedPdf} />;
                  })
                ) : (
                  <div className="text-xs text-muted font-medium italic p-1.5 text-center bg-white rounded-lg border">
                    No Web designs uploaded
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 text-xs font-semibold text-muted text-center">
              No asset file uploaded yet
            </div>
          )}

          {stages.digital.figmaLink && (
            <div className="p-2 rounded-lg bg-purple-50 border border-purple-200 text-xs mt-3 text-left">
              <span className="font-bold text-purple-900">Figma Link:</span> Available
            </div>
          )}
        </div>
      </div>

      {/* COLUMN 3: DEVELOPER TEAM (Separated into App & Web Tables) */}
      <div className="flowchart-team-column">
        <div className={`flowchart-header-box ${stages.developer.isDone ? 'completed' : ''}`}>
          Developer Team
        </div>

        <div className={`flowchart-task-big-box ${stages.developer.status}`}>
          {devFiles.length > 0 ? (
            <div className="d-flex flex-col gap-3">
              {/* App Builds Section */}
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <div className="d-flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-emerald-950 uppercase tracking-wide">
                    App Builds ({appDevFiles.length})
                  </span>
                </div>
                {appDevFiles.length > 0 ? (
                  appDevFiles.map((file, i) => {
                    const isApproved = Boolean(
                      stages.developer.isDone ||
                      activePackage.submittedToDevops ||
                      activePackage.adminApproved ||
                      activePackage.finalAdminApproved
                    );
                    const key = file.id ? `appdevfile-${file.id}` : `appdevfile-${i}`;
                    return <FlowFileItem key={key} file={file} isApproved={isApproved} defaultLabel="App Zip Build" setViewedPdf={setViewedPdf} />;
                  })
                ) : (
                  <div className="text-xs text-muted font-medium italic p-1.5 text-center bg-white rounded-lg border">
                    No App build uploaded
                  </div>
                )}
              </div>

              {/* Web Builds Section */}
              <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200">
                <div className="d-flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-indigo-950 uppercase tracking-wide">
                    Web Builds ({webDevFiles.length})
                  </span>
                </div>
                {webDevFiles.length > 0 ? (
                  webDevFiles.map((file, i) => {
                    const isApproved = Boolean(
                      stages.developer.isDone ||
                      activePackage.submittedToDevops ||
                      activePackage.adminApproved ||
                      activePackage.finalAdminApproved
                    );
                    const key = file.id ? `webdevfile-${file.id}` : `webdevfile-${i}`;
                    return <FlowFileItem key={key} file={file} isApproved={isApproved} defaultLabel="Web Zip Build" setViewedPdf={setViewedPdf} />;
                  })
                ) : (
                  <div className="text-xs text-muted font-medium italic p-1.5 text-center bg-white rounded-lg border">
                    No Web build uploaded
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 text-xs font-semibold text-muted text-center">
              No build file uploaded yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FlowChartSingleNodes({ stages, activePackage, onSelectPackage }) {
  let testingBadgeClass = 'in-progress';
  let testingBadgeText = 'Pending Test';
  if (stages.testing.isDone) {
    testingBadgeClass = 'approved';
    testingBadgeText = 'Completed';
  } else if (stages.testing.unresolvedBugs > 0) {
    testingBadgeClass = 'pending';
    testingBadgeText = 'Bug Action Needed';
  }

  return (
    <>
      {/* CONNECTOR LINE */}
      <svg className="flowchart-svg-connector" viewBox="0 0 900 48" fill="none">
        <path d="M150 0 V20 M450 0 V20 M750 0 V20 M150 20 H750 M450 20 V48" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="5 5" />
        <polygon points="450,48 445,40 455,40" fill="#94a3b8" />
      </svg>

      {/* LEVEL 3: DEVOPS TEAM */}
      <div className={`flowchart-single-node-box ${stages.devops.status}`}>
        <div className="d-flex justify-between items-center mb-2">
          <span className="font-black text-sm text-main uppercase">DevOps Team</span>
          <span className={`status-badge ${stages.devops.isDone ? 'approved' : 'pending'} text-xs`}>
            {stages.devops.isDone ? 'Completed' : 'Pending Deployment'}
          </span>
        </div>
        <div className="text-xs font-bold text-main mb-1">
          {stages.devops.statusText}
        </div>
        {(stages.devops.stagingUrl || stages.devops.demoUrl) && (
          <div className="d-flex flex-col gap-1.5 mt-2 text-left">
            {stages.devops.stagingUrl && (
              <div className="p-2 rounded-lg bg-sky-50 border border-sky-200 text-xs d-flex items-center gap-1.5 overflow-hidden">
                <span className="font-extrabold text-sky-900 flex-shrink-0">Staging URL:</span>
                <a
                  href={stages.devops.stagingUrl.startsWith('http') ? stages.devops.stagingUrl : `https://${stages.devops.stagingUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-sky-700 underline truncate hover:text-sky-900"
                  title={`Open Staging URL: ${stages.devops.stagingUrl}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {stages.devops.stagingUrl}
                </a>
              </div>
            )}
            {stages.devops.demoUrl && (
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs d-flex items-center gap-1.5 overflow-hidden">
                <span className="font-extrabold text-emerald-900 flex-shrink-0">Production URL:</span>
                <a
                  href={stages.devops.demoUrl.startsWith('http') ? stages.devops.demoUrl : `https://${stages.devops.demoUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-emerald-700 underline truncate hover:text-emerald-900"
                  title={`Open Production URL: ${stages.devops.demoUrl}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {stages.devops.demoUrl}
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CONNECTOR LINE */}
      <svg style={{ width: '2px', height: '36px', background: '#94a3b8' }} />
      <svg width="12" height="12" viewBox="0 0 12 12" style={{ marginTop: '-8px' }}>
        <polygon points="6,12 0,0 12,0" fill="#94a3b8" />
      </svg>

      {/* LEVEL 4: TESTING TEAM */}
      <div className={`flowchart-single-node-box ${stages.testing.status}`}>
        <div className="d-flex justify-between items-center mb-3">
          <span className="font-black text-sm text-main uppercase">Testing Team</span>
          <span className={`status-badge ${testingBadgeClass} text-xs`}>
            {testingBadgeText}
          </span>
        </div>

        {/* BUGS LISTING DISPLAY */}
        {activePackage.bugs && activePackage.bugs.length > 0 ? (
          <div className="text-left">
            {activePackage.bugs.map((bug, i) => {
              const isResolved = Boolean(bug.resolved);
              const bugTitleText = bug.title || bug.bugTitle || bug.name || bug.description || 'Bug Report';
              const severityLabel = bug.severity || 'Normal';

              return (
                <div key={bug.id ? `bug-${bug.id}` : `bug-${i}`} className="d-flex items-center gap-2 p-2.5 rounded-lg bg-white border mb-2 shadow-2xs">
                  {isResolved ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="flex-shrink-0" title="Bug Resolved">
                      <circle cx="12" cy="12" r="10" fill="#10b981" />
                      <path d="M8 12.5l2.8 2.8 5.2-5.3" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="flex-shrink-0" title="Open Bug">
                      <circle cx="12" cy="12" r="9" stroke="#ef4444" strokeWidth="2.2" fill="none" />
                    </svg>
                  )}

                  <div className="overflow-hidden flex-1">
                    <div
                      className="text-sm font-extrabold truncate"
                      style={{ color: isResolved ? '#10b981' : '#1e293b' }}
                      title={bugTitleText}
                    >
                      {bugTitleText}
                    </div>
                    <div className="text-xs text-muted d-flex items-center justify-between gap-2 mt-0.5">
                      <span>Severity: {severityLabel}</span>
                      <span className={`status-badge text-xs py-0.5 px-2 ${isResolved ? 'approved' : 'pending'}`}>
                        {isResolved ? 'Resolved' : 'Open Bug'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-3 text-xs font-semibold text-muted text-center">
            No bugs reported. Test verification in progress.
          </div>
        )}
      </div>

      {/* CONNECTOR LINE */}
      <svg style={{ width: '2px', height: '36px', background: '#94a3b8' }} />
      <svg width="12" height="12" viewBox="0 0 12 12" style={{ marginTop: '-8px' }}>
        <polygon points="6,12 0,0 12,0" fill="#94a3b8" />
      </svg>

      {/* LEVEL 5: PRODUCTION RELEASE */}
      <div className={`flowchart-single-node-box ${stages.production.isDone ? 'completed' : ''}`}>
        <div className="d-flex justify-between items-center mb-2">
          <span className="font-black text-sm text-main uppercase">Production Release</span>
          <span className={`status-badge ${stages.production.isDone ? 'approved' : 'pending'} text-xs`}>
            {stages.production.isDone ? 'Completed' : 'Pending Sign-off'}
          </span>
        </div>
        <div className="text-xs font-bold text-main mb-1">
          {stages.production.statusText}
        </div>
        {stages.production.demoUrl && (
          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs d-flex items-center gap-1.5 overflow-hidden mt-2 text-left">
            <span className="font-extrabold text-emerald-900 flex-shrink-0">Production Live URL:</span>
            <a
              href={stages.production.demoUrl.startsWith('http') ? stages.production.demoUrl : `https://${stages.production.demoUrl}`}
              target="_blank"
              rel="noreferrer"
              className="font-extrabold text-emerald-700 underline truncate hover:text-emerald-950"
              title={`Open Final Production Live URL: ${stages.production.demoUrl}`}
              onClick={(e) => e.stopPropagation()}
            >
              {stages.production.demoUrl}
            </a>
          </div>
        )}
      </div>

      {/* ACTION BUTTON */}
      {onSelectPackage && activePackage && (
        <div className="mt-6">
          <button
            type="button"
            className="create-btn py-2 px-6 text-xs font-bold"
            onClick={() => onSelectPackage(activePackage.id)}
          >
            Open {activePackage.name} in Workspace &rarr;
          </button>
        </div>
      )}
    </>
  );
}

function FlowChartView({
  selectedProject: initialProject,
  setSelectedProject: setParentSelectedProject,
  onSelectPackage,
  currentUser,
}) {
  const [packages, setPackages] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(initialProject || 'All Projects');
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewedPdf, setViewedPdf] = useState(null);
  const hasSelectedRef = useRef(false);

  const storedUserRaw = typeof window !== 'undefined' ? localStorage.getItem('antigravity_user') : null;
  const storedUser = storedUserRaw ? (() => { try { return JSON.parse(storedUserRaw); } catch { return null; } })() : null;
  const activeUser = currentUser || storedUser;
  const userRole = (activeUser?.role || '').trim().toLowerCase();
  const isCareerMatePM = userRole.includes('career mate');
  const isClassmatePM = userRole.includes('classmate');

  const fetchFlowData = useCallback(async () => {
    try {
      const [pkgsData, projsData] = await Promise.all([
        api.packages.getAll(),
        api.projects.getAll(),
      ]);
      setPackages(pkgsData || []);
      setProjects(projsData || []);

      if (pkgsData && pkgsData.length > 0 && !hasSelectedRef.current) {
        setSelectedPackageId(pkgsData[0].id);
        hasSelectedRef.current = true;
      }
    } catch (err) {
      console.error('Failed to fetch flow chart data:', err);
    }
  }, []);

  useEffect(() => {
    fetchFlowData();
  }, [fetchFlowData]);

  useEffect(() => {
    if (initialProject) {
      setSelectedProject(initialProject);
    }
  }, [initialProject]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'pm_packages_v4' || e.key === 'pm_projects_v2') {
        fetchFlowData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchFlowData]);

  const handleProjectFilterChange = (proj) => {
    setSelectedProject(proj);
    if (setParentSelectedProject) {
      setParentSelectedProject(proj);
    }
  };

  // Strictly filter packages based on PM role isolation rules
  const pmFilteredPackages = packages.filter((pkg) => {
    const projClean = (pkg.project || '').trim().toLowerCase();
    if (isCareerMatePM) {
      return projClean === 'career mate' || projClean === 'careermate';
    }
    if (isClassmatePM) {
      return projClean === 'classmate' || projClean === 'class mate';
    }
    return true;
  });

  const pmFilteredProjects = projects.filter((p) => {
    const pName = (typeof p === 'string' ? p : p?.name || '').trim().toLowerCase();
    if (isCareerMatePM) {
      return pName === 'career mate' || pName === 'careermate';
    }
    if (isClassmatePM) {
      return pName === 'classmate' || pName === 'class mate';
    }
    return true;
  });

  const projectList = Array.from(
    new Set([
      ...pmFilteredProjects.map((p) => (typeof p === 'string' ? p : p?.name)).filter(Boolean),
      ...pmFilteredPackages.map((pkg) => pkg.project).filter(Boolean),
    ])
  );

  const filteredPackages = filterFlowPackages(pmFilteredPackages, selectedProject, searchQuery);
  const activePackage = filteredPackages.find((p) => p.id === selectedPackageId) || filteredPackages[0] || pmFilteredPackages[0] || null;
  const stages = getStageDetails(activePackage);

  const totalPkgs = filteredPackages.length;
  const completedPkgs = filteredPackages.filter(isPackageCompleted).length;
  const overallFlowPercent = totalPkgs > 0 ? Math.round((completedPkgs / totalPkgs) * 100) : 0;

  return (
    <div className="flow-chart-dashboard">
      <FlowChartHeaderControls
        selectedProject={selectedProject}
        handleProjectFilterChange={handleProjectFilterChange}
        projects={projectList}
        packages={pmFilteredPackages}
        activePackage={activePackage}
        setSelectedPackageId={setSelectedPackageId}
      />

      {/* FLOWCHART DIAGRAM */}
      {activePackage && stages ? (
        <div className="flowchart-diagram-canvas mb-8">

          {/* LEVEL 1: TOP BOX (TASK NAME) */}
          <div className={`flowchart-top-node ${isPackageCompleted(activePackage) ? 'completed' : ''}`}>
            <h2 className="text-xl font-black mb-1" style={{ color: isPackageCompleted(activePackage) ? '#065f46' : '#1e1b4b' }}>
              {activePackage.name}
            </h2>
            <div className="d-flex items-center justify-center gap-2 text-xs font-bold flex-wrap">
              <span className="ui-badge ui-badge-sm ui-badge-primary">{activePackage.project}</span>
              {activePackage.dueDate && (
                <span className="ui-badge ui-badge-sm font-extrabold" style={{ backgroundColor: '#fef9c3', color: '#854d0e', borderColor: '#fde047' }}>
                  Due: {activePackage.dueDate}
                </span>
              )}
              <span className={`status-badge ${isPackageCompleted(activePackage) ? 'approved' : 'pending'} text-xs`}>
                {isPackageCompleted(activePackage) ? 'Completed' : 'In Progress'}
              </span>
            </div>
          </div>

          {/* CONNECTOR LINES FROM TOP BOX TO 3 TEAM COLUMNS */}
          <svg className="flowchart-svg-connector" viewBox="0 0 900 48" fill="none">
            <path d="M450 0 V20 M450 20 H150 V48 M450 20 H750 V48 M450 20 V48" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="5 5" />
            <polygon points="150,48 145,40 155,40" fill="#94a3b8" />
            <polygon points="450,48 445,40 455,40" fill="#94a3b8" />
            <polygon points="750,48 745,40 755,40" fill="#94a3b8" />
          </svg>

          {/* LEVEL 2: 3 PARALLEL TEAM COLUMNS */}
          <FlowChartTeamColumns stages={stages} activePackage={activePackage} setViewedPdf={setViewedPdf} />

          {/* LEVEL 3, 4, 5: SINGLE NODE STAGES */}
          <FlowChartSingleNodes stages={stages} activePackage={activePackage} onSelectPackage={onSelectPackage} />

        </div>
      ) : (
        <div className="ui-card p-8 text-center text-muted">
          No active tasks found matching the selected project filter.
        </div>
      )}

      <DocumentViewerModal viewedPdf={viewedPdf} setViewedPdf={setViewedPdf} />
    </div>
  );
}

export default FlowChartView;
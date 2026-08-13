import React, { useState, useEffect, useCallback } from 'react';
import RoleHistoryModal from './RoleHistoryModal';
import { api } from '../services/api';
import { getAvatarUrl } from '../utils/fileUtils';

function collectRealProjectFiles(packages) {
  const realProjectFiles = [];
  packages.forEach(pkg => {
    if (pkg.reqFiles) {
      pkg.reqFiles.forEach(f => {
        if (f.fileName) realProjectFiles.push({ ...f, department: 'Content Team', pkgName: pkg.name });
      });
    }
    if (pkg.designFiles) {
      pkg.designFiles.forEach(f => {
        if (f.fileName) realProjectFiles.push({ ...f, department: 'Design Team', pkgName: pkg.name });
      });
    }
    if (pkg.devBuildFiles) {
      pkg.devBuildFiles.forEach(f => {
        if (f.fileName) realProjectFiles.push({ ...f, department: 'Developer Team', pkgName: pkg.name });
      });
    }
  });
  return realProjectFiles;
}

function computeSidebarMetrics(currentProjectPackages) {
  const totalPkgs = currentProjectPackages.length;
  const deployedPkgs = currentProjectPackages.filter(p => p.deployed).length;
  const submittedPkgs = currentProjectPackages.filter(p => p.submittedToDevops).length;
  const totalBugs = currentProjectPackages.reduce((acc, p) => acc + (p.bugs ? p.bugs.length : 0), 0);
  const resolvedBugs = currentProjectPackages.reduce((acc, p) => acc + (p.bugs ? p.bugs.filter(b => b.resolved).length : 0), 0);
  
  const contentProgress = totalPkgs > 0 ? Math.round((currentProjectPackages.filter(p => p.reqFiles?.some(f => f.fileName)).length / totalPkgs) * 100) : 0;
  const designProgress = totalPkgs > 0 ? Math.round((currentProjectPackages.filter(p => p.designFiles?.some(f => f.fileName)).length / totalPkgs) * 100) : 0;
  const devProgress = totalPkgs > 0 ? Math.round((currentProjectPackages.filter(p => p.devBuildFiles?.some(f => f.fileName)).length / totalPkgs) * 100) : 0;
  const devopsProgress = totalPkgs > 0 ? Math.round((submittedPkgs / totalPkgs) * 100) : 0;
  
  let qaProgress = 0;
  if (totalBugs > 0) {
    qaProgress = Math.round((resolvedBugs / totalBugs) * 100);
  } else if (deployedPkgs > 0) {
    qaProgress = 100;
  }

  const overallCompletionRate = totalPkgs > 0 ? Math.round(((deployedPkgs * 1.0) / totalPkgs) * 100) : 0;

  return {
    totalPkgs,
    deployedPkgs,
    submittedPkgs,
    totalBugs,
    resolvedBugs,
    contentProgress,
    designProgress,
    devProgress,
    devopsProgress,
    qaProgress,
    overallCompletionRate,
  };
}

function Sidebar({
  selectedProject,
  setSelectedProject,
  setSelectedPackageId,
  selectedPackageId,
  currentRole,
  activeNav: propActiveNav,
  setActiveNav: propSetActiveNav,
  isMobileOpen,
  onCloseMobile,
}) {
  const [projects, setProjects] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allPackages, setAllPackages] = useState([]);
  const [localActiveNav, setLocalActiveNav] = useState('flowchart');
  const [activeModal, setActiveModal] = useState(null);

  const activeNav = propActiveNav !== undefined ? propActiveNav : localActiveNav;
  const setActiveNav = (nav) => {
    if (propSetActiveNav) propSetActiveNav(nav);
    else setLocalActiveNav(nav);
    if (onCloseMobile) onCloseMobile();
  };

  const fetchProjects = useCallback(async () => {
    try {
      const data = await api.projects.getAll();
      setProjects(data);
    } catch {
      
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.users.getAll();
      setAllUsers(data);
    } catch {
      
    }
  }, []);

  const fetchPackages = useCallback(async () => {
    try {
      const data = await api.packages.getAll();
      setAllPackages(data);
    } catch {
      
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchUsers();
    fetchPackages();
  }, [fetchProjects, fetchUsers, fetchPackages]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'pm_projects_v2') fetchProjects();
      if (e.key === 'pm_users') fetchUsers();
      if (e.key === 'pm_packages_v4') fetchPackages();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchProjects, fetchUsers, fetchPackages]);

  const currentProjectPackages = allPackages.filter(p => p.project === selectedProject);

  const realProjectFiles = collectRealProjectFiles(currentProjectPackages);

  const {
    totalPkgs,
    contentProgress,
    designProgress,
    devProgress,
    devopsProgress,
    qaProgress,
    overallCompletionRate,
  } = computeSidebarMetrics(currentProjectPackages);

  const roleColors = {
    'Content Team': '#ec4899',
    'Design Team': '#8b5cf6',
    'Developer Team': '#3b82f6',
    'Devops Team': '#f59e0b',
    'Testing Team': '#10b981',
    'Admin': '#ef4444'
  };

  const getFileExt = (name) => {
    if (!name) return 'FILE';
    const parts = name.split('.');
    if (parts.length === 1) return 'FILE';
    const ext = parts.pop().toLowerCase();
    if (['pdf'].includes(ext)) return 'PDF';
    if (['doc', 'docx'].includes(ext)) return 'DOC';
    if (['zip', 'rar'].includes(ext)) return 'ZIP';
    if (['png', 'jpg', 'jpeg'].includes(ext)) return 'IMG';
    return 'FILE';
  };

  return (
    <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
      <div className="d-flex items-center justify-between px-2 mb-6">
        <div className="d-flex items-center gap-3">
          <div className="sidebar-brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#ffffff" fillOpacity="0.9" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" fill="#ffffff" fillOpacity="0.6" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#ffffff" fillOpacity="0.9" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" fill="#ffffff" fillOpacity="0.6" />
            </svg>
          </div>
          <span className="sidebar-brand-name">
            PM Workspace
          </span>
        </div>
        {onCloseMobile && (
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>

      <div className="d-flex flex-col gap-1 mb-6">
        {currentRole === 'Admin' ? (
          <button
            type="button"
            onClick={() => {
              setActiveNav('users');
              setSelectedPackageId(null);
              if (onCloseMobile) onCloseMobile();
            }}
            className={`sidebar-nav-btn ${activeNav === 'users' ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 1-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>Users</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setSelectedProject(null);
                setActiveNav('flowchart');
                setSelectedPackageId(null);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`sidebar-nav-btn ${activeNav === 'flowchart' && !selectedPackageId ? 'active' : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 17 22 12" />
              </svg>
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedProject(null);
                setActiveNav('dashboard');
                setSelectedPackageId(null);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`sidebar-nav-btn ${activeNav === 'dashboard' && !selectedPackageId ? 'active' : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Overview</span>
            </button>

            <button
              type="button"
              className={`sidebar-nav-btn ${activeNav === 'projects' ? 'active' : ''}`}
              onClick={() => {
                setActiveNav('projects');
                setSelectedProject(null);
                setSelectedPackageId(null);
                if (onCloseMobile) onCloseMobile();
              }}
            >
              <div className="d-flex items-center gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
                <span>Project</span>
              </div>
              <div className="d-flex items-center gap-1">
                <span className="sidebar-pill">
                  {projects.filter(p => {
                    const rLower = (currentRole || '').toLowerCase();
                    if (rLower.includes('careermate') || rLower.includes('career mate')) return p.trim().toLowerCase() === 'career mate' || p.trim().toLowerCase() === 'careermate';
                    if (rLower.includes('classmate') || rLower.includes('class mate')) return p.trim().toLowerCase() === 'classmate' || p.trim().toLowerCase() === 'class mate';
                    return true;
                  }).length}
                </span>
              </div>
            </button>
          </>
        )}
      </div>

      {activeModal === 'history' && (
        <RoleHistoryModal 
          initialRole={currentRole || 'All Roles'} 
          currentRole={currentRole}
          onClose={() => setActiveModal(null)} 
        />
      )}

      {activeModal && activeModal !== 'history' && (
        <dialog
          open
          className="modal-overlay"
          aria-modal="true"
        >
          <button
            type="button"
            className="modal-backdrop-btn"
            onClick={() => setActiveModal(null)}
            aria-label="Close modal backdrop"
          />
          <div className="modal-content modal-content-sm">
            <div className="d-flex justify-between items-center mb-4">
              <h2 className="modal-title mb-0">
                {activeModal === 'team' && 'Team Members'}
                {activeModal === 'calendar' && 'Project Calendar'}
                {activeModal === 'reports' && 'Project Reports'}
                {activeModal === 'files' && 'Project Files'}
                {activeModal === 'settings' && 'Settings'}
              </h2>
              <button type="button" onClick={() => setActiveModal(null)} className="btn-secondary">
                Close
              </button>
            </div>

            {activeModal === 'team' && (
              <div>
                <p className="text-sm text-muted mt-0 mb-4">
                  Team members ({allUsers.length} total).
                </p>
                <div className="d-flex flex-col gap-3 max-h-300 overflow-auto">
                  {allUsers.length > 0 ? (
                    allUsers.map((user) => {
                      const color = roleColors[user.role] || '#475569';
                      const formattedName = user.username.charAt(0).toUpperCase() + user.username.slice(1);
                      return (
                        <div key={user.username} className="d-flex items-center justify-between p-3 rounded-lg bg-subtle border">
                          <div className="d-flex items-center gap-3">
                            <div className="user-avatar-sm" style={{ backgroundColor: color }}>
                              {user.avatarUrl ? (
                                <img src={getAvatarUrl(user.avatarUrl)} alt={user.username} className="user-avatar-img" />
                              ) : (
                                formattedName.charAt(0)
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-main">{formattedName}</div>
                              <div className="text-xs text-muted">User Account</div>
                            </div>
                          </div>
                          <span className="status-badge approved text-xs" style={{ backgroundColor: `${color}15`, color: color, borderColor: `${color}30` }}>
                            {user.role}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center p-4 text-muted text-sm">No team members loaded.</div>
                  )}
                </div>
              </div>
            )}

            {activeModal === 'calendar' && (
              <div>
                <p className="text-sm text-muted mt-0 mb-4">
                  Status for <strong>{selectedProject}</strong>.
                </p>
                <div className="d-flex flex-col gap-3 max-h-300 overflow-auto">
                  {currentProjectPackages.length > 0 ? (
                    currentProjectPackages.map((pkg) => {
                      const isDeployed = pkg.deployed;
                      const isDevops = pkg.submittedToDevops;
                      const hasDev = pkg.devBuildFiles?.some(f => f.fileName);
                      const hasDesign = pkg.designFiles?.some(f => f.fileName);

                      let statusText = 'Requirements Ready';
                      let statusColor = '#2563eb';
                      if (isDeployed) { statusText = 'Live Deployed'; statusColor = '#16a34a'; }
                      else if (isDevops) { statusText = 'Test / DevOps Testing'; statusColor = '#0891b2'; }
                      else if (hasDev) { statusText = 'Dev Build Ready'; statusColor = '#7c3aed'; }
                      else if (hasDesign) { statusText = 'Design Uploaded'; statusColor = '#d97706'; }

                      return (
                        <div key={pkg.id} className="d-flex items-center justify-between p-3 rounded-lg bg-card border shadow-xs">
                          <div className="d-flex items-center gap-3">
                            <div className="p-1 px-2 bg-blue-50 rounded border border-blue-200 text-center">
                              <span className="text-xs font-extrabold text-blue-600 uppercase">Task</span>
                            </div>
                            <div>
                              <span className="font-bold text-sm text-main block">{pkg.name}</span>
                              <span className="text-xs text-muted">Project: {pkg.project}</span>
                            </div>
                          </div>
                          <span className="ui-badge ui-badge-sm" style={{ backgroundColor: `${statusColor}15`, color: statusColor, borderColor: `${statusColor}30` }}>
                            {statusText}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center p-4 text-muted text-sm">
                      No active task packages found for {selectedProject}.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeModal === 'reports' && (
              <div>
                <p className="text-sm text-muted mt-0 mb-4">
                  Progress for <strong>{selectedProject}</strong>.
                </p>
                <div className="grid-2col mb-4">
                  <div className="p-4 bg-subtle border rounded-lg text-center">
                    <div className="text-2xl font-extrabold text-blue-600">{totalPkgs}</div>
                    <div className="text-xs font-bold text-muted mt-1 uppercase">TOTAL TASKS</div>
                  </div>
                  <div className="p-4 bg-subtle border rounded-lg text-center">
                    <div className="text-2xl font-extrabold text-emerald-600">{overallCompletionRate}%</div>
                    <div className="text-xs font-bold text-muted mt-1 uppercase">LIVE RATE</div>
                  </div>
                </div>
                <div className="p-4 bg-card border rounded-lg">
                  <div className="text-sm font-bold text-main mb-3">Team Progress</div>
                  {[
                    { label: 'Content', percent: contentProgress },
                    { label: 'Design', percent: designProgress },
                    { label: 'Development', percent: devProgress },
                    { label: 'DevOps', percent: devopsProgress },
                    { label: 'Testing', percent: qaProgress }
                  ].map((item) => (
                    <div key={item.label} className="mb-3">
                      <div className="d-flex justify-between text-xs font-semibold text-muted mb-1">
                        <span>{item.label}</span>
                        <span className="font-bold text-main">{item.percent}%</span>
                      </div>
                      <div className="progress-bar-track">
                        <div className={`progress-bar-fill ${item.percent === 100 ? 'bg-emerald-600' : 'bg-primary'}`} style={{ width: `${item.percent}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeModal === 'files' && (
              <div>
                <p className="text-sm text-muted mt-0 mb-4">
                  Files for <strong>{selectedProject}</strong> ({realProjectFiles.length} files).
                </p>
                <div className="d-flex flex-col gap-2 max-h-300 overflow-auto">
                  {realProjectFiles.length > 0 ? (
                    realProjectFiles.map((file, i) => {
                      const typeLabel = getFileExt(file.fileName);
                      const userFriendlyName = file.fileName ? file.fileName.substring(file.fileName.indexOf('-') + 1) : file.name;
                      const baseUrl = (typeof window !== 'undefined' && window.API_BASE_URL) ? window.API_BASE_URL : 'http://localhost:3001';
                      const downloadUrl = `${baseUrl}/uploads/${file.fileName}`;

                      return (
                        <div key={file.id ? `file-${file.id}` : `file-${file.fileName || i}`} className="d-flex items-center justify-between p-3 rounded-lg bg-subtle border">
                          <div className="d-flex items-center gap-3 overflow-hidden flex-1 mr-3">
                            <div className="ui-badge ui-badge-primary ui-badge-sm flex-shrink-0">{typeLabel}</div>
                            <div className="overflow-hidden">
                              <div className="font-bold text-sm text-main whitespace-nowrap overflow-hidden text-ellipsis">
                                {file.name || userFriendlyName}
                              </div>
                              <div className="text-xs text-muted">
                                {userFriendlyName} · {file.fileSize || 'File'} · <span className="text-primary-color font-semibold">{file.department}</span>
                              </div>
                            </div>
                          </div>
                          <a
                            href={downloadUrl}
                            download={userFriendlyName}
                            target="_blank"
                            rel="noreferrer"
                            className="create-btn ui-btn-sm text-decoration-none flex-shrink-0"
                          >
                            View / Download
                          </a>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center p-6 text-muted bg-subtle rounded-lg border-dashed">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" className="mb-2">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                        <polyline points="13 2 13 9 20 9"/>
                      </svg>
                      <div className="font-bold text-sm text-main">No Uploaded Files Yet</div>
                      <div className="text-xs text-muted mt-1">
                        Files uploaded in Content, Design, or Developer workspace will appear here automatically.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeModal === 'settings' && (
              <div>
                <p className="text-sm text-muted mt-0 mb-4">
                  App settings and options.
                </p>
                <div className="d-flex flex-col gap-3">
                  <div className="d-flex justify-between items-center p-3 bg-subtle rounded-lg border">
                    <div>
                      <div className="font-bold text-sm text-main">Color Theme</div>
                      <div className="text-xs text-muted">Active theme is professional light mode.</div>
                    </div>
                    <span className="status-badge approved">Light Theme</span>
                  </div>
                  <div className="d-flex justify-between items-center p-3 bg-subtle rounded-lg border">
                    <div>
                      <div className="font-bold text-sm text-main">Realtime Sync</div>
                      <div className="text-xs text-muted">Automatically reload changes across open tabs.</div>
                    </div>
                    <input type="checkbox" defaultChecked className="cursor-pointer" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </dialog>
      )}
    </aside>
  );
}

export default Sidebar;

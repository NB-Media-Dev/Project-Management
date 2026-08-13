import React from 'react';
import RoleHistoryView from './RoleHistoryView';
import FlowChartView from './FlowChartView';

export function renderSharedDashboardNav({
  activeNav,
  selectedPackage,
  currentUser,
  defaultRole,
  selectedProject,
  setSelectedProject,
  setSelectedPackageId,
  setActiveNav,
  triggerReload,
}) {
  if (activeNav === 'dashboard' && !selectedPackage) {
    return (
      <RoleHistoryView
        defaultRole={currentUser?.role ?? defaultRole}
        selectedProject="All Projects"
        currentUser={currentUser}
        onSelectPackage={(pkgId) => {
          setSelectedPackageId(pkgId);
          setActiveNav('projects');
        }}
      />
    );
  }

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

  return null;
}

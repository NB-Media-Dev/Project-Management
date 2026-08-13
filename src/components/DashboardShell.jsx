import React, { useState, useEffect } from 'react';
import PageNavigator from './PageNavigator';
import DocumentViewerModal from './DocumentViewerModal';
import ProfileModal from './ProfileModal';
import { initGlobalPopperListener, checkUnseenDeployments } from '../utils/confettiPopper';

function DashboardShell({
  currentUser,
  onLogout,
  onUpdateUser,
  packagesState,
  viewedPdf,
  setViewedPdf,
  overlay,
  children,
}) {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const packagesList = packagesState?.packages;
  const usernameProp = currentUser?.username ?? '';
  const roleProp = currentUser?.role ?? '';

  useEffect(() => {
    const userIdentifier = usernameProp || roleProp || 'user';
    const cleanup = initGlobalPopperListener(userIdentifier, packagesList);
    return cleanup;
  }, [usernameProp, roleProp, packagesList]);

  useEffect(() => {
    const userIdentifier = usernameProp || roleProp || 'user';
    if (packagesList && packagesList.length > 0) {
      checkUnseenDeployments(packagesList, userIdentifier);
    }
  }, [packagesList, usernameProp, roleProp]);

  const {
    setSelectedProject,
    setSelectedPackageId,
    setActiveNav,
  } = packagesState;

  const handleNavigatePackage = (projName, pkgId) => {
    setSelectedProject(projName);
    setSelectedPackageId(pkgId);
    setActiveNav('projects'); // 'tasks' is not a valid nav value; 'projects' shows the package detail view
  };

  return (
    <div className="playful-shell">
      <main className="playful-main">
        <PageNavigator
          currentUser={currentUser}
          onLogout={onLogout}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          packagesState={packagesState}
          onNavigatePackage={handleNavigatePackage}
        />
        <div className="playful-content">
          {children}
        </div>
      </main>

      {viewedPdf && setViewedPdf && (
        <DocumentViewerModal viewedPdf={viewedPdf} setViewedPdf={setViewedPdf} />
      )}

      {isProfileModalOpen && (
        <ProfileModal
          currentUser={currentUser}
          onClose={() => setIsProfileModalOpen(false)}
          onUpdateUser={onUpdateUser}
        />
      )}

      {overlay}
    </div>
  );
}

export default DashboardShell;

import React from 'react';
import ReactDOM from 'react-dom';
import { formatTime, getAvatarUrl } from '../utils/fileUtils';
import NotificationToast from './NotificationToast';
import { useNotifications } from '../hooks/useNotifications';

const NAV_ITEMS = [
  { id: 'flowchart', label: 'Dashboard' },
  { id: 'dashboard', label: 'Overview' },
  { id: 'projects', label: 'Project' },
];

const ADMIN_NAV = { id: 'users', label: 'Users' };

function PageNavigator({
  currentUser,
  onLogout,
  onOpenProfile,
  packagesState,
  onNavigatePackage,
}) {
  const {
    setSelectedProject,
    selectedPackageId,
    setSelectedPackageId,
    activeNav,
    setActiveNav,
    filteredPackages = [],
  } = packagesState || {};

  const {
    notifications,
    pagedNotifications,
    unreadCount,
    isOpen: showNotifications,
    setIsOpen: setShowNotifications,
    toasts,
    bellRef,
    dropdownRef: notifRef,
    panelPos,
    setPanelPos,
    currentPage,
    setCurrentPage,
    totalPages,
    handleCloseToast,
    handleNotificationClick,
    handleMarkAllRead,
  } = useNotifications(currentUser, onNavigatePackage);

  const username = currentUser?.username || '';
  const currentRole = currentUser?.role || '';

  const handleNavClick = (navId) => {
    setActiveNav(navId);
    setSelectedPackageId(null);
    if (navId === 'projects') {
      setSelectedProject(null);
    }
  };

  const displayName = username
    ? username.charAt(0).toUpperCase() + username.slice(1)
    : currentRole;

  const navItems = currentRole === 'Admin' ? [ADMIN_NAV] : NAV_ITEMS;
  return (
    <div className="page-navigator">
      <div className="page-nav-top">
        <div className="page-nav-brand">
          <img src="/logo.png" alt="Project Management Logo" className="page-nav-brand-logo" />
          <span className="page-nav-brand-name">Project Workspace</span>
        </div>
        <div className="page-nav-user-row">
          <button
            type="button"
            className="page-nav-user-clickable"
            onClick={onOpenProfile}
            title="Click to view profile, edit picture & change password"
          >
            <div className="page-nav-user-info">
              <span className="page-nav-user-name">{displayName}</span>
              <span className="page-nav-user-role">
                {currentRole}
              </span>
            </div>
            <div className="page-nav-avatar">
              {currentUser?.avatarUrl ? (
                <img src={getAvatarUrl(currentUser.avatarUrl)} alt={displayName} className="page-nav-avatar-img" />
              ) : (
                displayName.charAt(0)
              )}
            </div>
          </button>
          <button type="button" className="page-nav-logout" onClick={onLogout}>
            Sign out
          </button>
          <div className="page-nav-notif-wrap navbar-end-notif">
            <button
              ref={bellRef}
              type="button"
              className={`page-nav-notif-btn ${showNotifications ? 'open' : ''}`}
              onClick={() => {
                if (!showNotifications && bellRef.current) {
                  const rect = bellRef.current.getBoundingClientRect();
                  const calcRight = Math.max(12, window.innerWidth - rect.right);
                  setPanelPos({
                    top: rect.bottom + window.scrollY + 8,
                    right: calcRight,
                  });
                }
                setShowNotifications(!showNotifications);
              }}
              aria-label="Notifications"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="page-nav-notif-badge">{unreadCount}</span>
              )}
            </button>

            {showNotifications && ReactDOM.createPortal(
              <div
                ref={notifRef}
                className="page-nav-notif-panel"
                style={{
                  position: 'absolute',
                  top: panelPos.top,
                  right: panelPos.right,
                  left: 'auto',
                }}
              >
                <div className="page-nav-notif-header">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <button type="button" onClick={handleMarkAllRead} className="page-nav-notif-mark">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="page-nav-notif-list">
                  {notifications.length > 0 ? (
                    pagedNotifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNotificationClick(item)}
                        className={`page-nav-notif-item ${item.isRead ? '' : 'unread'}`}
                      >
                        <p className="page-nav-notif-msg">{item.message}</p>
                        <span className="page-nav-notif-time">{formatTime(item.createdAt)}</span>
                      </button>
                    ))
                  ) : (
                    <div className="page-nav-notif-empty">No notifications yet</div>
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="page-nav-notif-pagination">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      className="page-nav-notif-page-btn"
                    >
                      &larr; Prev
                    </button>
                    <span className="page-nav-notif-page-info">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      className="page-nav-notif-page-btn"
                    >
                      Next &rarr;
                    </button>
                  </div>
                )}
              </div>,
              document.body
            )}
          </div>
        </div>
      </div>

      <div className="page-nav-bar">
        <nav className="page-nav-tabs" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = activeNav === item.id && !selectedPackageId;
            return (
              <button
                key={item.id}
                type="button"
                className={`page-nav-tab ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                {item.label}
                {item.id === 'projects' && filteredPackages.length > 0 && (
                  <span className="page-nav-tab-count">{filteredPackages.length}</span>
                )}
              </button>
            );
          })}
        </nav>  
      </div>
      <NotificationToast
        toasts={toasts}
        onClose={handleCloseToast}
        onClickToast={handleNotificationClick}
      />
    </div>
  );
}

export default PageNavigator;

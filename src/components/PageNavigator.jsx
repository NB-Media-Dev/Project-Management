import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { api } from '../services/api';
import { formatTime, getAvatarUrl } from '../utils/fileUtils';
import NotificationToast from './NotificationToast';

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
    searchQuery,
    selectedPackageId,
    setSelectedPackageId,
    filteredPackages,
    activeNav,
    setActiveNav,
  } = packagesState;

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toasts, setToasts] = useState([]);
  const seenNotifIdsRef = useRef(new Set());
  const isFirstLoadRef = useRef(true);
  const notifRef = useRef(null);
  const bellRef = useRef(null);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(notifications.length / itemsPerPage) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [notifications.length, totalPages, currentPage]);

  const pagedNotifications = notifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const username = currentUser?.username || '';
  const currentRole = currentUser?.role || '';
  const isAdmin = currentRole === 'Admin';

  // Request browser notification permission on mount if available
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Reset tracking when user or role changes
  useEffect(() => {
    seenNotifIdsRef.current = new Set();
    setToasts([]);
  }, [username, currentRole]);

  const fetchNotifications = useCallback(async () => {
    if (!currentRole || !username) return;
    try {
      const data = await api.notifications.get(currentRole, username);
      const isSelfNotification = (n) => {
        const rLower = (currentRole || '').trim().toLowerCase();
        const uLower = (username || '').trim().toLowerCase();

        let roleKeyword = '';
        if (rLower.includes('content')) roleKeyword = 'content';
        else if (rLower.includes('design') || rLower.includes('digital')) roleKeyword = 'design';
        else if (rLower.includes('devops')) roleKeyword = 'devops';
        else if (rLower.includes('dev')) roleKeyword = 'dev';
        else if (rLower.includes('test') || rLower.includes('qa')) roleKeyword = 'test';
        else if (rLower.includes('admin')) roleKeyword = 'admin';

        const sUser = (n.senderUsername || '').trim().toLowerCase();
        const sRole = (n.senderRole || '').trim().toLowerCase();
        const msg = (n.message || '').trim().toLowerCase();

        if (sUser && (sUser === uLower || sUser === rLower)) return true;
        if (sRole && sRole === rLower) return true;
        if (roleKeyword && sRole && sRole.includes(roleKeyword)) return true;
        if (roleKeyword && sUser && sUser.includes(roleKeyword)) return true;

        if (roleKeyword) {
          if (roleKeyword === 'content' && (msg.includes('content team') || msg.includes('content tl'))) return true;
          if (roleKeyword === 'design' && (msg.includes('design team') || msg.includes('design tl'))) return true;
          if (roleKeyword === 'dev' && (msg.includes('developer team') || msg.includes('dev tl') || msg.includes('developer team leader'))) return true;
          if (roleKeyword === 'devops' && (msg.includes('devops team') || msg.includes('devops tl') || msg.includes('devops team leader'))) return true;
          if (roleKeyword === 'test' && (msg.includes('testing team') || msg.includes('qa pass'))) return true;
          if (roleKeyword === 'admin' && (msg.includes('admin approved') || msg.includes('admin gave final approval'))) return true;
        }

        if (uLower && uLower.length > 2 && msg.includes(uLower)) return true;

        return false;
      };

      const validNotifs = data.filter((n) => !isSelfNotification(n));
      setNotifications(validNotifs);

      const unreadItems = validNotifs.filter(
        (n) => !n.isRead && !seenNotifIdsRef.current.has(n.id)
      );

      if (unreadItems.length > 0) {
        unreadItems.forEach((n) => seenNotifIdsRef.current.add(n.id));
        setToasts((prev) => [...unreadItems, ...prev]);

        // Trigger native desktop notification if permitted
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          unreadItems.slice(0, 3).forEach((item) => {
            try {
              new Notification('New Notification', {
                body: item.message,
              });
            } catch {}
          });
        }
      }
    } catch {
      
    }
  }, [currentRole, username]);

  const handleCloseToast = useCallback((toastId) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    const handleStorageChange = (e) => {
      if (e.key === 'pm_packages_v4') fetchNotifications();
    };
    window.addEventListener('storage', handleStorageChange);
    const handleClickOutside = (e) => {
      if (
        notifRef.current && !notifRef.current.contains(e.target) &&
        bellRef.current && !bellRef.current.contains(e.target)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNavClick = (navId) => {
    setActiveNav(navId);
    setSelectedPackageId(null);
    if (navId === 'projects') {
      setSelectedProject(null);
    }
  };

  const handleNotificationClick = async (item) => {
    try {
      if (!item.isRead) {
        await api.notifications.markRead(item.id, username);
        fetchNotifications();
      }
      setShowNotifications(false);
      if (onNavigatePackage && item.projectName && item.packageId) {
        onNavigatePackage(item.projectName, item.packageId);
      }
    } catch {
      
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentRole || !username) return;
    try {
      await api.notifications.markAllRead(currentRole, username);
      fetchNotifications();
    } catch {
      
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

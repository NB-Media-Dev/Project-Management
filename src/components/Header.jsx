import React from 'react';
import ReactDOM from 'react-dom';
import { formatTime, getAvatarUrl } from '../utils/fileUtils';
import NotificationToast from './NotificationToast';
import { useNotifications } from '../hooks/useNotifications';

function Header({ currentUser, searchQuery, handleSearchChange, onLogout, onOpenProfile, onNavigatePackage, isMobileMenuOpen, onToggleMobileMenu }) {
  const username = currentUser ? currentUser.username : '';
  const currentRole = currentUser ? currentUser.role : '';

  const {
    notifications,
    pagedNotifications,
    unreadCount,
    isOpen,
    setIsOpen,
    toasts,
    bellRef,
    dropdownRef,
    panelPos,
    setPanelPos,
    currentPage,
    setCurrentPage,
    totalPages,
    handleCloseToast,
    handleNotificationClick,
    handleMarkAllRead,
  } = useNotifications(currentUser, onNavigatePackage);

  return (
    <header className="header-bar">
      <div className="header-left">
        {onToggleMobileMenu && (
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={onToggleMobileMenu}
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>
        )}

        <div className="search-section">
          <form onSubmit={(e) => e.preventDefault()} className="position-relative d-inline-flex items-center">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="search"
              placeholder="Search tasks, packages..."
              value={searchQuery}
              onChange={handleSearchChange}
              id="header-search"
              className="search-input"
            />
          </form>
        </div>
      </div>

      <div className="user-section">
        <button
          type="button"
          className="user-profile"
          onClick={onOpenProfile}
          style={{ cursor: 'pointer' }}
          title="Click to view profile, edit picture & change password"
        >
          <div className="user-meta">
            <span className="user-name user-name-flex">
              {username ? (username.charAt(0).toUpperCase() + username.slice(1)) : (currentRole || 'Content Team')}
            </span>
            <span className="user-role">
              {currentRole || 'Content Team'}
            </span>
          </div>
          <div className="td-avatar">
            {currentUser?.avatarUrl ? (
              <img src={getAvatarUrl(currentUser.avatarUrl)} alt={username} className="td-avatar-img" />
            ) : (
              (username || currentRole || 'Content Team').charAt(0).toUpperCase()
            )}
          </div>
        </button>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="logout-btn"
          >
            Log Out
          </button>
        )}

        {/* Notification Bell positioned at the VERY END of the navbar */}
        <div className="dropdown-wrap navbar-end-notif">
          <button
            ref={bellRef}
            type="button"
            id="notification-bell"
            onClick={() => {
              if (!isOpen && bellRef.current) {
                const rect = bellRef.current.getBoundingClientRect();
                const calcRight = Math.max(12, window.innerWidth - rect.right);
                setPanelPos({
                  top: rect.bottom + window.scrollY + 8,
                  right: calcRight,
                });
              }
              setIsOpen(!isOpen);
            }}
            title="Notifications"
            className="notify-btn"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="notify-badge-pulse notify-badge-count">
                {unreadCount}
              </span>
            )}
          </button>

          {isOpen && ReactDOM.createPortal(
            <div
              ref={dropdownRef}
              className="notification-dropdown"
              style={{
                position: 'absolute',
                top: panelPos.top,
                right: panelPos.right,
                left: 'auto',
              }}
            >
              <div className="notif-header">
                <span className="notif-title">Notifications</span>
                {unreadCount > 0 && (
                  <button type="button" onClick={handleMarkAllRead} className="notif-mark-read">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="notif-list">
                {notifications.length > 0 ? (
                  pagedNotifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNotificationClick(item)}
                      className={`notif-item ${item.isRead ? '' : 'unread'}`}
                    >
                      <p className="notif-message">
                        {item.message}
                      </p>
                      <span className="notif-time">{formatTime(item.createdAt)}</span>
                    </button>
                  ))
                ) : (
                  <div className="notif-empty">
                    No notifications yet
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="notif-pagination">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    className="notif-page-btn"
                  >
                    &larr; Prev
                  </button>
                  <span className="notif-page-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    className="notif-page-btn"
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

      <NotificationToast
        toasts={toasts}
        onClose={handleCloseToast}
        onClickToast={handleNotificationClick}
      />
    </header>
  );
}

export default Header;

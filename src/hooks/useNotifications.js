import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';

function getRoleKeyword(rLower) {
  if (rLower.includes('content')) return 'content';
  if (rLower.includes('design') || rLower.includes('digital')) return 'design';
  if (rLower.includes('devops')) return 'devops';
  if (rLower.includes('dev')) return 'dev';
  if (rLower.includes('test') || rLower.includes('qa')) return 'test';
  if (rLower.includes('admin')) return 'admin';
  return '';
}

function matchesRoleMessageKeyword(roleKeyword, msg) {
  if (!roleKeyword) return false;
  const keywordsMap = {
    content: ['content team', 'content tl'],
    design: ['design team', 'design tl'],
    dev: ['developer team', 'dev tl', 'developer team leader'],
    devops: ['devops team', 'devops tl', 'devops team leader'],
    test: ['testing team', 'qa pass'],
    admin: ['admin approved', 'admin gave final approval'],
  };
  const matchArr = keywordsMap[roleKeyword] || [];
  return matchArr.some((kw) => msg.includes(kw));
}

export function useNotifications(currentUser, onNavigatePackage) {
  const username = currentUser?.username || '';
  const currentRole = currentUser?.role || '';

  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const seenNotifIdsRef = useRef(new Set());
  const bellRef = useRef(null);
  const dropdownRef = useRef(null);
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

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    seenNotifIdsRef.current = new Set();
    setToasts([]);
  }, [username, currentRole]);

  const isSelfNotification = useCallback((n) => {
    if (!username) return false;
    const uLower = (username || '').trim().toLowerCase();
    const sUser = (n.senderUsername || '').trim().toLowerCase();

    // Only filter out if the current user sent this notification themselves
    if (sUser && sUser === uLower) return true;

    return false;
  }, [username]);

  const fetchNotifications = useCallback(async () => {
    if (!currentRole || !username) return;
    try {
      const data = await api.notifications.get(currentRole, username);
      const validNotifs = data.filter((n) => !isSelfNotification(n));
      const uniqueNotifsMap = new Map();
      for (const n of validNotifs) {
        if (!uniqueNotifsMap.has(n.id)) {
          uniqueNotifsMap.set(n.id, n);
        }
      }
      const uniqueNotifs = Array.from(uniqueNotifsMap.values());
      setNotifications(uniqueNotifs);

      const unreadItems = uniqueNotifs.filter(
        (n) => !n.isRead && !seenNotifIdsRef.current.has(n.id)
      );

      if (unreadItems.length > 0) {
        unreadItems.forEach((n) => seenNotifIdsRef.current.add(n.id));
        setToasts((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          const newToasts = unreadItems.filter((item) => !existingIds.has(item.id));
          return [...newToasts, ...prev];
        });

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
    } catch {}
  }, [currentRole, username, isSelfNotification]);


  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    const handleStorageChange = (e) => {
      if (e.key === 'pm_packages_v4') fetchNotifications();
    };
    window.addEventListener('storage', handleStorageChange);
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        bellRef.current && !bellRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [fetchNotifications]);

  const handleCloseToast = useCallback((toastId) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  const handleNotificationClick = useCallback(async (item) => {
    try {
      if (!item.isRead) {
        await api.notifications.markRead(item.id, username);
        fetchNotifications();
      }
      setIsOpen(false);
      if (onNavigatePackage && item.projectName && item.packageId) {
        onNavigatePackage(item.projectName, item.packageId);
      }
    } catch {}
  }, [username, fetchNotifications, onNavigatePackage]);

  const handleMarkAllRead = useCallback(async () => {
    if (!currentRole || !username) return;
    try {
      await api.notifications.markAllRead(currentRole, username);
      fetchNotifications();
    } catch {}
  }, [currentRole, username, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
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
    fetchNotifications,
  };
}

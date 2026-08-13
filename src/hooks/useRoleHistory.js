import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export const ROLES = [
  'All Roles',
  'Content Team',
  'Design Team',
  'Developer Team',
  'Devops Team',
  'Testing Team',
  'Project Manager (Career Mate)',
  'Project Manager (Classmate)',
  'CTO',
  'Admin',
];

export function useRoleHistory({ initialRole = 'All Roles', initialProject = 'All Projects', currentUser }) {
  const userRole = currentUser?.role || (initialRole !== 'All Roles' ? initialRole : null);
  const isPMCareermate = userRole && (userRole.toLowerCase().includes('careermate') || userRole.toLowerCase().includes('career mate'));
  const isPMClassmate = userRole && (userRole.toLowerCase().includes('classmate') || userRole.toLowerCase().includes('class mate'));
  const pmProject = isPMCareermate ? 'Career Mate' : (isPMClassmate ? 'Classmate' : null);

  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'CTO' || Boolean(pmProject) || (!currentUser && (initialRole === 'Admin' || initialRole === 'CTO'));
  const effectiveRole = isAdmin ? (initialRole || 'All Roles') : (userRole || initialRole || 'All Roles');

  const [selectedRole, setSelectedRole] = useState(effectiveRole);
  const [selectedProjectState, setSelectedProjectState] = useState(pmProject || initialProject || 'All Projects');
  const selectedProject = pmProject || selectedProjectState;
  const setSelectedProject = (p) => {
    if (pmProject) return;
    setSelectedProjectState(p);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [historyItems, setHistoryItems] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewedPdf, setViewedPdf] = useState(null);

  const visibleRoles = !isAdmin && userRole ? [userRole] : ROLES;

  const fetchProjects = useCallback(async () => {
    try {
      const data = await api.projects.getAll();
      setProjectsList(data);
    } catch { }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const targetRole = isAdmin ? selectedRole : (userRole || selectedRole);
      const data = await api.history.get(targetRole, selectedProject);
      setHistoryItems(data || []);
    } catch {
      setHistoryItems([]);
    } finally {
      setLoading(false);
    }
  }, [selectedRole, selectedProject, isAdmin, userRole]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filteredItems = historyItems.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item?.title?.toLowerCase().includes(query) ||
      item?.description?.toLowerCase().includes(query) ||
      item?.packageName?.toLowerCase().includes(query) ||
      item?.projectName?.toLowerCase().includes(query) ||
      item?.actionType?.toLowerCase().includes(query) ||
      item?.role?.toLowerCase().includes(query)
    );
  });

  const totalFiles = filteredItems.filter((i) => i.fileName || i.demoUrl).length;
  const totalCompleted = filteredItems.filter(
    (i) => i.status === 'Completed' || i.status === 'Live Published' || i.status === 'Fixed'
  ).length;

  return {
    userRole,
    isAdmin,
    selectedRole,
    setSelectedRole,
    selectedProject,
    setSelectedProject,
    searchQuery,
    setSearchQuery,
    historyItems,
    filteredItems,
    projectsList,
    loading,
    viewedPdf,
    setViewedPdf,
    visibleRoles,
    totalFiles,
    totalCompleted,
    refetchHistory: fetchHistory,
  };
}

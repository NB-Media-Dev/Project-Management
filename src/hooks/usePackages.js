import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';

export function usePackages(initialProject = 'All Projects', currentUser = null) {
  const isPMCareermate = currentUser?.role && (currentUser.role.toLowerCase().includes('careermate') || currentUser.role.toLowerCase().includes('career mate'));
  const isPMClassmate = currentUser?.role && (currentUser.role.toLowerCase().includes('classmate') || currentUser.role.toLowerCase().includes('class mate'));

  const lockedProject = isPMCareermate ? 'Career Mate' : (isPMClassmate ? 'Classmate' : null);
  const effectiveInitial = lockedProject || initialProject;

  const [activeNav, setActiveNav] = useState('flowchart');
  const [selectedProjectState, setSelectedProjectState] = useState(effectiveInitial);

  const selectedProject = lockedProject || selectedProjectState;
  const setSelectedProject = (proj) => {
    if (lockedProject) return;
    setSelectedProjectState(proj);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPackages = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await api.packages.getAll();
      setPackages(data);
      setError(null);
    } catch (err) {
      if (!isSilent) setError(err.message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const safeFetch = async (silent) => {
      if (!isMounted) return;
      await fetchPackages(silent);
    };
    safeFetch(false);
    const interval = setInterval(() => safeFetch(true), 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchPackages]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'pm_packages_v4') {
        fetchPackages(true);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchPackages]);

  useEffect(() => {
    if (selectedPackageId !== null) {
      const isAll = !selectedProject || selectedProject === 'All Projects' || selectedProject === 'All';
      const projectPkgs = isAll ? packages : packages.filter((pkg) => pkg.project === selectedProject);
      const exists = projectPkgs.some((p) => p.id === selectedPackageId);
      if (!exists) {
        setSelectedPackageId(null);
      }
    }
  }, [selectedProject, packages, selectedPackageId]);

  const triggerReload = useCallback(() => {
    fetchPackages();
    localStorage.setItem('pm_packages_v4', Date.now().toString());
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'pm_packages_v4',
        newValue: Date.now().toString(),
      })
    );
  }, [fetchPackages]);

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  const projectPackages = useMemo(() => {
    if (!selectedProject || selectedProject === 'All Projects' || selectedProject === 'All') {
      return packages;
    }
    const target = selectedProject.trim().toLowerCase();
    return packages.filter((pkg) => pkg.project && pkg.project.trim().toLowerCase() === target);
  }, [packages, selectedProject]);

  const filteredPackages = useMemo(() => {
    if (!searchQuery?.trim()) return projectPackages;
    const query = searchQuery.toLowerCase().trim();
    return projectPackages.filter(
      (pkg) =>
        (pkg.name?.toLowerCase().includes(query)) ||
        (pkg.project?.toLowerCase().includes(query)) ||
        (pkg.description?.toLowerCase().includes(query)) ||
        (pkg.createdBy?.toLowerCase().includes(query))
    );
  }, [projectPackages, searchQuery]);

  const selectedPackage = useMemo(() => {
    return packages.find((pkg) => pkg.id === selectedPackageId) || null;
  }, [packages, selectedPackageId]);

  return {
    activeNav,
    setActiveNav,
    packages,
    selectedProject,
    setSelectedProject,
    searchQuery,
    setSearchQuery,
    handleSearchChange,
    selectedPackageId,
    setSelectedPackageId,
    selectedPackage,
    projectPackages,
    filteredPackages,
    triggerReload,
    fetchPackages,
    loading,
    error,
  };
}

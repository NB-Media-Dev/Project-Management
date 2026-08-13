import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import PackageGrid from './PackageGrid';
import CreatePackageModal from './CreatePackageModal';
import EditPackageModal from './EditPackageModal';

function ProjectsView({
  packages = [],
  searchQuery = '',
  selectedProject,
  onSelectProject,
  onSelectPackage,
  renderStatus,
  triggerReload,
  currentUser,
  onApproveAdmin,
}) {
  const [projects, setProjects] = useState([]);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');

  const isPM = currentUser?.role?.includes('Project Manager');
  const isCTO = currentUser?.role === 'CTO' || currentUser?.role === 'Admin';
  const canCreateProject = isPM || isCTO;
  const canManageTask = isPM || isCTO;

  const fetchProjects = async () => {
    try {
      const list = await api.projects.getAll();
      setProjects(list);
    } catch { }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!canCreateProject) {
      alert('Only Project Managers and CTO can create new projects.');
      return;
    }
    if (!newProjectName.trim()) return;
    const cleanName = newProjectName.trim().toLowerCase();
    if (cleanName === 'career mate' || cleanName === 'careermate' || cleanName === 'classmate' || cleanName === 'class mate') {
      alert('Career Mate and Classmate are fixed core projects.');
      return;
    }
    try {
      await api.projects.create(newProjectName.trim());
      const createdName = newProjectName.trim();
      setNewProjectName('');
      setIsCreatingProject(false);
      fetchProjects();
      if (triggerReload) triggerReload();
      if (onSelectProject) onSelectProject(createdName);
    } catch (err) {
      alert(err.message || 'Error creating project');
    }
  };

  const handleCreateTaskSubmit = async (pkgData) => {
    try {
      await api.packages.create({
        ...pkgData,
        createdByRole: currentUser?.role || 'Content Team',
        createdBy: currentUser?.username,
      });
      setIsCreatingTask(false);
      if (triggerReload) triggerReload();
    } catch (err) {
      alert(err.message || 'Failed to create Task.');
    }
  };

  const handleEditTaskSubmit = async (updatedData) => {
    if (!editingTask) return;
    try {
      await api.packages.update(editingTask.id, updatedData);
      setEditingTask(null);
      if (triggerReload) triggerReload();
    } catch (err) {
      alert(err.message || 'Failed to update Task.');
    }
  };

  const handleDeleteTask = async (pkgId, pkgName) => {
    if (!window.confirm(`Are you sure you want to delete task "${pkgName}"? This action cannot be undone.`)) return;
    try {
      await api.packages.delete(pkgId);
      if (triggerReload) triggerReload();
    } catch (err) {
      alert(err.message || 'Failed to delete Task.');
    }
  };

  const FIXED_PROJECTS = ['career mate', 'careermate', 'classmate', 'class mate'];
  const isFixedProject = (name) => {
    if (!name) return false;
    const clean = name.trim().toLowerCase();
    return FIXED_PROJECTS.includes(clean);
  };

  const handleDeleteProject = async (projectName, e) => {
    if (e) e.stopPropagation();
    if (isFixedProject(projectName)) {
      alert(`Project "${projectName}" is a fixed core project and cannot be deleted.`);
      return;
    }
    if (!canCreateProject && currentUser?.role !== 'Admin' && currentUser?.role !== 'CTO') {
      alert('Only Content Team can delete projects.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete project "${projectName}" and all its tasks? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.projects.delete(projectName);
      if (selectedProject === projectName && onSelectProject) {
        onSelectProject(null);
      }
      fetchProjects();
      if (triggerReload) triggerReload();
    } catch (err) {
      alert(err.message || 'Failed to delete project.');
    }
  };

  if (selectedProject && selectedProject !== 'All Projects') {
    let projectPkgs = packages.filter(
      (p) => p.project && p.project.trim().toLowerCase() === selectedProject.trim().toLowerCase()
    );

    if (searchQuery?.trim()) {
      const q = searchQuery.toLowerCase().trim();
      projectPkgs = projectPkgs.filter(
        (pkg) =>
          pkg?.name?.toLowerCase().includes(q) ||
          pkg?.project?.toLowerCase().includes(q) ||
          pkg?.description?.toLowerCase().includes(q) ||
          pkg?.createdBy?.toLowerCase().includes(q)
      );
    }

    return (
      <div>
        <div className="content-header mb-6">
          <div className="navigation-breadcrumbs">
            <button
              type="button"
              onClick={() => onSelectProject?.(null)}
              className="back-btn"
            >
              &larr; Back to Projects
            </button>
            <span className="breadcrumb-separator">/</span>
            <span className="current-breadcrumb">{selectedProject}</span>
          </div>
          <div className="d-flex justify-between items-center flex-wrap gap-4 mt-2">
            <div>
              <h1 className="dashboard-title">{selectedProject} Tasks </h1>
              <p className="dashboard-subtitle">
                {projectPkgs.length} Tasks{projectPkgs.length !== 1 ? 's' : ''} in this project
              </p>
            </div>
            <div className="d-flex items-center gap-3">
              {canManageTask && !(isCTO && isFixedProject(selectedProject)) && (
                <button
                  type="button"
                  onClick={() => setIsCreatingTask(true)}
                  className="create-btn"
                >
                  + New Task
                </button>
              )}
              {canCreateProject && !isFixedProject(selectedProject) && (
                <button
                  type="button"
                  onClick={(e) => handleDeleteProject(selectedProject, e)}
                  className="btn-danger-outline"
                  title="Delete entire project and its tasks"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  Delete Project
                </button>
              )}
            </div>
          </div>
        </div>

        <section className="digital-section">
          <PackageGrid
            filteredPackages={projectPkgs}
            selectedProject={selectedProject}
            onSelect={onSelectPackage}
            renderStatus={renderStatus}
            onApproveAdmin={onApproveAdmin}
            canManageTask={canManageTask}
            onEditTask={(pkg) => setEditingTask(pkg)}
            onDeleteTask={handleDeleteTask}
          />
        </section>

        {isCreatingTask && (
          <CreatePackageModal
            defaultProject={selectedProject}
            currentUser={currentUser}
            onSubmit={handleCreateTaskSubmit}
            onCancel={() => setIsCreatingTask(false)}
          />
        )}

        {editingTask && (
          <EditPackageModal
            pkg={editingTask}
            onSubmit={handleEditTaskSubmit}
            onCancel={() => setEditingTask(null)}
          />
        )}
      </div>
    );
  }

  
  return (
    <div>
      <div className="content-header mb-6 d-flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h1 className="dashboard-title">Projects</h1>
          <p className="dashboard-subtitle">Select a project box below to view its Tasks, and pipeline status.</p>
        </div>
        {canCreateProject && (
          <button
            type="button"
            onClick={() => setIsCreatingProject(true)}
            className="create-btn"
          >
            + Create New Project
          </button>
        )}
      </div>

      {isCreatingProject && (
        <form onSubmit={handleCreateProject} className="ui-card p-5 mb-6 modal-content-sm">
          <h3 className="ui-card-title mb-3">Create New Project</h3>
          <div className="form-group mb-4">
            <label htmlFor="new-project-name" className="ui-label">Project Name</label>
            <input
              id="new-project-name"
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="e.g. EduPortal"
              required
              className="w-full mt-1"
            />
          </div>
          <div className="d-flex gap-2">
            <button type="submit" className="create-btn flex-1 justify-center">Create Project</button>
            <button type="button" onClick={() => setIsCreatingProject(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {projects.length > 0 ? (
        <div className="grid-3col">
          {projects
            .filter((proj) => {
              const rLower = (currentUser?.role || '').toLowerCase();
              if (rLower.includes('careermate') || rLower.includes('career mate')) {
                if (proj.trim().toLowerCase() !== 'career mate' && proj.trim().toLowerCase() !== 'careermate') return false;
              } else if (rLower.includes('classmate') || rLower.includes('class mate')) {
                if (proj.trim().toLowerCase() !== 'classmate' && proj.trim().toLowerCase() !== 'class mate') return false;
              }
              if (!searchQuery?.trim()) return true;
              const q = searchQuery.toLowerCase().trim();
              const projPkgs = packages.filter((p) => p.project === proj);
              return (
                proj.toLowerCase().includes(q) ||
                projPkgs.some(
                  (p) =>
                    p?.name?.toLowerCase().includes(q) ||
                    p?.description?.toLowerCase().includes(q)
                )
              );
            })
            .map((proj) => {
            const projPkgs = packages.filter((p) => p.project === proj);
            const deployedCount = projPkgs.filter((p) => p.deployed).length;
            const inProgressCount = projPkgs.filter((p) => !p.deployed).length;

            return (
              <button
                key={proj}
                type="button"
                onClick={() => onSelectProject?.(proj)}
                className="ui-card ui-card-interactive cursor-pointer d-flex flex-col justify-between w-full text-left"
              >
                <div className="box">
                  <div className="d-flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-extrabold text-main mb-0">{proj}</h3>
                      <span className="text-xs text-muted font-semibold">{projPkgs.length} Tasks</span>
                    </div>
                    {canCreateProject && !isFixedProject(proj) && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteProject(proj, e)}
                        className="delete-icon-btn"
                        title={`Delete project "${proj}"`}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="grid-2col mb-5 p-3 rounded-md bg-subtle">
                    <div>
                      <span className="text-xs font-bold text-muted uppercase">Live Production</span>
                      <div className="text-xl font-extrabold text-emerald-700">{deployedCount}</div>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-muted uppercase">In Development</span>
                      <div className="text-xl font-extrabold text-amber-600">{inProgressCount}</div>
                    </div>
                  </div>
                </div>

                <div
                  className="ui-btn ui-btn-primary w-full justify-center text-center"
                >
                  Open {proj} &rarr;
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center ui-card border-dashed text-muted">
          No projects created yet. Click "+ Create New Project" to get started.
        </div>
      )}
    </div>
  );
}

export default ProjectsView;

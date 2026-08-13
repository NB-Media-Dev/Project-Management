import React, { useState, useEffect, useCallback } from 'react';
import DashboardShell from './DashboardShell';
import RoleHistoryView from './RoleHistoryView';
import FlowChartView from './FlowChartView';
import { usePackages } from '../hooks/usePackages';
import { api } from '../services/api';
import ProjectsView from './ProjectsView';
import { getAvatarUrl } from '../utils/fileUtils';

import { validatePasswordComplexity } from './ProfileModal';
import RejectionModal from './RejectionModal';

const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0284c7'];

function renderAdminStatus(pkg) {
  let label = 'In Pipeline';
  let badgeClass = 'pending';
  if (pkg.deployed) {
    label = 'Live Production Deployed';
    badgeClass = 'completed';
  } else if (pkg.finalAdminApproved) {
    label = 'Approved by Admin';
    badgeClass = 'completed';
  } else if (pkg.testingTlApproved) {
    label = 'Ready for Admin Approval';
    badgeClass = 'approved';
  }
  return {
    label,
    badgeClass,
    linkText: 'Manage & Review Task',
    linkColor: '#4f46e5',
  };
}

function UserModal({
  isModalOpen,
  setIsModalOpen,
  isEditing,
  formUsername,
  setFormUsername,
  formPassword,
  setFormPassword,
  formRole,
  setFormRole,
  formIsTeamLeader,
  setFormIsTeamLeader,
  formError,
  handleFormSubmit,
}) {
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  if (!isModalOpen) return null;

  return (
    <dialog
      open
      className="modal-overlay"
      aria-modal="true"
    >
      <button
        type="button"
        className="modal-backdrop-btn"
        onClick={() => setIsModalOpen(false)}
        aria-label="Close modal backdrop"
      />
      <div className="modal-content modal-content-sm">
        <h2 className="modal-title">{isEditing ? 'Edit User Account' : 'Add New User'}</h2>
        {formError && (
          <div className="alert-banner danger mb-4" style={{ justifyContent: 'center', textAlign: 'center' }}>
            {formError}
          </div>
        )}
        <form onSubmit={handleFormSubmit}>
          <div className="form-group mb-4">
            <label htmlFor="formUsername" className="ui-label">Username</label>
            <input
              type="text"
              id="formUsername"
              value={formUsername}
              onChange={(e) => setFormUsername(e.target.value)}
              disabled={isEditing}
              placeholder="e.g. jondoe"
              className="mt-1"
            />
          </div>
          <div className="form-group mb-4">
            <label htmlFor="formPassword" className="ui-label">
              {isEditing ? 'New Password (leave blank to keep current)' : 'Password'}
            </label>
            <div className="password-input-wrap mt-1">
              <input
                type={showAdminPassword ? 'text' : 'password'}
                id="formPassword"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder={isEditing ? 'Leave blank to keep current' : 'At least 8 characters'}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowAdminPassword(!showAdminPassword)}
                aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                title={showAdminPassword ? 'Hide password' : 'Show password'}
              >
                {showAdminPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-muted mt-1.5 mb-0">
              Password must be at least 8 characters long with 1 uppercase, 1 lowercase, 1 number & 1 special symbol.
            </p>
          </div>
          <div className="form-group mb-4">
            <label htmlFor="formRole" className="ui-label">Role</label>
            <select
              id="formRole"
              value={formRole}
              onChange={(e) => {
                const selectedRole = e.target.value;
                setFormRole(selectedRole);
                if (selectedRole === 'Admin') {
                  setFormIsTeamLeader(false);
                }
              }}
              className="mt-1"
            >
              <option value="Content Team">Content Team</option>
              <option value="Design Team">Design Team</option>
              <option value="Developer Team">Developer Team</option>
              <option value="Devops Team">Devops Team</option>
              <option value="Testing Team">Testing Team</option>
              <option value="Project Manager (Career Mate)">Project Manager (Career Mate)</option>
              <option value="Project Manager (Classmate)">Project Manager (Classmate)</option>
              <option value="CTO">CTO</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div className="modal-actions mt-6">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="create-btn">{isEditing ? 'Save Changes' : 'Create User'}</button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

function UserTableRow({ user, currentUser, openEditModal, handleDeleteClick, fetchUsers, triggerUserReload, allUsers = [] }) {
  const isSelf = currentUser && currentUser.username.toLowerCase() === user.username.toLowerCase();
  const avatarBg = AVATAR_COLORS[Math.abs(user.username.split('').reduce((acc, char) => acc + char.codePointAt(0), 0)) % AVATAR_COLORS.length];
  const initial = user.username.charAt(0).toUpperCase();

  const handleToggleTL = async () => {
    if (!user.isTeamLeader) {
      const existingTL = allUsers.find(
        (u) => u.role === user.role && (u.isTeamLeader === true || u.isTeamLeader === 1 || u.isTeamLeader === '1') && u.username.toLowerCase() !== user.username.toLowerCase()
      );
      if (existingTL) {
        alert(`The ${user.role} already has an assigned Team Leader (${existingTL.username}). Each team can only have one Team Leader. Please demote ${existingTL.username} first.`);
        return;
      }
    }
    try {
      await api.users.update(user.username, {
        role: user.role,
        isTeamLeader: user.isTeamLeader ? 0 : 1
      });
      fetchUsers();
      triggerUserReload();
    } catch (err) {
      alert(err.message || 'Failed to update Team Leader status');
    }
  };

  return (
    <tr key={user.username}>
      <td>
        <div className="user-cell d-flex items-center gap-3">
          <div className="user-avatar" style={{ backgroundColor: avatarBg }}>
            {user.avatarUrl ? (
              <img src={getAvatarUrl(user.avatarUrl)} alt={user.username} className="user-avatar-img" />
            ) : (
              initial
            )}
          </div>
          <div className="user-info">
            <div className="user-name font-extrabold text-main">
              {user.username} {isSelf && <span className="you-badge">(You)</span>}
            </div>
          </div>
        </div>
      </td>
      <td>
        <span className={`role-tag ${user.role.toLowerCase().replace(/\s+/g, '-')}`}>
          {user.role}
        </span>
      </td>
      <td>
        <span className="status-indicator active">
          <span className="status-dot"></span> Active
        </span>
      </td>
      <td className="text-right">
        <div className="action-buttons justify-end d-flex gap-2">
          <button
            type="button"
            onClick={() => openEditModal(user)}
            className="btn-admin-edit"
            title="Edit User Role & Password"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
          {!isSelf && (
            <button
              type="button"
              onClick={() => handleDeleteClick(user.username)}
              className="ui-btn ui-btn-danger ui-btn-sm"
              title="Delete User"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function UserManagementTab({
  openAddModal,
  totalUsers,
  adminCount,
  tlCount,
  teamCount,
  filteredUsers,
  currentUser,
  openEditModal,
  handleDeleteClick,
  fetchUsers,
  triggerUserReload,
}) {
  return (
    <div>
      <div className="content-header mb-6 d-flex flex-wrap gap-4">
        <div>
          <h1 className="dashboard-title">Users &amp; Access Management</h1>
          <p className="dashboard-subtitle">Manage team accounts, assign team leader responsibilities, update passwords, and control access.</p>
        </div>
        <button type="button" onClick={openAddModal} className="create-btn">
          + Add New User
        </button>
      </div>
      <div className="stats-row grid-4col mb-6">
        <div className="stat-card ui-card">
          <div className="stat-icon blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3.87-3.99"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="stat-body">
            <span className="stat-value">{totalUsers}</span>
            <span className="stat-label">Total Users</span>
          </div>
        </div>
        <div className="stat-card ui-card">
          <div className="stat-icon purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div className="stat-body">
            <span className="stat-value">{adminCount}</span>
            <span className="stat-label">Admins</span>
          </div>
        </div>
        <div className="stat-card ui-card">
          <div className="stat-icon green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div className="stat-body">
            <span className="stat-value">{tlCount}</span>
            <span className="stat-label">Team Leaders</span>
          </div>
        </div>
        <div className="stat-card ui-card">
          <div className="stat-icon teal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>
            </svg>
          </div>
          <div className="stat-body">
            <span className="stat-value">{teamCount}</span>
            <span className="stat-label">Team Members</span>
          </div>
        </div>
      </div>

      <div className="table-card ui-card p-0 overflow-hidden">
        <div className="p-5 d-flex justify-between items-center flex-wrap gap-3">
          <h2 className="ui-card-title mb-0">All System Accounts</h2>
        </div>

        <table className="data-table w-full">
          <thead>
            <tr>
              <th>User Profile</th>
              <th>Assigned Role</th>
              <th>Account Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <UserTableRow
                key={user.username}
                user={user}
                currentUser={currentUser}
                openEditModal={openEditModal}
                handleDeleteClick={handleDeleteClick}
                fetchUsers={fetchUsers}
                triggerUserReload={triggerUserReload}
                allUsers={filteredUsers}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminOverviewTab({
  allPackages,
  handleApproveFinalAdmin,
  setSelectedPackageId,
  setActiveNav,
  currentUser,
}) {
  const pendingAdminApprovals = allPackages.filter(
    (p) => !p.finalAdminApproved && !p.deployed
  );
  const completedPackages = allPackages.filter(
    (p) => p.finalAdminApproved || p.deployed
  );

  return (
    <div>
      <section className="mb-8">
        <div className="d-flex justify-between items-center mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-extrabold text-main mb-1">
              Admin Final Release Approvals Overview ({pendingAdminApprovals.length})
            </h2>
            <p className="text-sm text-muted mb-0">
              Grant final release approvals below. 
            </p>
          </div>
          {pendingAdminApprovals.length > 0 && (
            <span className="ui-badge ui-badge-success ui-badge-lg font-bold">
              {pendingAdminApprovals.length} Pending Approval
            </span>
          )}
        </div>

        {pendingAdminApprovals.length > 0 ? (
          <div className="d-flex flex-col gap-4 mb-6">
            {pendingAdminApprovals.map((pkg) => {
              const isQaPassed = pkg.testingTlApproved;
              return (
                <div
                  key={pkg.id}
                  className={`qa-banner-card d-flex justify-between items-center flex-wrap gap-4 ${isQaPassed ? 'qa-approved-banner' : ''}`}
                >
                  <div className="flex-1">
                    <div className="d-flex items-center gap-3 mb-2 flex-wrap">
                      <span className="asset-size-tag text-xs uppercase">{pkg.project || 'Project'}</span>
                      <h3 className="qa-banner-title mb-0">{pkg.name}</h3>
                      <span className={`status-badge ${isQaPassed ? 'approved' : 'pending'}`}>
                        {isQaPassed ? 'Test Pass Approved (Ready)' : 'Pipeline Pending Test'}
                      </span>
                    </div>

                    {(pkg.stagingUrl || pkg.demoUrl) && (
                      <div className="text-xs text-muted mb-1">
                        <strong>Staging Link:</strong>{' '}
                        <a href={pkg.stagingUrl || pkg.demoUrl} target="_blank" rel="noreferrer" className="testing-staging-link font-bold">
                          {pkg.stagingUrl || pkg.demoUrl}
                        </a>
                      </div>
                    )}
                    <div className="qa-banner-subtitle mt-1">
                      {isQaPassed
                        ? 'Testing complete. Click button on right to grant final release approval for DevOps deployment.'
                        : 'Package in pipeline. Admin can grant final release approval after Test passes.'}
                    </div>
                  </div>

                  <div className="d-flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPackageId(pkg.id);
                        setActiveNav('projects');
                      }}
                      className="btn-secondary"
                    >
                      View Details
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isQaPassed) {
                          alert('Cannot approve final release: Testing pass has not been approved by the Testing team yet.');
                          return;
                        }
                        handleApproveFinalAdmin(pkg.id);
                      }}
                      disabled={!isQaPassed}
                      className={`btn-approve-qa-main ${!isQaPassed ? 'disabled' : ''}`}
                    >
                      {isQaPassed ? 'Approve Final Release \u2192' : 'Pending Test Approval'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="qa-banner-card text-center text-muted mb-6">
            All task packages have received Admin release approval or are deployed live in production.
          </div>
        )}

        {completedPackages.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-muted uppercase mb-3">Approved &amp; Live Packages ({completedPackages.length})</h3>
            <div className="d-flex flex-col gap-3">
              {completedPackages.map((pkg) => (
                <div key={pkg.id} className="qa-banner-card qa-approved-banner d-flex justify-between items-center flex-wrap gap-3">
                  <div>
                    <div className="d-flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted font-bold uppercase">{pkg.project}</span>
                      <h4 className="text-sm font-bold text-main mb-0">{pkg.name}</h4>
                      <span className="status-badge completed">
                        {pkg.deployed ? 'Live Production' : 'Admin Release Approved'}
                      </span>
                    </div>
                  </div>
                  <span className="status-badge completed font-bold">
                    {pkg.deployed ? 'Live in Production' : 'Sent to DevOps'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <RoleHistoryView
        defaultRole="All Roles"
        selectedProject="All Projects"
        currentUser={currentUser}
        onSelectPackage={(pkgId) => {
          setSelectedPackageId(pkgId);
          setActiveNav('projects');
        }}
      />
    </div>
  );
}

function getPkgBadgeInfo(selectedPackage) {
  if (selectedPackage.deployed) {
    return { pkgBadgeClass: 'completed', pkgBadgeLabel: 'Live Production Deployed' };
  }
  if (selectedPackage.finalAdminApproved) {
    return { pkgBadgeClass: 'completed', pkgBadgeLabel: 'Approved for Production' };
  }
  if (selectedPackage.testingTlApproved) {
    return { pkgBadgeClass: 'approved', pkgBadgeLabel: 'Test Pass Approved - Awaiting Admin Sign-Off' };
  }
  return { pkgBadgeClass: 'pending', pkgBadgeLabel: 'In Development Pipeline' };
}

function getTesterSignOffText(selectedPackage, openBugsCount) {
  if (selectedPackage.testingTlApproved) return 'Test Pass Approved';
  if (openBugsCount > 0) return `${openBugsCount} Bugs Open`;
  return 'Pending';
}

function AdminPackageStatusBanner({ selectedPackage, currentUser, triggerReload }) {
  if (selectedPackage.deployed) {
    return (
      <div className="qa-banner-card qa-approved-banner mb-6 d-flex justify-between items-center flex-wrap gap-3">
        <div>
          <h3 className="qa-banner-title">Live Production Active</h3>
          <p className="qa-banner-subtitle">
            This task module is live in production: <a href={selectedPackage.demoUrl} target="_blank" rel="noreferrer" className="testing-staging-link font-bold">{selectedPackage.demoUrl}</a>
          </p>
        </div>
        <span className="status-badge completed">Live in Production</span>
      </div>
    );
  }

  const isFinalApproved = selectedPackage.finalPmApproved || selectedPackage.finalAdminApproved;
  if (isFinalApproved) {
    return (
      <div className="qa-banner-card qa-approved-banner mb-6 d-flex justify-between items-center flex-wrap gap-3">
        <div>
          <h3 className="qa-banner-title">
            Final Release Approved by Project Manager ({selectedPackage.finalPmApprovedBy || selectedPackage.finalAdminApprovedBy || 'Project Manager'})
          </h3>
          <p className="qa-banner-subtitle">
            Project Manager final approval granted. DevOps team has been dispatched to proceed with Production Deployment.
          </p>
        </div>
        <span className="status-badge completed">Authorized for Production</span>
      </div>
    );
  }

  const isTestingApproved = selectedPackage.testingTlApproved;
  const isCtoApproved = selectedPackage.ctoApproved;
  const userRole = currentUser?.role || '';
  const isCTO = userRole.includes('CTO');
  const isPM = userRole.includes('Project Manager') || userRole === 'Admin';
  const projName = (selectedPackage.project || '').trim().toLowerCase();
  const isClassmateOrCareerMate = projName === 'career mate' || projName === 'careermate' || projName === 'classmate' || projName === 'class mate';

  const handleApproveCTO = async () => {
    if (isClassmateOrCareerMate) {
      alert('CTO approval is not allowed for Classmate and Career Mate projects. CTO can only approve other projects.');
      return;
    }
    try {
      await api.packages.approveCTO(selectedPackage.id, currentUser?.username);
      if (triggerReload) triggerReload();
    } catch (err) {
      alert(err.message || 'Failed to grant CTO release sign-off.');
    }
  };

  const handleApproveFinalPM = async () => {
    try {
      await api.packages.approveFinalPM(selectedPackage.id, currentUser?.username);
      if (triggerReload) triggerReload();
    } catch (err) {
      alert(err.message || 'Failed to grant Project Manager final approval.');
    }
  };

  return (
    <div className={`qa-banner-card mb-6 d-flex justify-between items-center flex-wrap gap-4 ${(isTestingApproved && (isCtoApproved || isClassmateOrCareerMate)) ? 'qa-approved-banner' : ''}`}>
      <div>
        <h3 className="qa-banner-title">
          {!isTestingApproved 
            ? 'Awaiting Test Pass Approval' 
            : isClassmateOrCareerMate
              ? 'Test Pass Approved — Awaiting Project Manager Final Production Approval'
              : !isCtoApproved 
                ? 'Test Pass Approved — Sent to CTO for Release Sign-Off' 
                : 'CTO Release Signed Off — Ready for Production'}
        </h3>
        <p className="qa-banner-subtitle">
          {!isTestingApproved 
            ? 'Testing team must approve Test pass before release approval.' 
            : isClassmateOrCareerMate
              ? 'Project Manager final approval will authorize DevOps to deploy to live production.'
              : !isCtoApproved 
                ? 'CTO release sign-off will authorize DevOps to deploy to live production.' 
                : 'CTO has signed off. DevOps team is authorized to deploy to live production.'}
        </p>
        {isCtoApproved && !isClassmateOrCareerMate && (
          <p className="text-xs text-emerald-800 font-bold mb-0 mt-1" style={{ color: '#065f46' }}>
            CTO Sign-Off: Approved by {selectedPackage.ctoApprovedBy || 'CTO'}
          </p>
        )}
      </div>

      {isCTO && !isCtoApproved && !isClassmateOrCareerMate && (
        <button
          type="button"
          onClick={handleApproveCTO}
          disabled={!isTestingApproved}
          className={`btn-approve-qa-main ${!isTestingApproved ? 'disabled' : ''}`}
        >
          {isTestingApproved ? 'Grant CTO Release Sign-Off \u2192' : 'Pending Test Pass Approval'}
        </button>
      )}

      {isPM && (
        <button
          type="button"
          onClick={handleApproveFinalPM}
          disabled={!isTestingApproved}
          className={`btn-approve-qa-main ${!isTestingApproved ? 'disabled' : ''}`}
        >
          {isTestingApproved ? 'Grant PM Final Production Approval \u2192' : 'Pending Test Approval'}
        </button>
      )}
    </div>
  );
}

function AdminContentAndDesignSection({ selectedPackage, currentUser, triggerReload, onRejectItem }) {
  const contentFiles = selectedPackage.contentFiles || [];
  const designCount = selectedPackage.designFiles?.length || 0;
  const isPM = currentUser?.role?.includes('Project Manager') || currentUser?.role === 'Admin' || currentUser?.role === 'CTO';

  const handleApproveContentDoc = async (reqId) => {
    try {
      await api.packages.approveContentTL(selectedPackage.id, reqId, currentUser?.username);
      if (triggerReload) triggerReload();
    } catch (err) {
      alert(err.message || 'Failed to approve requirement doc.');
    }
  };

  const handleApproveDesignAll = async () => {
    try {
      await api.packages.approveDesignPMAll(selectedPackage.id, currentUser?.username);
      if (triggerReload) triggerReload();
    } catch (err) {
      alert(err.message || 'Failed to approve designs.');
    }
  };

  return (
    <section className="digital-section">
      <h2 className="section-title mb-3">Content Requirements &amp; Copy Docs</h2>
      {contentFiles.length > 0 ? (
        <div className="d-flex flex-col gap-2 mb-4">
          {contentFiles.map((doc) => (
            <div key={doc.id} className="p-3 rounded-lg bg-subtle border d-flex justify-between items-center flex-wrap gap-2">
              <div>
                <span className="text-sm font-extrabold text-main">{doc.name}</span>
                {doc.fileName && <p className="text-xs text-muted mb-0">{doc.fileName} ({doc.fileSize})</p>}
                {doc.tlApproval === 'Rejected' && doc.rejectionReason && (
                  <p className="text-xs text-danger font-bold mb-0 mt-1" style={{ color: '#dc2626' }}>
                    Rejection Reason: {doc.rejectionReason}
                  </p>
                )}
              </div>
              <div className="d-flex items-center gap-2">
                <span className={`ui-badge ui-badge-sm ${doc.tlApproval === 'Approved' ? 'ui-badge-success' : (doc.tlApproval === 'Rejected' ? 'ui-badge-danger' : 'ui-badge-warning')}`}>
                  {doc.tlApproval === 'Approved' ? `Approved by PM (${doc.tlApprovedBy || 'PM'})` : (doc.tlApproval === 'Rejected' ? 'Rejected by PM' : 'Pending PM Approval')}
                </span>
                {isPM && doc.fileName && (
                  <div className="d-flex gap-1">
                    {doc.tlApproval !== 'Approved' && (
                      <button
                        type="button"
                        onClick={() => handleApproveContentDoc(doc.id)}
                        className="ui-btn ui-btn-success ui-btn-sm"
                        style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                      >
                        Approve
                      </button>
                    )}
                    {doc.tlApproval !== 'Approved' && doc.tlApproval !== 'Rejected' && (
                      <button
                        type="button"
                        onClick={() => onRejectItem({ type: 'content', id: doc.id, name: doc.name })}
                        className="ui-btn ui-btn-danger ui-btn-sm"
                        style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                      >
                        Reject
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">No content docs attached yet.</p>
      )}

      <h2 className="section-title mt-6 mb-3">Design Mockups &amp; Figma</h2>
      {selectedPackage.figmaLink && (
        <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 mb-3 d-flex justify-between items-center">
          <span className="text-xs font-bold text-purple-900">Figma Design Canvas:</span>
          <a href={selectedPackage.figmaLink} target="_blank" rel="noreferrer" className="text-xs font-bold text-purple-700 underline">
            Open Figma Link &rarr;
          </a>
        </div>
      )}
      <div className="p-3 rounded-lg bg-subtle border d-flex justify-between items-center flex-wrap gap-2">
        <div>
          <span className="text-sm font-bold text-main">
            Design Mockups: {designCount} assets attached
          </span>
          {selectedPackage.designFiles?.some(f => f.tlApproval === 'Rejected') && (
            <p className="text-xs text-danger font-bold mb-0 mt-1" style={{ color: '#dc2626' }}>
              Rejection Reason: {selectedPackage.designFiles.find(f => f.tlApproval === 'Rejected')?.rejectionReason || 'Designs rejected.'}
            </p>
          )}
        </div>
        <div className="d-flex items-center gap-2">
          <span className={`ui-badge ui-badge-sm ${selectedPackage.designTlApproved ? 'ui-badge-success' : 'ui-badge-warning'}`}>
            {selectedPackage.designTlApproved ? 'Approved by PM' : 'Pending PM Approval'}
          </span>
          {isPM && designCount > 0 && (
            <div className="d-flex gap-1">
              {!selectedPackage.designTlApproved && (
                <button
                  type="button"
                  onClick={handleApproveDesignAll}
                  className="ui-btn ui-btn-success ui-btn-sm"
                  style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                >
                  Approve Design
                </button>
              )}
              {!selectedPackage.designTlApproved && (
                <button
                  type="button"
                  onClick={() => onRejectItem({ type: 'design_all', name: 'Designs' })}
                  className="ui-btn ui-btn-danger ui-btn-sm"
                  style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                >
                  Reject Design
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AdminDevAndDevOpsSection({ selectedPackage, devBuildFilesList, openBugsCount, testerSignOffText }) {
  const previewUrl = selectedPackage.stagingUrl || selectedPackage.demoUrl;
  const bugs = selectedPackage.bugs || [];

  return (
    <section className="digital-section">
      <h2 className="section-title mb-3">Developer Source Code Builds</h2>
      {devBuildFilesList.length > 0 ? (
        <div className="d-flex flex-col gap-2 mb-4">
          {devBuildFilesList.map((build) => (
            <div key={build.id} className="p-3 rounded-lg bg-subtle border d-flex justify-between items-center flex-wrap gap-2">
              <div>
                <span className="text-sm font-extrabold text-main">{build.name || 'Build Zip'}</span>
                <p className="text-xs text-muted mb-0">{build.fileName} ({build.fileSize})</p>
              </div>
              <span className="ui-badge ui-badge-success ui-badge-sm">Code Build Ready</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted mb-4">No developer build zip uploaded yet.</p>
      )}

      <h2 className="section-title mt-6 mb-3">DevOps Staging &amp; Test Sign-Off</h2>
      <div className="p-4 rounded-lg bg-subtle border mb-3">
        <div className="text-xs font-bold text-muted uppercase mb-1">Staging Preview URL:</div>
        {previewUrl ? (
          <a href={previewUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-sky-600 underline">
            {previewUrl} &rarr;
          </a>
        ) : (
          <span className="text-xs text-muted">Staging link not yet submitted by DevOps</span>
        )}
      </div>

      <div className="p-4 rounded-lg bg-subtle border">
        <div className="d-flex justify-between items-center flex-wrap gap-2 mb-1">
          <span className="text-xs font-bold text-muted uppercase">Tester Sign-Off:</span>
          <span className={`ui-badge ui-badge-sm ${selectedPackage.testingTlApproved ? 'ui-badge-success' : 'ui-badge-warning'}`}>
            {testerSignOffText}
          </span>
        </div>
        {bugs.length > 0 && (
          <p className="text-xs text-muted mb-0 mt-2">
            Total Bug Reports: {bugs.length} ({openBugsCount} open, {bugs.length - openBugsCount} resolved)
          </p>
        )}
      </div>
    </section>
  );
}

function AdminPackageDetailsView({
  selectedPackage,
  selectedProject,
  setSelectedPackageId,
  handleApproveFinalAdmin,
  currentUser,
  triggerReload,
  onRejectItem,
}) {
  const devBuildFilesList = selectedPackage.devBuildFiles || (selectedPackage.devBuildFile ? [selectedPackage.devBuildFile] : []);
  const openBugsCount = selectedPackage.bugs ? selectedPackage.bugs.filter((b) => !b.resolved).length : 0;
  const { pkgBadgeClass, pkgBadgeLabel } = getPkgBadgeInfo(selectedPackage);
  const testerSignOffText = getTesterSignOffText(selectedPackage, openBugsCount);

  return (
    <div>
      <div className="content-header mb-6">
        <div className="navigation-breadcrumbs">
          <button onClick={() => setSelectedPackageId(null)} className="back-btn">
            &larr; Back to {selectedProject || 'Projects'}
          </button>
          <span className="breadcrumb-separator">/</span>
          <span className="current-breadcrumb">{selectedPackage.name}</span>
        </div>
        <div className="d-flex justify-between items-center flex-wrap gap-4 mt-2">
          <div>
            <h1 className="dashboard-title">{selectedPackage.name} - Admin Oversight &amp; Release Control</h1>
            <p className="dashboard-subtitle">{selectedPackage.project || 'Project'} · Administrator / CTO Control</p>
          </div>
          <div>
            <span className={`status-badge ${pkgBadgeClass} ui-badge-lg`}>
              {pkgBadgeLabel}
            </span>
          </div>
        </div>
      </div>

      <AdminPackageStatusBanner
        selectedPackage={selectedPackage}
        handleApproveFinalAdmin={handleApproveFinalAdmin}
        currentUser={currentUser}
        triggerReload={triggerReload}
      />

      <div className="grid-2col mb-8">
        <AdminContentAndDesignSection
          selectedPackage={selectedPackage}
          currentUser={currentUser}
          triggerReload={triggerReload}
          onRejectItem={onRejectItem}
        />
        <AdminDevAndDevOpsSection
          selectedPackage={selectedPackage}
          devBuildFilesList={devBuildFilesList}
          openBugsCount={openBugsCount}
          testerSignOffText={testerSignOffText}
          currentUser={currentUser}
          triggerReload={triggerReload}
          onRejectItem={onRejectItem}
        />
      </div>
    </div>
  );
}

function getAdminDashboardContent({
  activeNav,
  selectedPackage,
  users,
  packagesState,
  currentUser,
  openAddModal,
  openEditModal,
  handleDeleteClick,
  fetchUsers,
  triggerUserReload,
  selectedProject,
  setSelectedProject,
  setSelectedPackageId,
  setActiveNav,
  handleApproveFinalAdmin,
  searchQuery,
  triggerReload,
  onRejectItem,
}) {
  if (currentUser?.role === 'Admin') {
    const totalUsers = users.length;
    const adminCount = users.filter((u) => u.role === 'Admin').length;
    const teamCount = users.filter((u) => u.role !== 'Admin').length;
    const tlCount = users.filter((u) => u.isTeamLeader).length;
    const filteredUsers = users.filter((u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <UserManagementTab
        openAddModal={openAddModal}
        totalUsers={totalUsers}
        adminCount={adminCount}
        tlCount={tlCount}
        teamCount={teamCount}
        filteredUsers={filteredUsers}
        currentUser={currentUser}
        openEditModal={openEditModal}
        handleDeleteClick={handleDeleteClick}
        fetchUsers={fetchUsers}
        triggerUserReload={triggerUserReload}
      />
    );
  }

  if (activeNav === 'users' && !selectedPackage) {
    if (currentUser?.role !== 'Admin') {
      return (
        <div className="qa-banner-card text-center text-muted mb-6" style={{ padding: '2rem' }}>
          <h3 className="text-xl font-extrabold text-main mb-2">Access Denied</h3>
          <p className="text-sm text-muted mb-0">User Management is restricted to Admin accounts only.</p>
        </div>
      );
    }
    const totalUsers = users.length;
    const adminCount = users.filter((u) => u.role === 'Admin').length;
    const teamCount = users.filter((u) => u.role !== 'Admin').length;
    const tlCount = users.filter((u) => u.isTeamLeader).length;
    const filteredUsers = users.filter((u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <UserManagementTab
        openAddModal={openAddModal}
        totalUsers={totalUsers}
        adminCount={adminCount}
        tlCount={tlCount}
        teamCount={teamCount}
        filteredUsers={filteredUsers}
        currentUser={currentUser}
        openEditModal={openEditModal}
        handleDeleteClick={handleDeleteClick}
        fetchUsers={fetchUsers}
        triggerUserReload={triggerUserReload}
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

  if (activeNav === 'dashboard' && !selectedPackage) {
    return (
      <AdminOverviewTab
        allPackages={packagesState.packages || []}
        handleApproveFinalAdmin={handleApproveFinalAdmin}
        setSelectedPackageId={setSelectedPackageId}
        setActiveNav={setActiveNav}
        currentUser={currentUser}
      />
    );
  }

  if (selectedPackage) {
    return (
      <AdminPackageDetailsView
        selectedPackage={selectedPackage}
        selectedProject={selectedProject}
        setSelectedPackageId={setSelectedPackageId}
        handleApproveFinalAdmin={handleApproveFinalAdmin}
        currentUser={currentUser}
        triggerReload={triggerReload}
        onRejectItem={onRejectItem}
      />
    );
  }

  return (
    <ProjectsView
      packages={packagesState.packages}
      searchQuery={searchQuery}
      selectedProject={selectedProject}
      onSelectProject={(proj) => {
        setSelectedProject(proj);
        setSelectedPackageId(null);
      }}
      onSelectPackage={(pkgId) => {
        setSelectedPackageId(pkgId);
        setActiveNav('projects');
      }}
      renderStatus={renderAdminStatus}
      triggerReload={triggerReload}
      currentUser={currentUser}
      onApproveAdmin={handleApproveFinalAdmin}
    />
  );
}

function AdminDashboard({ currentUser, onLogout, onUpdateUser }) {
  const packagesState = usePackages('All Projects', currentUser);
  const {
    activeNav, setActiveNav,
    selectedProject, setSelectedProject,
    setSelectedPackageId,
    selectedPackage, searchQuery,
  } = packagesState;

  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUsername, setSelectedUsername] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('Content Team');

  const [formIsTeamLeader, setFormIsTeamLeader] = useState(false);
  const [formError, setFormError] = useState('');
  const [viewedPdf, setViewedPdf] = useState(null);

  const triggerReload = packagesState.triggerReload;

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.users.getAll();
      setUsers(data);
    } catch { }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    if (currentUser?.role === 'Admin') {
      setActiveNav('users');
    }
  }, [currentUser, setActiveNav]);

  useEffect(() => {
    const handleStorageChange = (e) => { if (e.key === 'pm_users') fetchUsers(); };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchUsers]);

  const triggerUserReload = () => {
    fetchUsers();
    localStorage.setItem('pm_users', Date.now().toString());
  };

  const openAddModal = () => {
    setIsEditing(false);
    setFormUsername('');
    setFormPassword('');
    setFormRole('Content Team');
    setFormIsTeamLeader(false);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setIsEditing(true);
    setSelectedUsername(user.username);
    setFormUsername(user.username);
    setFormPassword('');
    setFormRole(user.role);
    setFormIsTeamLeader(user.isTeamLeader === true || user.isTeamLeader === 1 || user.isTeamLeader === '1');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (usernameToDelete) => {
    if (usernameToDelete.toLowerCase() === 'admin') {
      alert('Default admin account cannot be deleted.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete user "${usernameToDelete}"?`)) {
      try {
        await api.users.delete(usernameToDelete);
        const updatedList = await api.users.getAll();
        setUsers(updatedList);
        triggerUserReload();
      } catch { }
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const cleanUsername = formUsername.trim().toLowerCase();
    const cleanPassword = formPassword.trim();

    if (!isEditing) {
      if (!cleanUsername) {
        setFormError('Please enter a username.');
        return;
      }
      if (!cleanPassword) {
        setFormError('Please enter a password.');
        return;
      }
      const complexityErr = validatePasswordComplexity(cleanPassword);
      if (complexityErr) {
        setFormError(complexityErr);
        return;
      }
    } else {
      if (cleanPassword !== '') {
        const complexityErr = validatePasswordComplexity(cleanPassword);
        if (complexityErr) {
          setFormError(complexityErr);
          return;
        }
      }
    }

    try {
      const isTL = (formRole === 'Admin' || formRole === 'CTO') ? 0 : (formIsTeamLeader ? 1 : 0);
      if (isTL === 1) {
        const existingTL = users.find(
          (u) => u.role === formRole && (u.isTeamLeader === true || u.isTeamLeader === 1 || u.isTeamLeader === '1') && u.username.toLowerCase() !== cleanUsername
        );
        if (existingTL) {
          setFormError(`The ${formRole} already has an assigned Team Leader (${existingTL.username}). Each team can only have one Team Leader.`);
          return;
        }
      }
      if (isEditing) {
        await api.users.update(selectedUsername, {
          password: cleanPassword,
          role: formRole,
          isTeamLeader: isTL,
        });
      } else {
        if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
          setFormError('Username already exists.');
          return;
        }
        await api.users.create({
          username: cleanUsername,
          password: cleanPassword,
          role: formRole,
          isTeamLeader: isTL,
        });
      }
      const updatedList = await api.users.getAll();
      setUsers(updatedList);
      triggerUserReload();
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Error saving user.');
    }
  };

  const handleApproveFinalAdmin = async (packageId) => {
    try {
      const pkg = packages.find((p) => p.id === packageId);
      const projName = (pkg?.project || '').trim().toLowerCase();
      const isClassmateOrCareerMate = projName === 'career mate' || projName === 'careermate' || projName === 'classmate' || projName === 'class mate';

      if (isClassmateOrCareerMate) {
        await api.packages.approveFinalAdmin(packageId, currentUser?.username || 'Project Manager');
      } else {
        await api.packages.approveCTO(packageId, currentUser?.username || 'CTO');
      }
      triggerReload();
    } catch (err) {
      alert(err.message || 'Failed to approve package.');
    }
  };

  const [rejectionTarget, setRejectionTarget] = useState(null);
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);

  const handleConfirmRejection = async (reason) => {
    if (!rejectionTarget || !selectedPackage) return;
    setIsSubmittingRejection(true);
    try {
      const pmUser = currentUser?.username || 'Project Manager';
      const pkgId = selectedPackage.id;

      if (rejectionTarget.type === 'content') {
        await api.packages.rejectContentPM(pkgId, rejectionTarget.id, pmUser, reason);
      } else if (rejectionTarget.type === 'design_all') {
        await api.packages.rejectDesignPMAll(pkgId, pmUser, reason);
      } else if (rejectionTarget.type === 'design_file') {
        await api.packages.rejectDesignPM(pkgId, rejectionTarget.id, pmUser, reason);
      } else if (rejectionTarget.type === 'build') {
        await api.packages.rejectBuildPM(pkgId, rejectionTarget.id, pmUser, reason);
      } else if (rejectionTarget.type === 'devops') {
        await api.packages.rejectDevopsPM(pkgId, pmUser, reason);
      } else if (rejectionTarget.type === 'testing') {
        await api.packages.rejectTestingPM(pkgId, pmUser, reason);
      }

      setRejectionTarget(null);
      triggerReload();
    } catch (err) {
      alert(err.message || 'Failed to submit rejection.');
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  const content = getAdminDashboardContent({
    activeNav,
    selectedPackage,
    users,
    packagesState,
    currentUser,
    openAddModal,
    openEditModal,
    handleDeleteClick,
    fetchUsers,
    triggerUserReload,
    selectedProject,
    setSelectedProject,
    setSelectedPackageId,
    setActiveNav,
    handleApproveFinalAdmin,
    searchQuery,
    triggerReload,
    onRejectItem: (target) => setRejectionTarget(target),
  });

  return (
    <DashboardShell
      currentUser={currentUser}
      onLogout={onLogout}
      onUpdateUser={onUpdateUser}
      packagesState={packagesState}
      viewedPdf={viewedPdf}
      setViewedPdf={setViewedPdf}
      overlay={
        <>
          <UserModal
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            isEditing={isEditing}
            formUsername={formUsername}
            setFormUsername={setFormUsername}
            formPassword={formPassword}
            setFormPassword={setFormPassword}
            formRole={formRole}
            setFormRole={setFormRole}
            formIsTeamLeader={formIsTeamLeader}
            setFormIsTeamLeader={setFormIsTeamLeader}
            formError={formError}
            handleFormSubmit={handleFormSubmit}
          />
          {rejectionTarget && (
            <RejectionModal
              title={`Reject ${rejectionTarget.name || 'Submission'}`}
              itemName={rejectionTarget.name}
              onConfirm={handleConfirmRejection}
              onCancel={() => setRejectionTarget(null)}
              isSubmitting={isSubmittingRejection}
            />
          )}
        </>
      }
    >
      {content}
    </DashboardShell>
  );
}

export default AdminDashboard;

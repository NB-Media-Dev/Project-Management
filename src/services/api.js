const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Empty string means Vite dev proxy or same-origin production deployment
    return window.API_BASE_URL || '';
  }
  return 'http://localhost:3001';
};

const handleResponse = async (response) => {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData?.error) {
        errorMessage = errorData.error;
      }
    } catch {}
    throw new Error(errorMessage);
  }
  return response.json();
};

export const api = {
  auth: {
    login: async (username, password) => {
      const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      return handleResponse(res);
    },
  },

  users: {
    getAll: async () => {
      const res = await fetch(`${getBaseUrl()}/api/users`);
      return handleResponse(res);
    },
    create: async (userData) => {
      const res = await fetch(`${getBaseUrl()}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      return handleResponse(res);
    },
    update: async (username, userData) => {
      const res = await fetch(`${getBaseUrl()}/api/users/${encodeURIComponent(username)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      return handleResponse(res);
    },
    delete: async (username) => {
      const res = await fetch(`${getBaseUrl()}/api/users/${encodeURIComponent(username)}`, {
        method: 'DELETE',
      });
      return handleResponse(res);
    },
    changePassword: async (username, currentPassword, newPassword) => {
      const res = await fetch(`${getBaseUrl()}/api/users/${encodeURIComponent(username)}/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      return handleResponse(res);
    },
    updateAvatar: async (username, formData) => {
      const res = await fetch(`${getBaseUrl()}/api/users/${encodeURIComponent(username)}/avatar`, {
        method: 'POST',
        body: formData,
      });
      return handleResponse(res);
    },
    removeAvatar: async (username) => {
      const res = await fetch(`${getBaseUrl()}/api/users/${encodeURIComponent(username)}/avatar`, {
        method: 'DELETE',
      });
      return handleResponse(res);
    },
  },

  projects: {
    getAll: async () => {
      const res = await fetch(`${getBaseUrl()}/api/projects`);
      return handleResponse(res);
    },
    create: async (name) => {
      const res = await fetch(`${getBaseUrl()}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      return handleResponse(res);
    },
    delete: async (name) => {
      const res = await fetch(`${getBaseUrl()}/api/projects/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      return handleResponse(res);
    },
  },

  packages: {
    getAll: async () => {
      const res = await fetch(`${getBaseUrl()}/api/packages`);
      return handleResponse(res);
    },
    create: async (packageData) => {
      const res = await fetch(`${getBaseUrl()}/api/packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packageData),
      });
      return handleResponse(res);
    },
    update: async (id, packageData) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packageData),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${id}`, {
        method: 'DELETE',
      });
      return handleResponse(res);
    },
    addContentReq: async (packageId, name) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/files/content/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      return handleResponse(res);
    },
    updateContentReqTitle: async (packageId, reqId, name) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/files/content/${reqId}/title`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      return handleResponse(res);
    },
    deleteContentReqRow: async (packageId, reqId) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/files/content/${reqId}/row`, {
        method: 'DELETE',
      });
      return handleResponse(res);
    },
    uploadContentFile: async (packageId, reqId, formData) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/files/content/${reqId}`, {
        method: 'POST',
        body: formData,
      });
      return handleResponse(res);
    },
    deleteContentFile: async (packageId, reqId) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/files/content/${reqId}`, {
        method: 'DELETE',
      });
      return handleResponse(res);
    },
    uploadDesignFile: async (packageId, formData) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/files/design`, {
        method: 'POST',
        body: formData,
      });
      return handleResponse(res);
    },
    updateDesignFile: async (packageId, fileId, formData) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/files/design/${fileId}`, {
        method: 'PUT',
        body: formData,
      });
      return handleResponse(res);
    },
    deleteDesignFile: async (packageId, fileId) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/files/design/${fileId}`, {
        method: 'DELETE',
      });
      return handleResponse(res);
    },
    createDevBuild: async (packageId, formData) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/files/build`, {
        method: 'POST',
        body: formData,
      });
      return handleResponse(res);
    },
    updateDevBuild: async (packageId, fileId, formData) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/files/build/${fileId}`, {
        method: 'PUT',
        body: formData,
      });
      return handleResponse(res);
    },
    deleteDevBuild: async (packageId, fileId) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/files/build/${fileId}`, {
        method: 'DELETE',
      });
      return handleResponse(res);
    },
    submitDevops: async (packageId) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/submit-devops`, {
        method: 'PUT',
      });
      return handleResponse(res);
    },
    deploy: async (packageId, deployData) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/deploy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deployData),
      });
      return handleResponse(res);
    },
    createBug: async (packageId, bugData) => {
      const isFormData = typeof FormData !== 'undefined' && bugData instanceof FormData;
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/bugs`, {
        method: 'POST',
        headers: isFormData ? undefined : { 'Content-Type': 'application/json' },
        body: isFormData ? bugData : JSON.stringify(bugData),
      });
      return handleResponse(res);
    },
    resolveBug: async (packageId, bugId) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/bugs/${bugId}/resolve`, {
        method: 'PUT',
      });
      return handleResponse(res);
    },
    updateDueDate: async (packageId, dueDate) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/due-date`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate }),
      });
      return handleResponse(res);
    },
    approveContentTL: async (packageId, reqId, approvedBy) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/files/content/${reqId}/approve-tl`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy }),
      });
      return handleResponse(res);
    },
    approveContentAdmin: async (packageId, reqId, approvedBy) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/files/content/${reqId}/approve-admin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy }),
      });
      return handleResponse(res);
    },
    updateFigmaLink: async (packageId, figmaLink) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/figma-link`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ figmaLink }),
      });
      return handleResponse(res);
    },
    approveDesignTL: async (packageId, fileId, approvedBy) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/files/design/${fileId}/approve-tl`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy }),
      });
      return handleResponse(res);
    },
    approveDesignTLAll: async (packageId, approvedBy) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/approve-design-tl`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy }),
      });
      return handleResponse(res);
    },
    approveDesignAdmin: async (packageId, fileId, approvedBy) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/files/design/${fileId}/approve-admin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy }),
      });
      return handleResponse(res);
    },
    approveDevTL: async (packageId, fileId, approvedBy) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/files/build/${fileId}/approve-tl`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy }),
      });
      return handleResponse(res);
    },
    approveDevAdmin: async (packageId, fileId, approvedBy) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/files/build/${fileId}/approve-admin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy }),
      });
      return handleResponse(res);
    },
    createDesignFeedback: async (packageId, feedbackData) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/design-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData),
      });
      return handleResponse(res);
    },
    resolveDesignFeedback: async (packageId, feedbackId) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/design-feedback/${feedbackId}/resolve`, {
        method: 'PUT',
      });
      return handleResponse(res);
    },
    updateDevopsStaging: async (packageId, stagingData) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/devops-staging`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stagingData),
      });
      return handleResponse(res);
    },
    approveDevopsTL: async (packageId, approvedBy) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/approve-devops-tl`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy }),
      });
      return handleResponse(res);
    },
    approveDevopsAdmin: async (packageId, approvedBy) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/approve-devops-admin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy }),
      });
      return handleResponse(res);
    },
    approveTestingTL: async (packageId, approvedBy) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/approve-testing-tl`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy }),
      });
      return handleResponse(res);
    },
    approveCTO: async (packageId, approvedBy) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/approve-cto`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy }),
      });
      return handleResponse(res);
    },
    approveFinalPM: async (packageId, approvedBy) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/approve-final-pm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy }),
      });
      return handleResponse(res);
    },
    approveFinalAdmin: async (packageId, approvedBy) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/approve-final-admin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy }),
      });
      return handleResponse(res);
    },
    rejectContentPM: async (packageId, reqId, rejectedBy, reason) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/files/content/${reqId}/reject-pm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectedBy, reason }),
      });
      return handleResponse(res);
    },
    rejectDesignPM: async (packageId, fileId, rejectedBy, reason) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/files/design/${fileId}/reject-pm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectedBy, reason }),
      });
      return handleResponse(res);
    },
    approveDesignPMAll: async (packageId, approvedBy) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/approve-design-pm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy }),
      });
      return handleResponse(res);
    },
    rejectDesignPMAll: async (packageId, rejectedBy, reason) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/reject-design-pm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectedBy, reason }),
      });
      return handleResponse(res);
    },
    approveBuildPM: async (packageId, fileId, approvedBy) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/files/build/${fileId}/approve-pm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy }),
      });
      return handleResponse(res);
    },
    rejectBuildPM: async (packageId, fileId, rejectedBy, reason) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/files/build/${fileId}/reject-pm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectedBy, reason }),
      });
      return handleResponse(res);
    },
    approveDevopsPM: async (packageId, approvedBy) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/approve-devops-pm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy }),
      });
      return handleResponse(res);
    },
    rejectDevopsPM: async (packageId, rejectedBy, reason) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/reject-devops-pm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectedBy, reason }),
      });
      return handleResponse(res);
    },
    approveTestingPM: async (packageId, approvedBy) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/approve-testing-pm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy }),
      });
      return handleResponse(res);
    },
    rejectTestingPM: async (packageId, rejectedBy, reason) => {
      const res = await fetch(`${getBaseUrl()}/api/packages/${packageId}/reject-testing-pm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectedBy, reason }),
      });
      return handleResponse(res);
    },
  },

  notifications: {
    get: async (role, username) => {
      const res = await fetch(
        `${getBaseUrl()}/api/notifications?role=${encodeURIComponent(role)}&username=${encodeURIComponent(username)}`
      );
      return handleResponse(res);
    },
    markAllRead: async (role, username) => {
      const res = await fetch(
        `${getBaseUrl()}/api/notifications/read?role=${encodeURIComponent(role)}&username=${encodeURIComponent(username)}`,
        { method: 'PUT' }
      );
      return handleResponse(res);
    },
    markRead: async (id, username) => {
      const res = await fetch(
        `${getBaseUrl()}/api/notifications/${id}/read?username=${encodeURIComponent(username)}`,
        { method: 'PUT' }
      );
      return handleResponse(res);
    },
  },

  history: {
    get: async (role, project) => {
      try {
        const params = new URLSearchParams();
        if (role) params.append('role', role);
        if (project) params.append('project', project);
        const res = await fetch(`${getBaseUrl()}/api/history?${params.toString()}`);
        if (!res.ok) return [];
        return await res.json();
      } catch {
        return [];
      }
    },
  },
};

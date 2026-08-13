import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

function EditPackageModal({ pkg, onSubmit, onCancel }) {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState(pkg?.name || '');
  const [projectType, setProjectType] = useState(pkg?.project || '');
  const [dueDate, setDueDate] = useState(pkg?.dueDate || '');

  useEffect(() => {
    if (pkg) {
      setName(pkg.name || '');
      setProjectType(pkg.project || '');
      setDueDate(pkg.dueDate || '');
    }
  }, [pkg]);

  useEffect(() => {
    api.projects.getAll().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setProjects(data);
        if (!projectType) setProjectType(data[0]);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only — projectType must NOT be a dep (causes infinite loop)

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim() === '') return;
    onSubmit({ name: name.trim(), project: projectType, dueDate });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content-sm">
        <h2 className="modal-title">Edit Task</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group mb-4">
            <label htmlFor="editTaskName" className="ui-label">Task / Module Name</label>
            <input
              type="text"
              id="editTaskName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Student Quiz, User Login"
              required
              className="mt-1 w-full"
            />
          </div>
          <div className="form-group mb-4">
            <label htmlFor="editProjectType" className="ui-label">Project</label>
            <select
              id="editProjectType"
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              className="mt-1 w-full"
            >
              {projects.map((proj) => (
                <option key={proj} value={proj}>{proj}</option>
              ))}
            </select>
          </div>
          <div className="form-group mb-6">
            <label htmlFor="editDueDate" className="ui-label">Due Date (Fixed by Content Team)</label>
            <input
              type="date"
              id="editDueDate"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full ui-input"
            />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
            <button type="submit" className="create-btn">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditPackageModal;

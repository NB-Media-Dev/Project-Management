import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
function CreatePackageModal({ onSubmit, onCancel, defaultProject, currentUser }) {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState('');
  const [projectType, setProjectType] = useState(defaultProject || '');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  const userRole = currentUser?.role || '';
  const isCTO = userRole.includes('CTO') || userRole === 'CTO';
  const isCareerMatePM = userRole.toLowerCase().includes('career mate');
  const isClassmatePM = userRole.toLowerCase().includes('classmate');

  useEffect(() => {
    api.projects.getAll().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        let availableProjects = data;
        if (isCTO) {
          availableProjects = data.filter(p => {
            const clean = p.trim().toLowerCase();
            return clean !== 'career mate' && clean !== 'careermate' && clean !== 'classmate' && clean !== 'class mate';
          });
        } else if (isCareerMatePM) {
          availableProjects = data.filter(p => {
            const clean = p.trim().toLowerCase();
            return clean === 'career mate' || clean === 'careermate';
          });
        } else if (isClassmatePM) {
          availableProjects = data.filter(p => {
            const clean = p.trim().toLowerCase();
            return clean === 'classmate' || clean === 'class mate';
          });
        }

        if (availableProjects.length > 0) {
          if (defaultProject && availableProjects.some(p => p.trim().toLowerCase() === defaultProject.trim().toLowerCase())) {
            const matched = availableProjects.filter(p => p.trim().toLowerCase() === defaultProject.trim().toLowerCase());
            setProjects(availableProjects);
            setProjectType(matched[0]);
          } else {
            setProjects(availableProjects);
            setProjectType(availableProjects[0]);
          }
        } else {
          setProjects(data);
          setProjectType(data[0]);
        }
      }
    }).catch(() => {});
  }, [defaultProject, isCTO, isCareerMatePM, isClassmatePM]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim() === '') return;
    const cleanProj = projectType.trim().toLowerCase();
    if (isCTO && (cleanProj === 'career mate' || cleanProj === 'careermate' || cleanProj === 'classmate' || cleanProj === 'class mate')) {
      alert('CTO cannot create new tasks for Classmate or Career Mate projects.');
      return;
    }
    if (isCareerMatePM && cleanProj !== 'career mate' && cleanProj !== 'careermate') {
      alert('Project Manager (Career Mate) can only create tasks for Career Mate project.');
      return;
    }
    if (isClassmatePM && cleanProj !== 'classmate' && cleanProj !== 'class mate') {
      alert('Project Manager (Classmate) can only create tasks for Classmate project.');
      return;
    }
    onSubmit({ name: name.trim(), project: projectType, description, dueDate });
  };
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">Create New Task</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="projectName">Task / Module Name</label>
              <input type="text" id="projectName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Student Quiz, User Login" required />
            </div>
            <div className="form-group">
              <label htmlFor="projectType">Select Project</label>
              <select id="projectType" value={projectType} onChange={(e) => setProjectType(e.target.value)}>
                {projects.map((proj) => <option key={proj} value={proj}>{proj}</option>)}
              </select>
            </div>
            <div className="form-group form-group-full">
              <label htmlFor="taskDueDate">Target Completion / Due Date</label>
              <input
                type="date"
                id="taskDueDate"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="ui-input"
              />
            </div>
            <div className="form-group form-group-full">
              <label htmlFor="subtaskDesc">Description &amp; Notes</label>
              <textarea id="subtaskDesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Write a simple description of what this task includes..." />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
            <button type="submit" className="create-btn">Create Task</button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default CreatePackageModal;
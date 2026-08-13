import React from 'react';

export const stripTimestampPrefix = (fileName) => {
  if (!fileName) return '';
  const idx = fileName.indexOf('-');
  return idx >= 0 ? fileName.substring(idx + 1) : fileName;
};

export const getFullUrl = (url) => {
  if (!url) return '#';
  const trimmed = String(url).trim();
  if (!trimmed || trimmed === '#') return '#';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('localhost') || trimmed.startsWith('127.0.0.1')) {
    return 'https://' + trimmed;
  }
  return 'https://' + trimmed;
};

export const triggerFilePicker = (accept, onFile, multiple = false) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  if (multiple) {
    input.multiple = true;
  }
  input.onchange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      if (multiple) {
        onFile(files);
      } else {
        onFile(files[0]);
      }
    }
  };
  input.click();
};

export const getFileTypeDetails = (filename) => {
  if (!filename) return { label: 'FILE', color: '#475569' };
  const parts = filename.split('.');
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  switch (ext) {
    case 'pdf':
      return { label: 'PDF', color: '#ef4444' };
    case 'doc':
    case 'docx':
      return { label: 'DOC', color: '#2563eb' };
    case 'xls':
    case 'xlsx':
      return { label: 'XLS', color: '#16a34a' };
    case 'zip':
    case 'rar':
      return { label: 'ZIP', color: '#7c3aed' };
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'webp':
      return { label: 'IMG', color: '#ea580c' };
    case 'mp4':
    case 'webm':
    case 'mov':
    case 'avi':
    case 'mkv':
      return { label: 'VIDEO', color: '#e11d48' };
    default:
      return { label: 'FILE', color: '#475569' };
  }
};

export const formatTime = (isoString) => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + date.toLocaleDateString();
  } catch {
    return '';
  }
};

export const formatTimestamp = (isoString) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoString;
  }
};

export const formatFileSize = (bytes) => {
  if (typeof bytes !== 'number' || Number.isNaN(bytes) || bytes <= 0) return '';
  if (bytes > 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  return (bytes / 1024).toFixed(0) + ' KB';
};

export const getAvatarUrl = (avatarPath) => {
  if (!avatarPath) return null;
  if (avatarPath.startsWith('data:') || avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath;
  }
  const baseUrl = typeof window !== 'undefined' && window.API_BASE_URL ? window.API_BASE_URL : 'http://localhost:3001';
  return `${baseUrl}${avatarPath.startsWith('/') ? '' : '/'}${avatarPath}`;
};

export const getRoleBadgeStyle = (roleName) => {
  switch (roleName) {
    case 'Developer Team':
      return { bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe' };
    case 'Devops Team':
      return { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' };
    case 'Testing Team':
      return { bg: '#ffe4e6', color: '#be123c', border: '#fca5a5' };
    case 'Content Team':
      return { bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
    case 'Design Team':
      return { bg: '#f3e8ff', color: '#6b21a8', border: '#e9d5ff' };
    case 'Admin':
      return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
    default:
      return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
  }
};

export const getStatusBadgeClass = (status = '') => {
  if (status.includes('Completed') || status.includes('Live') || status.includes('Fixed')) {
    return 'completed';
  }
  if (status.includes('Open') || status.includes('Priority')) {
    return 'pending';
  }
  return 'in-progress';
};

export const renderVideoThumbnail = () => (
  React.createElement('div', { className: 'digital-video-thumb' },
    React.createElement('svg', { width: '22', height: '22', viewBox: '0 0 24 24', fill: 'none', stroke: '#e11d48', strokeWidth: '2' },
      React.createElement('polygon', { points: '23 7 16 12 23 17 23 7' }),
      React.createElement('rect', { x: '1', y: '5', width: '15', height: '14', rx: '2', ry: '2' })
    ),
    React.createElement('span', { className: 'text-xs font-bold mt-1 text-rose-700' }, 'VIDEO')
  )
);

import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { getAvatarUrl } from '../utils/fileUtils';

export function validatePasswordComplexity(password) {
  if (!password) return 'Please enter a password.';
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least 1 uppercase letter (A-Z).';
  if (!/[a-z]/.test(password)) return 'Password must contain at least 1 lowercase letter (a-z).';
  if (!/[0-9]/.test(password)) return 'Password must contain at least 1 number (0-9).';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return 'Password must contain at least 1 special symbol (!@#$%^&*).';
  return null;
}

function validatePasswordChange(currentPassword, newPassword, confirmPassword) {
  if (!currentPassword.trim()) {
    return 'Please enter your current password.';
  }
  if (!newPassword.trim()) {
    return 'Please enter a new password.';
  }
  const complexityErr = validatePasswordComplexity(newPassword);
  if (complexityErr) {
    return complexityErr;
  }
  if (newPassword !== confirmPassword) {
    return 'New password and confirmation do not match.';
  }
  return null;
}

function ProfileAlert({ feedback }) {
  if (!feedback) return null;
  return (
    <div className={`profile-alert alert-${feedback.type}`}>
      {feedback.type === 'success' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )}
      <span>{feedback.text}</span>
    </div>
  );
}

function PasswordField({ id, label, value, onChange, placeholder, showPassword, setShowPassword, required = true }) {
  return (
    <div className="form-group mb-3">
      <label htmlFor={id}>{label}</label>
      <div className="password-input-wrap">
        <input
          type={showPassword ? 'text' : 'password'}
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
        />
        <button
          type="button"
          className="password-toggle-btn"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

function ProfilePictureTab({
  avatarFeedback,
  fileInputRef,
  selectedFile,
  currentAvatar,
  handleRemoveAvatar,
  isRemovingAvatar,
  handleUploadAvatar,
  isUploadingAvatar,
}) {
  return (
    <div className="profile-tab-content">
      <ProfileAlert feedback={avatarFeedback} />

      <div className="avatar-upload-area">
        <button
          type="button"
          className="avatar-upload-box w-full"
          onClick={() => fileInputRef.current?.click()}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mb-2 text-primary">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className="font-bold text-sm text-main">Click to select new profile picture</span>
          <span className="text-xs text-muted mt-1">Supports PNG, JPG, JPEG or WEBP (Max 5MB)</span>
          {selectedFile && (
            <span className="file-selected-badge mt-2">
              Selected: <strong>{selectedFile.name}</strong>
            </span>
          )}
        </button>

        <div className="d-flex items-center justify-between gap-3 mt-4">
          {(currentAvatar || selectedFile) && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              disabled={isRemovingAvatar}
              className="btn-danger-outline text-xs"
            >
              {isRemovingAvatar ? 'Removing...' : 'Remove Photo'}
            </button>
          )}

          {selectedFile && (
            <button
              type="button"
              onClick={handleUploadAvatar}
              disabled={isUploadingAvatar}
              className="create-btn text-xs ml-auto"
            >
              {isUploadingAvatar ? 'Saving...' : 'Save Profile Picture'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ChangePasswordTab({
  handleChangePassword,
  passwordFeedback,
  currentPassword,
  setCurrentPassword,
  showCurrentPassword,
  setShowCurrentPassword,
  newPassword,
  setNewPassword,
  showNewPassword,
  setShowNewPassword,
  confirmPassword,
  setConfirmPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  onClose,
  isChangingPassword,
}) {
  return (
    <form onSubmit={handleChangePassword} className="profile-tab-content">
      <ProfileAlert feedback={passwordFeedback} />

      <PasswordField
        id="currentPassword"
        label="Current Password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        placeholder="Enter current password"
        showPassword={showCurrentPassword}
        setShowPassword={setShowCurrentPassword}
      />

      <PasswordField
        id="newPassword"
        label="New Password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="Enter new password (min. 8 chars)"
        showPassword={showNewPassword}
        setShowPassword={setShowNewPassword}
      />

      <div className="mb-4">
        <PasswordField
          id="confirmPassword"
          label="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          showPassword={showConfirmPassword}
          setShowPassword={setShowConfirmPassword}
        />
        {newPassword && confirmPassword && newPassword !== confirmPassword && (
          <span className="text-xs text-danger mt-1 block">Passwords do not match</span>
        )}
      </div>

      <div className="d-flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={isChangingPassword} className="create-btn">
          {isChangingPassword ? 'Updating Password...' : 'Update Password'}
        </button>
      </div>
    </form>
  );
}

function ProfileModal({ currentUser, onClose, onUpdateUser }) {
  const username = currentUser?.username || '';
  const currentRole = currentUser?.role || '';
  const isTeamLeader = currentUser?.isTeamLeader || false;
  const currentAvatar = currentUser?.avatarUrl || null;

  const [activeTab, setActiveTab] = useState('profile'); 

  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  
  const [passwordFeedback, setPasswordFeedback] = useState(null); 
  const [avatarFeedback, setAvatarFeedback] = useState(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);

  const displayName = username ? username.charAt(0).toUpperCase() + username.slice(1) : currentRole;

  // Clean up the preview blob URL if the modal closes while a selection is
  // pending (e.g. user picks a file, then hits Cancel/closes without
  // uploading or removing).
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarFeedback({ type: 'error', text: 'Please select a valid image file (.jpg, .png, .webp, etc.)' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarFeedback({ type: 'error', text: 'Image file size must be less than 5MB.' });
      return;
    }

    // Revoke the previous preview's object URL before creating a new one —
    // otherwise every file the user picks leaks a blob URL for the life of
    // the tab (createObjectURL allocations are never garbage collected
    // automatically).
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setSelectedFile(file);
    setAvatarFeedback(null);
  };

  
  const handleUploadAvatar = async () => {
    if (!selectedFile) return;
    setIsUploadingAvatar(true);
    setAvatarFeedback(null);

    try {
      const formData = new FormData();
      formData.append('avatar', selectedFile);

      const res = await api.users.updateAvatar(username, formData);
      if (res.avatarUrl) {
        if (onUpdateUser) {
          onUpdateUser({ avatarUrl: res.avatarUrl });
        }
        setAvatarFeedback({ type: 'success', text: 'Profile picture updated successfully!' });
        setSelectedFile(null);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      }
    } catch (err) {
      setAvatarFeedback({ type: 'error', text: err.message || 'Failed to upload profile picture.' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  
  const handleRemoveAvatar = async () => {
    if (!currentAvatar && !previewUrl) return;

    if (!window.confirm('Are you sure you want to remove your profile picture?')) return;

    setIsRemovingAvatar(true);
    setAvatarFeedback(null);

    try {
      await api.users.removeAvatar(username);
      if (onUpdateUser) {
        onUpdateUser({ avatarUrl: null });
      }
      setSelectedFile(null);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setAvatarFeedback({ type: 'success', text: 'Profile picture removed.' });
    } catch (err) {
      setAvatarFeedback({ type: 'error', text: err.message || 'Failed to remove profile picture.' });
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordFeedback(null);

    const validationError = validatePasswordChange(currentPassword, newPassword, confirmPassword);
    if (validationError) {
      setPasswordFeedback({ type: 'error', text: validationError });
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await api.users.changePassword(username, currentPassword, newPassword);
      setPasswordFeedback({ type: 'success', text: res.message || 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordFeedback({ type: 'error', text: err.message || 'Failed to change password. Check your current password.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const activeAvatarSrc = previewUrl || (currentAvatar ? getAvatarUrl(currentAvatar) : null);

  return (
    <dialog
      open
      className="modal-overlay profile-modal-overlay"
      aria-modal="true"
    >
      <button
        type="button"
        className="modal-backdrop-btn"
        onClick={onClose}
        aria-label="Close profile modal backdrop"
      />
      <div className="modal-content profile-modal-content">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
          style={{ display: 'none' }}
        />
        
        {}
        <div className="profile-modal-header">
          <div className="d-flex items-center gap-3">
            <div className="profile-header-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <h2 className="modal-title mb-0">My Account Profile</h2>
              <p className="text-xs text-muted mt-0 mb-0">Update your profile picture and change password</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="profile-close-btn" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {}
        <div className="profile-user-card">
          <div className="profile-avatar-container">
            {activeAvatarSrc ? (
              <img src={activeAvatarSrc} alt={displayName} className="profile-avatar-lg-img" />
            ) : (
              <div className="profile-avatar-lg-initial">{displayName.charAt(0)}</div>
            )}
            <button
              type="button"
              className="profile-avatar-camera-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Change profile picture"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
          </div>

          <div className="profile-user-details">
            <div className="profile-user-name-row">
              <span className="profile-user-name">{displayName}</span>
            </div>
            <span className="profile-user-role">{currentRole}</span>
            <span className="profile-user-username">Username: <strong>{username}</strong></span>
          </div>
        </div>

        {}
        <div className="profile-nav-tabs">
          <button
            type="button"
            className={`profile-nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="10" r="3" />
              <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
            </svg>
            Profile Picture
          </button>

          <button
            type="button"
            className={`profile-nav-tab ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Change Password
          </button>
        </div>

        {activeTab === 'profile' && (
          <ProfilePictureTab
            avatarFeedback={avatarFeedback}
            fileInputRef={fileInputRef}
            selectedFile={selectedFile}
            currentAvatar={currentAvatar}
            handleRemoveAvatar={handleRemoveAvatar}
            isRemovingAvatar={isRemovingAvatar}
            handleUploadAvatar={handleUploadAvatar}
            isUploadingAvatar={isUploadingAvatar}
          />
        )}

        {activeTab === 'password' && (
          <ChangePasswordTab
            handleChangePassword={handleChangePassword}
            passwordFeedback={passwordFeedback}
            currentPassword={currentPassword}
            setCurrentPassword={setCurrentPassword}
            showCurrentPassword={showCurrentPassword}
            setShowCurrentPassword={setShowCurrentPassword}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            showNewPassword={showNewPassword}
            setShowNewPassword={setShowNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            onClose={onClose}
            isChangingPassword={isChangingPassword}
          />
        )}
      </div>
    </dialog>
  );
}

export default ProfileModal;
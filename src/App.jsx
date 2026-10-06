import { useState } from 'react';
import './App.css';
import Login from './components/Login';
import ContentDashboard from './components/ContentDashboard';
import DesignDashboard from './components/DesignDashboard';
import DeveloperDashboard from './components/DeveloperDashboard';
import DevopsDashboard from './components/DevopsDashboard';
import TestingDashboard from './components/TestingDashboard';
import AdminDashboard from './components/AdminDashboard';

const ROLES = [
  'Content Team',
  'Design Team',
  'Developer Team',
  'Devops Team',
  'Testing Team',
  'Project Manager (Career Mate)',
  'Project Manager (Classmate)',
  'Admin',
  'CTO',
];

function normalizeUser(userData) {
  if (!userData || typeof userData !== 'object') return null;

  const role = typeof userData.role === 'string' ? userData.role.trim() : '';
  const canonicalRole = ROLES.find((knownRole) => knownRole.toLowerCase() === role.toLowerCase());
  return { ...userData, role: canonicalRole || role };
}

function App() {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('pm_current_user');
      return savedUser ? normalizeUser(JSON.parse(savedUser)) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (userData) => {
    const normalizedUser = normalizeUser(userData);
    setUser(normalizedUser);
    try {
      localStorage.setItem('pm_current_user', JSON.stringify(normalizedUser));
    } catch {
      
    }
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem('pm_current_user');
    } catch {
      
    }
  };

  const handleUpdateUser = (updatedData) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = normalizeUser({ ...prev, ...updatedData });
      try {
        localStorage.setItem('pm_current_user', JSON.stringify(updated));
      } catch {
        
      }
      return updated;
    });
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderDashboard = () => {
    switch (user.role) {
      case 'Content Team':
        return <ContentDashboard currentUser={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />;
      case 'Design Team':
        return <DesignDashboard currentUser={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />;
      case 'Developer Team':
        return <DeveloperDashboard currentUser={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />;
      case 'Devops Team':
        return <DevopsDashboard currentUser={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />;
      case 'Testing Team':
        return <TestingDashboard currentUser={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />;
      case 'Project Manager (Career Mate)':
      case 'Project Manager (Classmate)':
      case 'Admin':
      case 'CTO':
        return <AdminDashboard currentUser={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />;
      default:
        return (
          <main className="playful-main">
            <div className="playful-content">
              <h1>Unable to open dashboard</h1>
              <p>The account has an unrecognized role. Contact an administrator to update it.</p>
              <button type="button" onClick={handleLogout}>Sign out</button>
            </div>
          </main>
        );
    }
  };

  return renderDashboard();
}

export default App;

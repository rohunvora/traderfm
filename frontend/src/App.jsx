import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.jsx';
import { useActivity } from './hooks/useActivity.jsx';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import InboxPage from './pages/InboxPage';
import KOLDashboard from './pages/KOLDashboard';
import ProjectDashboard from './pages/ProjectDashboard';

// Activity wrapper component
function ActivityWrapper({ children }) {
  useActivity(); // This will handle all the notifications
  return children;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ActivityWrapper>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/u/:handle" element={<ProfilePage />} />
              <Route path="/inbox/:handle" element={<InboxPage />} />
              <Route path="/kol-dashboard" element={<KOLDashboard />} />
              <Route path="/project-dashboard" element={<ProjectDashboard />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </ActivityWrapper>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App; 
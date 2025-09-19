import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Components
import Layout from './components/Layout';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Pages
import Dashboard from './pages/Dashboard';
import Teachers from './pages/Teachers';
import Subjects from './pages/Subjects';
import Classrooms from './pages/Classrooms';
import TimeSlots from './pages/TimeSlots';
import { Timetable } from './pages/Timetable';
import { Batches } from './pages/Batches';
import { FacultyAvailability as FacultyAvailabilityPage } from './pages/FacultyAvailability';
import { SpecialClasses } from './pages/SpecialClasses';
import { TimetableGeneration } from './pages/TimetableGeneration';

// Route guard component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

// Public route component (redirects to dashboard if already logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return !user ? <>{children}</> : <Navigate to="/" replace />;
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public routes */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <Register />
                  </PublicRoute>
                }
              />

              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="timetables" element={<Timetable />} />
                <Route path="teachers" element={<Teachers />} />
                <Route path="subjects" element={<Subjects />} />
                <Route path="classrooms" element={<Classrooms />} />
                <Route path="time-slots" element={<TimeSlots />} />
                <Route path="batches" element={<Batches />} />
                <Route path="faculty-availability" element={<FacultyAvailabilityPage />} />
                <Route path="special-classes" element={<SpecialClasses />} />
                <Route path="timetable-generation" element={<TimetableGeneration />} />
                <Route path="settings" element={<div className="p-8 text-center text-gray-500">Settings page coming soon...</div>} />
              </Route>

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Toast notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                className: 'dark:bg-gray-800 dark:text-white',
                style: {
                  background: 'var(--toast-bg)',
                  color: 'var(--toast-color)',
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login        from './pages/Login';
import Admin        from './pages/Admin';
import Doctor       from './pages/Doctor';
import Receptionist from './pages/Receptionist';
import Superadmin   from './pages/Superadmin';

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}`} replace />;
}

// Pages that need the navbar wrapper
function PortalLayout({ children }) {
  return (
    <div id="main-app">
      <Navbar />
      <div className="container mx-auto px-6 py-8" id="content-area">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"      element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={
            <ProtectedRoute role="admin">
              <PortalLayout><Admin /></PortalLayout>
            </ProtectedRoute>
          } />
          <Route path="/doctor" element={
            <ProtectedRoute role="doctor">
              <PortalLayout><Doctor /></PortalLayout>
            </ProtectedRoute>
          } />
          <Route path="/receptionist" element={
            <ProtectedRoute role="receptionist">
              <PortalLayout><Receptionist /></PortalLayout>
            </ProtectedRoute>
          } />
          <Route path="/superadmin" element={
            <ProtectedRoute role="superadmin">
              <PortalLayout><Superadmin /></PortalLayout>
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
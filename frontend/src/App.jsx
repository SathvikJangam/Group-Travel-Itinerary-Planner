// client/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Page Imports
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import AdminPanel from './pages/AdminPanel';
import TripDashboard from './pages/TripDashboard';
import Profile from './pages/Profile';

// To protect private routes
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  return user && user.role === 'admin' ? children : <Navigate to="/" />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-apple-black text-apple-lightText font-sans selection:bg-apple-blue selection:text-white">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            {/* Protected Routes (Placeholders for now) */}
            <Route path="/" element={ <ProtectedRoute> <Home /> </ProtectedRoute> } />
            <Route path="/trip/:tripId" element={ <ProtectedRoute> <TripDashboard /> </ProtectedRoute> } />
            <Route path="/admin" element={ <AdminRoute> <AdminPanel /> </AdminRoute> } />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
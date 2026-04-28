import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';

// Restores: original navbar from index.html exactly
// Includes: Careline logo, portal name, user name, notification bell, logout

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleName = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1) + ' Portal'
    : '';

  return (
    <nav className="bg-gradient-to-r text-black shadow-2xl" style={{ background: 'white' }}>
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://thecareline.org/wp-content/uploads/2025/10/CARELINE-1-HEARTBEAT-LOGO-01.png"
              alt="Careline Logo"
              className="w-36 h-11"
            />
            <div>
              <h1 className="text-2xl font-bold" id="portal-name">{roleName}</h1>
              <p className="text-xs text-gray-500" id="user-name-display">{user?.name || user?.username || ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell role={user?.role} userId={user?.doctor_id || user?.admin_id || user?.receptionist_id || user?.superadmin_id} />

            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all text-gray-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

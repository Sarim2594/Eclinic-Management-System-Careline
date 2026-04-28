import { createContext, useContext, useState } from 'react';
import { logoutSession } from '../api';

// ============================================================================
// AUTH CONTEXT — replaces static/user_state.js
// ============================================================================

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem('careline_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = (userData) => {
    sessionStorage.setItem('careline_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try {
      if (sessionStorage.getItem('careline_user')) {
        await logoutSession();
      }
    } catch (error) {
      console.error('Logout request failed', error);
    } finally {
      sessionStorage.removeItem('careline_user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

import { createContext, useContext, useState } from 'react';

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

  const logout = () => {
    sessionStorage.removeItem('careline_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

import { createContext, useContext, useState, useEffect } from 'react';
import { MOCK_USER } from '../utils/constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (stored && token) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const login = async (email, password, remember) => {
    setUser(MOCK_USER);
    if (remember) {
      localStorage.setItem('user', JSON.stringify(MOCK_USER));
      localStorage.setItem('token', 'mock-token');
    } else {
      sessionStorage.setItem('user', JSON.stringify(MOCK_USER));
      sessionStorage.setItem('token', 'mock-token');
    }
    return MOCK_USER;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

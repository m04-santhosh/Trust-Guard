import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_BASE = import.meta.env?.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname
    ? `http://${window.location.hostname}:8000`
    : 'http://127.0.0.1:8000');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Support persistent analyst credentials with isolated per-user sessions
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('tg_token') || sessionStorage.getItem('tg_session_token');
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  // Validate token if active in current browser session
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Session expired');
      })
      .then((userData) => {
        setUser(userData);
      })
      .catch(() => {
        // Token expired or invalid
        sessionStorage.removeItem('tg_session_token');
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const login = async (usernameOrEmail, password) => {
    sessionStorage.removeItem('tg_session_token');
    localStorage.removeItem('tg_token');

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username_or_email: usernameOrEmail,
        password: password,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(err.detail || 'Invalid credentials');
    }

    const data = await res.json();
    localStorage.setItem('tg_token', data.token);
    sessionStorage.setItem('tg_session_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const signup = async (email, username, password) => {
    // Clear previous sessions so new user gets an entirely fresh, isolated account
    sessionStorage.removeItem('tg_session_token');
    localStorage.removeItem('tg_token');

    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        username: username,
        password: password,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Signup failed' }));
      throw new Error(err.detail || 'Registration failed');
    }

    const data = await res.json();
    if (data.token) {
      localStorage.setItem('tg_token', data.token);
      sessionStorage.setItem('tg_session_token', data.token);
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  const logout = async () => {
    if (token) {
      fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    sessionStorage.removeItem('tg_session_token');
    localStorage.removeItem('tg_token');
    setToken(null);
    setUser(null);
  };

  const updateSessionToken = (newToken) => {
    if (newToken) {
      sessionStorage.setItem('tg_session_token', newToken);
      setToken(newToken);
    }
  };

  const authFetch = (url, options = {}) => {
    const headers = options.headers ? { ...options.headers } : {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        signup,
        logout,
        updateSessionToken,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

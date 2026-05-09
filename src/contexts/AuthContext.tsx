import { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email?: string;
  full_name?: string;
  role?: string;
  language_preference?: string;
  notifications?: any;
  accessibility?: any;
  two_factor_enabled?: boolean;
  user_metadata: { [key: string]: any };
  app_metadata: { [key: string]: any };
  aud: string;
  created_at: string;
}

interface Session {
  user: User;
  access_token: string;
}
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ require_2fa?: boolean, user_id?: string, otp_debug?: string } | void>;
  signUp: (email: string, password: string, fullName: string, role: string) => Promise<void>;
  verifyOTP: (otp: string, user_id: string) => Promise<void>;
  verifyRecovery: (code: string, user_id: string) => Promise<void>;
  signOut: () => Promise<void>;
  token: string | null;
  updateUser?: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = 'http://localhost:8000';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('access_token');
      if (storedToken) {
        try {
          const res = await fetch(`${API_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${storedToken}` }
          });
          if (res.ok) {
            const userData = await res.json();
            const u: User = {
              id: userData.id,
              email: userData.email,
              full_name: userData.full_name,
              role: userData.role,
              language_preference: userData.language_preference,
              notifications: userData.notifications,
              accessibility: userData.accessibility,
              two_factor_enabled: userData.two_factor_enabled,
              user_metadata: { full_name: userData.full_name },
              app_metadata: {},
              aud: 'authenticated',
              created_at: userData.created_at || new Date().toISOString()
            };

            setUser(u);
            setSession({ user: u, access_token: storedToken } as any);
            setToken(storedToken);
          } else {
            localStorage.removeItem('access_token');
            setToken(null);
          }
        } catch (err) {
          console.error("Auth init error", err);
          localStorage.removeItem('access_token');
          setToken(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ require_2fa?: boolean, user_id?: string, otp_debug?: string } | void> => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Login failed');
    }

    const data = await res.json();

    if (data.require_2fa) {
      return { require_2fa: true, user_id: data.user_id, otp_debug: data.otp_debug };
    }

    const accessToken = data.access_token;
    await completeSignIn(accessToken);
  };

  const verifyOTP = async (otp: string, user_id: string) => {
    const res = await fetch(`${API_URL}/api/auth/2fa/verify?user_id=${user_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Invalid OTP');
    }

    const data = await res.json();
    await completeSignIn(data.access_token);
  };

  const verifyRecovery = async (code: string, user_id: string) => {
    const res = await fetch(`${API_URL}/api/auth/2fa/recover?user_id=${user_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp: code }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Invalid recovery code');
    }

    const data = await res.json();
    await completeSignIn(data.access_token);
  };

  const completeSignIn = async (accessToken: string) => {
    localStorage.setItem('access_token', accessToken);
    setToken(accessToken);

    const meRes = await fetch(`${API_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (meRes.ok) {
      const userData = await meRes.json();
      const u: User = {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        language_preference: userData.language_preference,
        notifications: userData.notifications,
        accessibility: userData.accessibility,
        two_factor_enabled: userData.two_factor_enabled,
        user_metadata: { full_name: userData.full_name },
        app_metadata: {},
        aud: 'authenticated',
        created_at: userData.created_at
      };
      setUser(u);
      setSession({ user: u, access_token: accessToken } as any);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: string) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        role: role,
        language_preference: 'en'
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Registration failed');
    }

    await signIn(email, password);
  };

  const signOut = async () => {
    localStorage.removeItem('access_token');
    setUser(null);
    setSession(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, verifyOTP, verifyRecovery, signOut, token, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

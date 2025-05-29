import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
// import api from '../services/api'; // 🔴 Comentado pois não será usado aqui

interface User {
  nome: string;
  email: string;
  streamings: number;
  espectadores: number;
  bitrate: number;
  espaco: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  register: (name: string, email: string, cpf: string, phone: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  // ✅ Login simulado (aceita qualquer senha)
  const login = async (email: string, password: string) => {
    try {
      console.log(`Simulando login com ${email} / ${password}`);

      await new Promise((res) => setTimeout(res, 500)); // atraso simulado

      const userData: User = {
        nome: 'Usuário Demo',
        email,
        streamings: 3,
        espectadores: 100,
        bitrate: 5000,
        espaco: 10,
      };

      const fakeToken = 'fake-token-123';

      localStorage.setItem('token', fakeToken);
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      setIsAuthenticated(true);
      navigate('/dashboard');
      toast.success('Login simulado com sucesso!');
    } catch (error) {
      toast.error('Erro simulado no login');
      console.error('Erro simulado:', error);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login');
    toast.info('Logout realizado com sucesso');
  };

  const forgotPassword = async (email: string) => {
    toast.info('Recuperação de senha simulada para: ' + email);
    setTimeout(() => navigate('/login'), 2000);
  };

  const register = async (name: string, email: string, cpf: string, phone: string) => {
    toast.success('Cadastro simulado com sucesso! Aguarde aprovação.');
    setTimeout(() => navigate('/login'), 2000);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, forgotPassword, register }}>
      {children}
    </AuthContext.Provider>
  );
};

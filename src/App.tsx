import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Auth Pages
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import Register from './pages/auth/Register';

// Dashboard Pages
import Dashboard from './pages/dashboard/Dashboard';
import DadosConexao from './pages/dashboard/DadosConexao';
import Configuracoes from './pages/dashboard/Configuracoes';
import Players from './pages/dashboard/Players';
import GerenciarVideos from './pages/dashboard/Gerenciarvideos';
import Playlists from './pages/dashboard/Playlists';


// Layouts
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Context
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Auth Routes */}
          <Route path="/" element={<AuthLayout />}>
            <Route index element={<Navigate to="/login" />} />
            <Route path="login" element={<Login />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="register" element={<Register />} />
          </Route>

          {/* Dashboard Routes */}
          <Route path="/dashboard" element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="dados-conexao" element={<DadosConexao />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="players" element={<Players />} />
            <Route path="gerenciarvideos" element={<GerenciarVideos />} />
            <Route path="playlists" element={<Playlists />} />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
        <ToastContainer position="top-right" autoClose={3000} />
      </AuthProvider>
    </Router>
  );
}

export default App;
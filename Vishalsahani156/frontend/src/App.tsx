import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SuperAdminAuthProvider } from './context/SuperAdminAuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { SuperAdminProtectedRoute } from './routes/SuperAdminProtectedRoute';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { GeneratePdfPage } from './pages/GeneratePdfPage';
import { RecordsPage } from './pages/RecordsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SuperAdminLoginPage } from './pages/SuperAdminLoginPage';
import { SuperAdminRegisterPage } from './pages/SuperAdminRegisterPage';
import { SuperAdminDashboardPage } from './pages/SuperAdminDashboardPage';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SuperAdminAuthProvider>
          <BrowserRouter>
            <Toaster position="top-right" />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />
              <Route path="/super-admin/register" element={<SuperAdminRegisterPage />} />
              <Route element={<SuperAdminProtectedRoute />}>
                <Route path="/super-admin/dashboard" element={<SuperAdminDashboardPage />} />
              </Route>

              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/generate" element={<GeneratePdfPage />} />
                <Route path="/records" element={<RecordsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </SuperAdminAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

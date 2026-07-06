// ============================================================================
//  App.jsx — COMPONENTE RAÍZ y MAPA DE RUTAS de toda la aplicación
// ----------------------------------------------------------------------------
//  Acá se define:
//   1) El "envoltorio" global: AuthProvider (sesión) y BrowserRouter (navegación).
//   2) TODAS las rutas (URLs) de la app y qué página muestra cada una.
//   3) El ChatBot flotante, que aparece en todas las pantallas.
//
//  Distinguimos dos tipos de rutas:
//   - Públicas / de login: se ven sin estar logueado (login, registro, etc.).
//   - Privadas: envueltas en <PrivateRoute>, requieren sesión iniciada.
//  Y casi todas van dentro de <Layout> (sidebar + barra superior).
// ============================================================================
import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { initTheme } from "./services/theme";
import { PrivateRoute } from "./components/PrivateRoute";
import Layout from "./components/Layout";
import ChatBot from "./components/ChatBot";
import Home from "./pages/Home/Home";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import VerifyEmail from "./pages/Auth/VerifyEmail";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import ResetPassword from "./pages/Auth/ResetPassword";
import GoogleCallback from "./pages/Auth/GoogleCallback";
import Terms from "./pages/Terms/Terms";
import CarDetail from "./pages/CarDetail/CarDetail";
import PublishCar from "./pages/PublishCar/PublishCar";
import Dashboard from "./pages/Dashboard/Dashboard";
import Chat from "./pages/Chat/Chat";
import Admin from "./pages/Admin/Admin";
import Booking from "./pages/Booking/Booking";
import MyBookings from "./pages/MyBookings/MyBookings";
import Payment from "./pages/Payment/Payment";
import CompleteProfile from "./pages/Auth/CompleteProfile";
import KYC from "./pages/KYC/KYC";
import Profile from "./pages/Profile/Profile";
import Search from "./pages/Search/Search";
import Settings from "./pages/Settings/Settings";
import Notifications from "./pages/Notifications/Notifications";

// Páginas de la app: se muestran dentro del Layout (con sidebar + topbar)
const app = (el) => <Layout>{el}</Layout>;
// Páginas privadas dentro del Layout
const priv = (el) => <PrivateRoute><Layout>{el}</Layout></PrivateRoute>;

export default function App() {
  // Al arrancar, aplicamos el modo claro/oscuro guardado por el usuario.
  useEffect(() => { initTheme(); }, []);
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Pantallas de autenticación / onboarding — sin Layout */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/kyc" element={<PrivateRoute><KYC /></PrivateRoute>} />
          <Route path="/auth/google/callback" element={<GoogleCallback />} />
          <Route path="/terms" element={<Terms />} />

          {/* Pantallas de la app — con Layout (sidebar en todas) */}
          <Route path="/" element={app(<Home />)} />
          <Route path="/buscar" element={app(<Search />)} />
          <Route path="/cars/:id" element={app(<CarDetail />)} />
          <Route path="/profile" element={priv(<Profile />)} />
          <Route path="/ajustes" element={priv(<Settings />)} />
          <Route path="/notificaciones" element={priv(<Notifications />)} />
          <Route path="/admin" element={priv(<Admin />)} />
          <Route path="/publish" element={priv(<PublishCar />)} />
          <Route path="/dashboard" element={priv(<Dashboard />)} />
          <Route path="/chat" element={priv(<Chat />)} />
          <Route path="/booking/:id" element={priv(<Booking />)} />
          <Route path="/my-bookings" element={priv(<MyBookings />)} />
          <Route path="/payment/:bookingId" element={priv(<Payment />)} />
        </Routes>
        <ChatBot />
      </BrowserRouter>
    </AuthProvider>
  );
}
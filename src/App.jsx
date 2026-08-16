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
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import { initTheme } from "./services/theme";
import { PrivateRoute } from "./components/PrivateRoute";
import Layout from "./components/Layout";
import ChatBot from "./components/ChatBot";
import { useI18n } from "./i18n/core";
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
import Favorites from "./pages/Favorites/Favorites";
import QrFlow from "./pages/QRFlow/QrFlow";

// Páginas de la app: se muestran dentro del Layout (con sidebar + topbar)
const app = (el) => <Layout>{el}</Layout>;
// Páginas privadas dentro del Layout
const priv = (el) => <PrivateRoute><Layout>{el}</Layout></PrivateRoute>;

// Pantalla para cualquier dirección que no exista. Sin esto, escribir mal una URL
// (o tocar un link a una ruta que falta) dejaba la pantalla completamente en
// blanco, sin ningún aviso.
const NotFound = () => {
  const { t: tr } = useI18n();
  return (
  <div style={{ textAlign: "center", padding: "80px 24px" }}>
    <div style={{ fontSize: 46, fontWeight: 800, color: "#0f6ce6", marginBottom: 8 }}>404</div>
    <div style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{tr("nf.title")}</div>
    <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>
      {tr("nf.note")}
    </div>
    <Link to="/" style={{ display: "inline-block", padding: "12px 26px", background: "#0f6ce6", color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
      {tr("common.goHome")}
    </Link>
  </div>
  );
};

export default function App() {
  // Al arrancar, aplicamos el modo claro/oscuro guardado por el usuario.
  useEffect(() => { initTheme(); }, []);
  return (
    <AuthProvider>
      {/* Los favoritos se comparten con toda la app (corazones en las grillas,
          contador y la pantalla /favoritos), por eso viven en un provider. */}
      <FavoritesProvider>
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
          {/* El menú lateral ya linkeaba a /favoritos, pero la ruta no existía:
              la pantalla quedaba en blanco. */}
          <Route path="/favoritos" element={priv(<Favorites />)} />
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
          {/* Retiro y devolución con QR/token: "Mis reservas" ya tenía el botón,
              pero esta ruta faltaba, así que no llevaba a ninguna parte. */}
          <Route path="/qr/:bookingId" element={priv(<QrFlow />)} />

          <Route path="*" element={app(<NotFound />)} />
        </Routes>
        <ChatBot />
      </BrowserRouter>
      </FavoritesProvider>
    </AuthProvider>
  );
}
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
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

// Páginas de la app: se muestran dentro del Layout (con sidebar + topbar)
const app = (el) => <Layout>{el}</Layout>;
// Páginas privadas dentro del Layout
const priv = (el) => <PrivateRoute><Layout>{el}</Layout></PrivateRoute>;

export default function App() {
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
          <Route path="/cars/:id" element={app(<CarDetail />)} />
          <Route path="/profile" element={priv(<Profile />)} />
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

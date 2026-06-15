import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { PrivateRoute } from "./components/PrivateRoute";
import Navbar from "./components/Navbar";
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/google/callback" element={<GoogleCallback />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/cars/:id" element={<CarDetail />} />
          <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
          <Route path="/publish" element={<PrivateRoute><PublishCar /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
          <Route path="/booking/:id" element={<PrivateRoute><Booking /></PrivateRoute>} />
          <Route path="/my-bookings" element={<PrivateRoute><MyBookings /></PrivateRoute>} />
          <Route path="/payment/:bookingId" element={<PrivateRoute><Payment /></PrivateRoute>} />
        </Routes>
        <ChatBot />
      </BrowserRouter>
    </AuthProvider>
  );
}
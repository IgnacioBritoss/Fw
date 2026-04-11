import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { PrivateRoute } from "./components/PrivateRoute";
import Navbar from "./components/Navbar";
import Home from "./pages/Home/Home";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import CarDetail from "./pages/CarDetail/CarDetail";
import PublishCar from "./pages/PublishCar/PublishCar";
import Dashboard from "./pages/Dashboard/Dashboard";
import Chat from "./pages/Chat/Chat";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cars/:id" element={<CarDetail />} />
          <Route path="/publish" element={
            <PrivateRoute><PublishCar /></PrivateRoute>
          } />
          <Route path="/dashboard" element={
            <PrivateRoute><Dashboard /></PrivateRoute>
          } />
          <Route path="/chat" element={
            <PrivateRoute><Chat /></PrivateRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

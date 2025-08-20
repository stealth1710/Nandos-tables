import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Loggedin from "./pages/Loggedin";
import UpdatePassword from "./pages/UpdatePassword";
import { SocketProvider } from "./contexts/SocketContext";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute"; // ✅ import wrapper

export default function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route
            path="/Home"
            element={
              <ProtectedRoute>
                <Loggedin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/update-password"
            element={
              <ProtectedRoute>
                <UpdatePassword />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}

import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Loggedin from "./pages/Loggedin";
import UpdatePassword from "./pages/UpdatePassword";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { SocketProvider } from "./contexts/SocketContext";
import { useEffect, useState } from "react";


export default function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <SocketProvider>
      {!isOnline && (
        <div className="w-full bg-red-600 text-white text-center py-2 fixed top-0 z-50 font-caveat">
          ⚠️ You are offline. Please check your internet connection.
        </div>
      )}

      <div className={isOnline ? "" : "pt-10"}>
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
      </div>
    </SocketProvider>
  );
}

// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  // Make sure token exists and is non-empty
  if (!token || token === "undefined" || token.trim() === "") {
    return <Navigate to="/" replace />;
  }

  return children;
}

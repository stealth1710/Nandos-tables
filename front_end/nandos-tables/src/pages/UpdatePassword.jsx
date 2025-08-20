import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
    }
  }, [navigate]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.put(
        "http://localhost:3001/api/auth/change-password",
        {
          currentPassword,
          newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSuccessMessage("✅ Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.response?.data?.message || "Password change failed");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="min-h-screen fire-gradient flex items-center justify-center px-4 font-caveat">
      <div className="w-full max-w-md bg-black/40 backdrop-blur-lg shadow-xl rounded-2xl p-8 text-white">
        <h2 className="text-3xl text-center mb-6">Update Password</h2>

        {error && <div className="mb-4 text-red-300 text-sm text-center">{error}</div>}
        {successMessage && <div className="mb-4 text-green-300 text-sm text-center">{successMessage}</div>}

        <form onSubmit={handleChangePassword} className="space-y-5 relative">
          {/* Current Password */}
          <div className="relative">
            <label className="block mb-1 text-white/80 text-xl">Current Password</label>
            <input
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 placeholder-white/70 text-white backdrop-blur-sm focus:outline-none text-sm"
              placeholder="Enter current password"
              required
            />
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={() => setShowCurrent((prev) => !prev)}
              className="absolute top-10 right-3 text-white"
            >
              {showCurrent ? <FaEyeSlash /> : <FaEye />}
            </motion.button>
          </div>

          {/* New Password */}
          <div className="relative">
            <label className="block mb-1 text-white/80 text-xl">New Password</label>
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 placeholder-white/70 text-white backdrop-blur-sm focus:outline-none text-sm"
              placeholder="Enter new password"
              required
            />
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={() => setShowNew((prev) => !prev)}
              className="absolute top-10 right-3 text-white"
            >
              {showNew ? <FaEyeSlash /> : <FaEye />}
            </motion.button>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <label className="block mb-1 text-white/80 text-xl">Confirm New Password</label>
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 placeholder-white/70 text-white backdrop-blur-sm focus:outline-none text-sm"
              placeholder="Re-enter new password"
              required
            />
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={() => setShowConfirm((prev) => !prev)}
              className="absolute top-10 right-3 text-white text-center"
            >
              {showConfirm ? <FaEyeSlash /> : <FaEye />}
            </motion.button>
          </div>

          <button
            type="submit"
            className="w-full bg-green-500/80 hover:bg-green-600/90 text-white py-2 rounded-full transition"
          >
            Update Password
          </button>

          <div className="flex justify-between gap-4 mt-4">
            <button
              type="button"
              onClick={() => navigate("/Home")}
              className="w-1/2 bg-white/20 hover:bg-white/30 text-white py-2 rounded-full transition border border-white/30"
            >
              Go to Home
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="w-1/2 bg-red-500/80 hover:bg-red-600 text-white py-2 rounded-full transition"
            >
              Logout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

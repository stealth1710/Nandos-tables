import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import SmoothDotsLoader from "../components/SmoothDotsLoader";

export default function AuthPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false); // 🔄 loader state

  const login = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        username,
        password,
      });

      const { token } = res.data;
      localStorage.setItem("token", token);
      setUsername("");
      setPassword("");
      navigate("/Home");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false); // ✅ hide loader after request finishes
    }
  };

  return (
    <div className="min-h-screen fire-gradient flex items-center justify-center px-4 font-caveat">
      <div className="w-full max-w-md bg-black/40 backdrop-blur-lg shadow-xl rounded-2xl p-8 text-white">
        <h2 className="text-3xl text-center mb-6">Login</h2>

        {error && (
          <div className="mb-4 text-red-300 text-sm text-center font-semibold">{error}</div>
        )}

        <form onSubmit={login} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block mb-1 text-white/80 text-xl">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 placeholder-white/70 text-white backdrop-blur-sm focus:outline-none text-sm"
              placeholder="Enter your username"
              required
              disabled={loading}
            />
          </div>

          {/* Password with Eye Toggle */}
          <div>
            <label className="block mb-1 text-white/80 text-xl">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 pr-10 rounded-lg bg-white/20 border border-white/30 placeholder-white/70 text-white backdrop-blur-sm focus:outline-none text-sm"
                placeholder="Enter your password"
                required
                disabled={loading}
              />
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-3 text-black"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </motion.button>
            </div>
          </div>

          {/* Submit */}
          <button
  type="submit"
  className="w-full bg-blue-500/80 hover:bg-blue-600/90 text-white py-2 rounded-full transition flex justify-center items-center "
  disabled={loading}
>
  {loading ? <SmoothDotsLoader /> : "Login"}
</button>

        </form>
      </div>
    </div>
  );
}

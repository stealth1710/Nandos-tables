import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import navbarBg from "../pictures/navbar.png";

export default function Navbar() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full relative z-50"
    >
      {/* Background */}
      <div
        className="w-full h-20 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${navbarBg})` }}
      >
        {/* Glass Overlay */}
        <div className="absolute inset-0 backdrop-blur-sm bg-white/10 flex items-center px-4 sm:px-6">
          <div className="relative w-full flex items-center">
            {/* Heading centered using absolute trick */}
            <h1
              className="
                text-white  drop-shadow-lg
                text-base sm:text-lg md:text-lg lg:text-4xl
                absolute left-1/2 transform -translate-x-1/2
                hidden lg:block
                font-bold
              "
            >
              Nandos - O2
            </h1>

            {/* Heading left on small devices */}
            <h1
              className="
                text-white  drop-shadow-lg
                text-base sm:text-lg md:text-lg
                block lg:hidden
                font-bold
              "
            >
              Nandos - O2
            </h1>

            {/* Buttons */}
            <div className="ml-auto flex gap-2 sm:gap-4 items-center">
              <Link
                to="/update-password"
                className="text-white text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/20 backdrop-blur-sm bg-white/10 hover:bg-white/20 transition"
              >
                Update Password
              </Link>
              <button
                onClick={logout}
                className="text-white text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-red-400 backdrop-blur-sm bg-red-500/20 hover:bg-red-500/40 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

const express = require("express")

const router = express.Router()
const {login,changePassword,seedUser}=require("../controllers/authController")
const protect = require("../middlewares/authMiddleware")

router.post("/seed",seedUser)
router.post("/login",login)
router.put("/change-password",protect,changePassword)

module.exports = router
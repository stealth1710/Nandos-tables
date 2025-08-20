const User = require("../models/User")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

const JWT_SECRET = process.env.JWT_SECRET
const Username = process.env.USER_NAME
const pass = process.env.PASS

//seeding the default user
exports.seedUser = async (req, res) => {
  const existing = await User.findOne({});
  if (existing) return res.status(400).json({ message: "User already exists" });

  const hashedPassword = await bcrypt.hash(pass, 10);
  const user = new User({ username: Username, password: hashedPassword });
  await user.save();
  res.json({ message: "Seeded admin user" });
};
//login logic
exports.login = async(req,res) => {
    const{username,password} = req.body
    const user= await User.findOne({username});
    if(!user) return res.status(400).json({message: "Invalid username"})

    const match = await bcrypt.compare(password, user.password)
    if(!match) return res.status(400).json({message:"invalid credentials"})

    const token = jwt.sign({id: user._id},JWT_SECRET,{expiresIn:"1d"})
    res.json({token,user: {id:user._id,username:user.username}})
}
//password change logic
exports.changePassword = async(req,res) => {
    const {currentPassword,newPassword} = req.body
    const userId = req.userId

    const user = await User.findById(userId)
    if(!user) return res.status(404).json({message: "user not found"})
    
    const isMatch = await bcrypt.compare(currentPassword,user.password)
    if(!isMatch) return res.status(401).json({message:"Wrong Current password"})

    user.password = await bcrypt.hash(newPassword,10)
    await user.save()

    res.json({message:"password updated"})
}
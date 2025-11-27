const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();


const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// 👉 Seed default users if not exist (admin + saurabh)
// router.get("/seed", async (req, res) => {
//   try {
//     const existingAdmin = await User.findOne({ email: "admin@yash.com" });
//     const existingIntern = await User.findOne({
//       email: "saurabh@example.com",
//     });

//     if (!existingAdmin) {
//       const hashed = await bcrypt.hash("admin123", 10);
//       await User.create({
//         name: "Yash (Admin)",
//         email: "admin@yash.com",
//         password: hashed,
//         role: "admin",
//       });
//     }

//     if (!existingIntern) {
//       const hashed = await bcrypt.hash("saurabh123", 10);
//       await User.create({
//         name: "Saurabh",
//         email: "saurabh@example.com",
//         password: hashed,
//         role: "intern",
//       });
//     }

//     res.json({
//       message: "Seed complete",
//       admin: { email: "admin@yash.com", password: "admin123" },
//       intern: { email: "saurabh@example.com", password: "saurabh123" },
//     });
//   } catch (err) {
//     console.error("Seed error:", err);
//     res.status(500).json({ message: "Seed failed" });
//   }
// });

// 👉 POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

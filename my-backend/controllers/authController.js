const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const fallbackUsers = [];

const saveUserFallback = (user) => {
  fallbackUsers.push(user);
  return user;
};

const findUserFallback = (email) => fallbackUsers.find((user) => user.email === email);

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    let existingUser = null;

    try {
      existingUser = await User.findOne({ email });
    } catch (dbError) {
      existingUser = findUserFallback(email);
    }

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let user;

    try {
      user = await User.create({
        name,
        email,
        password: hashedPassword,
      });
    } catch (dbError) {
      user = saveUserFallback({
        _id: Date.now().toString(),
        name,
        email,
        password: hashedPassword,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Registration Successful",
      user,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = null;

    try {
      user = await User.findOne({ email });
    } catch (dbError) {
      user = findUserFallback(email);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid Password",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET || "ledgerflow-secret",
      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login Successful",
      token,
      user,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
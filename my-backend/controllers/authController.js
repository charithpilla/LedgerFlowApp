const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { supabaseAdmin } = require("../config/supabase");

const useFallback = process.env.SUPABASE_USE_FALLBACK === "true";
const fallbackUsers = [];

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    let existingUser = null;

    if (!useFallback && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("users")
        .select("id, email")
        .eq("email", email)
        .single();
      
      if (data) existingUser = data;
    } else {
      existingUser = fallbackUsers.find((u) => u.email === email);
    }

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let user;

    if (!useFallback && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("users")
        .insert([{ name, email, password: hashedPassword }])
        .select()
        .single();

      if (error) throw error;
      user = data;
    } else {
      user = {
        id: Date.now().toString(),
        name,
        email,
        password: hashedPassword,
      };
      fallbackUsers.push(user);
    }

    // Remove password from response
    delete user.password;

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

    if (!useFallback && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("email", email)
        .single();
      
      if (data) user = data;
    } else {
      user = fallbackUsers.find((u) => u.email === email);
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
      { id: user.id },
      process.env.JWT_SECRET || "ledgerflow-secret",
      { expiresIn: "7d" }
    );
    
    delete user.password;

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

// ================= RESET PASSWORD =================
exports.resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = null;

    if (!useFallback && supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("email", email)
        .single();
      
      if (data) user = data;
    } else {
      user = fallbackUsers.find((u) => u.email === email);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (!useFallback && supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from("users")
        .update({ password: hashedPassword })
        .eq("email", email);
      
      if (error) throw new Error(error.message);
    } else {
      user.password = hashedPassword;
    }

    return res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const DB = require("../config/connectDb");

const JWT_SECRET = process.env.JWT_SECRET;

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    // Check duplicate
    const exists = await DB.getAsync("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (exists) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Insert user
    const result = await DB.runAsync(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name || "", email, hashed]
    );

    res.json({ success: true, message: "Signup successful" });
  } catch (err) {
    console.log("Signup error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Inside login --------------------------------------------");

    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await DB.getAsync("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare hashed password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log(JWT_SECRET);

    // Create JWT
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.log("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

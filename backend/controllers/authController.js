import UserModel from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const registerUser = async (req, res) => {
  try {
    console.log("Incoming request body:", req.body);
    let { name, email, password, defaultPreferences } = req.body;
    email = email?.toLowerCase().trim();

    // Check if user exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already in use" });

    // Hash password (Salt rounds = 10)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new UserModel({
      name,
      email,
      password:passwordHash,
      defaultPreferences // Saves their preferred train class or food diet
    });

    await newUser.save();

    // Generate Token
    const token = jwt.sign({ _id: newUser._id, role: newUser.role, name: newUser.name }, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({ token, user: { _id: newUser._id, name: newUser.name } });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Server error during registration" });
  }
};
// Add this below your registerUser function
export const loginUser = async (req, res) => {
  try {
    let { email, password } = req.body;
    email = email?.toLowerCase().trim();

    // 1. Find user by email
    const user = await UserModel.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // 3. Generate Token
    const token = jwt.sign(
      { _id: user._id, role: user.role, name: user.name }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    return res.status(200).json({ 
      token, 
      user: { _id: user._id, name: user.name, role: user.role } 
    });
    
  } catch (error) {
    return res.status(500).json({ error: "Server error during login" });
  }
};

// Update Profile
export const updateProfile = async (req, res) => {
  try {
    const { name, defaultPreferences } = req.body;
    const user = await UserModel.findByIdAndUpdate(
      req.user._id,
      { name, defaultPreferences },
      { new: true }
    ).select('-password');
    
    // Generate a new token since the name is encoded in the JWT payload
    const token = jwt.sign(
      { _id: user._id, role: user.role, name: user.name }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    return res.status(200).json({ 
      token, 
      user: { _id: user._id, name: user.name, role: user.role, defaultPreferences: user.defaultPreferences } 
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update profile" });
  }
};
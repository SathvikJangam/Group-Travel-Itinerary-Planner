import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  // Check if the token is sent in the Authorization Header (Bearer <token>)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Decode and verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch the user from the database (minus the password hash) and attach to req
      req.user = await User.findById(decoded._id).select('-passwordHash');
      
      return next(); // Pass control to the controller function
    } catch (error) {
      return res.status(401).json({ error: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ error: "Not authorized, no token provided" });
  }
};
export const adminCheck = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: "Admin access denied" });
  }
};
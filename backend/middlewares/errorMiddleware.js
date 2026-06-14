export const errorHandler = (err, req, res, next) => {
  console.error(`🚨 Error Occurred: ${err.message}`);

  // Handle specific errors like Zod structural failures or JWT issues gracefully
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: "Invalid data schema submitted." });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: "Invalid or expired token." });
  }

  return res.status(res.statusCode === 200 ? 500 : res.statusCode).json({
    error: err.message || "Internal Server Disruption",
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};
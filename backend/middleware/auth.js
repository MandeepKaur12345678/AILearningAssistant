import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "User not found",
          statusCode: 401,
        });
      }

      return next();
    } catch (error) {
      console.error("Auth middleware error:", error.message);

      return res.status(401).json({
        success: false,
        error: "Invalid token",
        statusCode: 401,
      });
    }
  }

  // no token case
  return res.status(401).json({
    success: false,
    error: "Not authorized, no token",
    statusCode: 401,
  });
};

export default protect;

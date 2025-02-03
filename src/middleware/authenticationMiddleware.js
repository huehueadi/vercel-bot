import jwt from 'jsonwebtoken';

const authentication = (requiredRole) => {
  return (req, res, next) => {
    // Extract the Authorization header
    const authHeader = req.headers['authorization'];

    // If no Authorization header is found, return an error
    if (!authHeader) {
      return res.status(401).json({
        message: "Authorization token is required.",
        success: false,
      });
    }

    // Verify the JWT token
    jwt.verify(authHeader, "key", (error, user) => {
      if (error) {
        return res.status(403).json({
          message: "Forbidden: Invalid token",
          success: false,
        });
      }

      req.user = user;

      // Check if the user's role matches the required role
      if (requiredRole && user.role !== requiredRole) {
        return res.status(403).json({
          message: "Forbidden: Insufficient permissions",
          success: false,
        });
      }

      next();  // Proceed to the next middleware/route handler
    });
  };
};

export default authentication;

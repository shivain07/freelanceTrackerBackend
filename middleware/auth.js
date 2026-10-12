import jwt from 'jsonwebtoken';


export const requireAuth = (req, res, next) => {
  try {
    // Read token from secure HttpOnly cookie (or req.headers.authorization if using Bearer scheme)
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
    }

    // Verify token integrity and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user payload to request object for downstream controllers
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session token.' });
    }
    return next(error);
  }
};


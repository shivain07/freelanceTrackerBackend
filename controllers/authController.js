import 'dotenv/config';
import { findOrCreateGoogleUser } from '../services/userService.js';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const handleGoogleLogin = async (req, res, next) => {
  try {
    const { token, authMode } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Google token is missing' });
    }

    let googleId, email, name, avatar_url;

    try {
      // Attempt 1: Try verifying as a Google ID Token (JWT)
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      googleId = payload.sub;
      email = payload.email;
      name = payload.name;
      avatar_url = payload.picture;
    } catch (idTokenError) {
      // Attempt 2: If ID token verification fails, try fetching user info using it as an Access Token
      let googleRes;
      try {
        googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        const upstreamError = new Error('Unable to reach Google to verify the access token');
        upstreamError.statusCode = 502;
        return next(upstreamError);
      }

      if (googleRes.status === 401 || googleRes.status === 403) {
        return res.status(401).json({ success: false, error: 'Invalid Google Token' });
      }

      if (!googleRes.ok) {
        const upstreamError = new Error('Google could not verify the access token');
        upstreamError.statusCode = 502;
        return next(upstreamError);
      }

      const googleUser = await googleRes.json();

      googleId = googleUser.sub;
      email = googleUser.email;
      name = googleUser.name;
      avatar_url = googleUser.picture;
    }
    // 2. Database Step: Find or create the user in your database

    //get user from db is exist else create
    const user = await findOrCreateGoogleUser({ googleId, email, name, avatar_url });

    // 3. Issue your application's own Session/JWT Token
    const appToken = jwt.sign(
      { id: user.id, email: user.email, avatar_url: user.avatar_url },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userPayload = { id: user.id, name, email, avatar_url };

    // iOS blocks the cross-site auth cookie, so those clients receive the JWT
    // in the body and send it back as an Authorization bearer header.
    if (authMode === 'bearer') {
      return res.status(200).json({
        success: true,
        message: 'Authentication successful',
        user: userPayload,
        token: appToken,
      });
    }

    // HttpOnly cookie keeps the JWT out of JavaScript on browsers that accept it.
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    res.cookie('token', appToken, cookieOptions);

    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      user: userPayload,
    });

  } catch (error) {
    return next(error);
  }
}

export const handleLogout = (req, res, next) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error during logout' });
  }
};


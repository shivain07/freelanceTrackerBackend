import express from 'express';
import { handleGoogleLogin, handleLogout } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post("/google", handleGoogleLogin);
router.post("/logout", handleLogout);
router.get('/verify', requireAuth, (req, res) => {
    // req.user contains the decoded JWT payload (user id, email, name, picture)
    return res.status(200).json({
        success: true,
        user: req.user
    });
});
export default router;

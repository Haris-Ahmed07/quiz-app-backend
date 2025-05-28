const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  googleAuth,
  forgotPassword,
  resetPassword,
  getMe
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Register and login routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleAuth);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);

// Get current user
router.get('/me', protect, getMe);

module.exports = router;
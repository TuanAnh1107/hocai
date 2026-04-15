const express = require('express');
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.get('/login', authController.showLogin);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.get('/reset-password', authController.showResetPasswordPage);
router.post('/reset-password', authController.resetPassword);
router.get('/auth/google', authController.googleAuth);
router.get('/auth/google/callback', authController.googleCallback);
router.get('/api/user/current', authController.getCurrentUser);
router.post('/logout', authController.logout);
router.get('/api/user/courses', authController.getUserCourses);
router.get('/admin', adminController.showAdminDashboard);
router.post('/api/user/update', authController.handleUpdateUserInfo);

module.exports = router;

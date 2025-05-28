const express = require('express');
const router = express.Router();
const {
  getQuizzes,
  getQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  submitQuizAttempt,
  getSubjects
} = require('../controllers/quizController');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/', getQuizzes);
router.get('/subjects', getSubjects);
router.get('/:id', getQuiz);

// Protected routes
router.post('/create', protect, createQuiz);
router.put('/:id', protect, updateQuiz);
router.delete('/:id', protect, deleteQuiz);
router.post('/:id/attempt', protect, submitQuizAttempt);

module.exports = router;
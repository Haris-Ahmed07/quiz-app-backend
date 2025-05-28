const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const User = require('../models/User');

// @desc    Get all quizzes
// @route   GET /api/quizzes
// @access  Public
exports.getQuizzes = async (req, res) => {
  try {
    console.log('Fetching quizzes with params:', req.query);
    
    const { subject, sort, search } = req.query;
    
    // Validate sort parameter
    const validSortOptions = ['a-z', 'z-a', 'newest', 'oldest', 'duration-asc', 'duration-desc'];
    if (sort && !validSortOptions.includes(sort.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid sort option. Valid options are: ${validSortOptions.join(', ')}`
      });
    }

    // Build query
    const query = { isPublic: true };
    
    // Filter by subject
    if (subject && subject !== 'all') {
      query.subject = subject;
    }
    
    // Search by title
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    
    // Build sort object
    let sortOptions = {};
    if (sort) {
      const lowerSort = sort.toLowerCase();
      switch (lowerSort) {
        case 'a-z':
          sortOptions.title = 1;
          break;
        case 'z-a':
          sortOptions.title = -1;
          break;
        case 'newest':
          sortOptions.createdAt = -1;
          break;
        case 'oldest':
          sortOptions.createdAt = 1;
          break;
        case 'duration-asc':
          sortOptions.duration = 1;
          break;
        case 'duration-desc':
          sortOptions.duration = -1;
          break;
        default:
          sortOptions.createdAt = -1;
      }
    } else {
      sortOptions.createdAt = -1; // Default sort by newest
    }

    console.log('Query:', query);
    console.log('Sort options:', sortOptions);

    const quizzes = await Quiz.find(query)
      .select('title subject duration createdAt questions')
      .populate('createdBy', 'name')
      .sort(sortOptions);

    console.log(`Found ${quizzes.length} quizzes`);

    res.status(200).json({
      success: true,
      count: quizzes.length,
      data: quizzes
    });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid parameter format'
      });
    }

    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'Server error occurred. Please try again later.'
    });
  }
};

// @desc    Get single quiz
// @route   GET /api/quizzes/:id
// @access  Public
exports.getQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('createdBy', 'name');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    res.status(200).json({
      success: true,
      data: quiz
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new quiz
// @route   POST /api/quizzes/create
// @access  Private
exports.createQuiz = async (req, res) => {
  try {
    // Validate user authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Check if user exists
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Add user to req.body
    req.body.createdBy = req.user.id;

    // Validate quiz data
    const { title, subject, duration, questions } = req.body;
    if (!title || !subject || !duration || !questions || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: title, subject, duration, and at least one question'
      });
    }

    // Create quiz
    const quiz = await Quiz.create(req.body);

    res.status(201).json({
      success: true,
      data: quiz
    });
  } catch (error) {
    console.error('Create quiz error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'Server error occurred. Please try again later.'
    });
  }
};

// @desc    Update quiz
// @route   PUT /api/quizzes/:id
// @access  Private
exports.updateQuiz = async (req, res) => {
  try {
    let quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Make sure user is quiz owner
    if (quiz.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this quiz'
      });
    }

    quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: quiz
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete quiz
// @route   DELETE /api/quizzes/:id
// @access  Private
exports.deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Make sure user is quiz owner
    if (quiz.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this quiz'
      });
    }

    // Also delete all attempts for this quiz
    await QuizAttempt.deleteMany({ quizId: quiz._id });
    
    await quiz.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Submit quiz attempt
// @route   POST /api/quizzes/:id/attempt
// @access  Public
exports.submitQuizAttempt = async (req, res) => {
  try {
    const { id: quizId } = req.params;  // Changed to extract 'id' from params and alias it as quizId
    const { responses, timeTaken } = req.body;

    // Validate required fields
    if (!quizId) {
      return res.status(400).json({
        success: false,
        message: 'Quiz ID is required'
      });
    }

    if (!responses || !Array.isArray(responses)) {
      return res.status(400).json({
        success: false,
        message: 'Responses array is required'
      });
    }

    // Get the quiz
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Calculate score
    let score = 0;
    const processedResponses = responses.map(response => {
      const question = quiz.questions.id(response.questionId);
      const isCorrect = question.correctAnswer == response.selectedAnswer;
      
      if (isCorrect) {
        score += question.marks;
      }
      
      return {
        questionId: response.questionId,
        selectedAnswer: response.selectedAnswer,
        isCorrect
      };
    });

    // Create quiz attempt with user ID
    const quizAttempt = await QuizAttempt.create({
      userId: req.user.id,  // Add user ID from authenticated request
      quizId,
      score,
      totalMarks: quiz.totalMarks,
      responses: processedResponses,
      timeTaken
    });

    res.status(201).json({
      success: true,
      data: quizAttempt
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all subjects (categories)
// @route   GET /api/quizzes/subjects
// @access  Public
exports.getSubjects = async (req, res) => {
  try {
    const subjects = await Quiz.distinct('subject');

    res.status(200).json({
      success: true,
      data: subjects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
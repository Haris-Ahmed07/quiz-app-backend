const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a quiz title'],
    trim: true
  },
  subject: {
    type: String,
    required: [true, 'Please provide a subject'],
    trim: true
  },
  duration: {
    type: Number,
    required: [true, 'Please provide a duration in minutes'],
    min: [1, 'Duration must be at least 1 minute']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questions: [{
    type: {
      type: String,
      enum: ['MCQ', 'Fill', 'TrueFalse'],
      required: true
    },
    questionText: {
      type: String,
      required: true
    },
    options: {
      type: [String],
      required: function() {
        return this.type === 'MCQ'; // Options are required only for MCQs
      }
    },
    correctAnswer: {
      type: mongoose.Schema.Types.Mixed, // Can be String, Number, or Boolean
      required: true
    },
    marks: {
      type: Number,
      default: 1,
      min: [1, 'Marks must be at least 1']
    }
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field for total marks
QuizSchema.virtual('totalMarks').get(function() {
  return this.questions.reduce((total, question) => total + question.marks, 0);
});

// Virtual field for quiz length (number of questions)
QuizSchema.virtual('questionCount').get(function() {
  return this.questions.length;
});

module.exports = mongoose.model('Quiz', QuizSchema);
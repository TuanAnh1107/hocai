const express = require('express');
const router = express.Router();
const { AdminController } = require('../controllers/adminController');

// Lấy danh sách khoá học
router.get('/courses', AdminController.getAllCourses);

// Cập nhật tên khoá học
router.put('/courses/:id', AdminController.updateCourseName);

// Lấy danh sách chương của khoá học
router.get('/courses/:courseId/chapters', AdminController.getChapters);

// Cập nhật tên chương
router.put('/courses/:courseId/chapters/:chapterId', AdminController.updateChapterName);

// Lấy danh sách bài học của chương
router.get('/courses/:courseId/chapters/:chapterId/lessons', AdminController.getLessons);

// Cập nhật tên bài học
router.put('/courses/:courseId/chapters/:chapterId/lessons/:lessonId', AdminController.updateLessonName);

// Lấy danh sách câu hỏi và đáp án của bài học
router.get('/courses/:courseId/chapters/:chapterId/lessons/:lessonId/questions', AdminController.getLessonQuestions);

// Cập nhật nội dung câu hỏi
router.put('/questions/:questionId', AdminController.updateQuestionContent);

// Cập nhật nội dung đáp án
router.put('/answers/:answerId', AdminController.updateAnswerContent);

// Đổi đáp án đúng cho câu hỏi
router.put('/questions/:questionId/answers/:answerId/correct', AdminController.setCorrectAnswer);

// Thêm câu hỏi mới cho bài học
router.post('/courses/:courseId/chapters/:chapterId/lessons/:lessonId/questions', AdminController.addLessonQuestion);

module.exports = router; 
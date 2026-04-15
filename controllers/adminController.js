/**
 * Hiển thị trang admin nếu người dùng có quyền admin
 * @param {Request} req
 * @param {Response} res
 */
const showAdminDashboard = (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ 
            error: 'Bạn không có quyền admin',
            redirect: '/'
        });
    }

    res.render('admin', {
        layout: false,
        title: 'Admin Dashboard',
        user: {
            username: req.session.user.username
        }
    });
};

const CourseModel = require('../models/courseModel');

/**
 * Xử lý các thao tác của admin
 */
class AdminController {
    /**
     * Lấy danh sách khoá học
     * @param {Request} req
     * @param {Response} res
     */
    static async getAllCourses(req, res) {
        try {
            const courses = await CourseModel.getAllCourses(req.db);
            res.json({ success: true, courses });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
        }
    }

    /**
     * Cập nhật tên khoá học
     * @param {Request} req
     * @param {Response} res
     */
    static async updateCourseName(req, res) {
        const { id } = req.params;
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'Tên khoá học không được để trống' });
        }
        try {
            const result = await CourseModel.updateCourseName(req.db, id, name);
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy khoá học' });
            }
            res.json({ success: true, message: 'Cập nhật thành công' });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
        }
    }

    /**
     * Lấy danh sách chương của khoá học
     * @param {Request} req
     * @param {Response} res
     */
    static async getChapters(req, res) {
        try {
            const chapters = await CourseModel.getChapters(req.db, req.params.courseId);
            res.json({ success: true, chapters });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
        }
    }

    /**
     * Cập nhật tên chương
     * @param {Request} req
     * @param {Response} res
     */
    static async updateChapterName(req, res) {
        const { chapterId } = req.params;
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'Tên chương không được để trống' });
        }
        try {
            const result = await CourseModel.updateChapterName(req.db, chapterId, name);
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy chương' });
            }
            res.json({ success: true, message: 'Cập nhật thành công' });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
        }
    }

    /**
     * Lấy danh sách bài học của chương
     * @param {Request} req
     * @param {Response} res
     */
    static async getLessons(req, res) {
        try {
            const lessons = await CourseModel.getLessons(req.db, req.params.courseId, req.params.chapterId);
            res.json({ success: true, lessons });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
        }
    }

    /**
     * Cập nhật tên bài học
     * @param {Request} req
     * @param {Response} res
     */
    static async updateLessonName(req, res) {
        const { lessonId } = req.params;
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'Tên bài học không được để trống' });
        }
        try {
            const result = await CourseModel.updateLessonName(req.db, lessonId, name);
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy bài học' });
            }
            res.json({ success: true, message: 'Cập nhật thành công' });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
        }
    }

    /**
     * Lấy danh sách câu hỏi và đáp án của bài học
     * @param {Request} req
     * @param {Response} res
     */
    static async getLessonQuestions(req, res) {
        try {
            const questions = await CourseModel.getLessonQuestions(req.db, req.params.courseId, req.params.chapterId, req.params.lessonId);
            res.json({ success: true, questions });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
        }
    }

    /**
     * Cập nhật nội dung câu hỏi
     * @param {Request} req
     * @param {Response} res
     */
    static async updateQuestionContent(req, res) {
        const { questionId } = req.params;
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ success: false, message: 'Nội dung câu hỏi không được để trống' });
        }
        try {
            const result = await CourseModel.updateQuestionContent(req.db, questionId, content);
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy câu hỏi' });
            }
            res.json({ success: true, message: 'Cập nhật thành công' });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
        }
    }

    /**
     * Cập nhật nội dung đáp án
     * @param {Request} req
     * @param {Response} res
     */
    static async updateAnswerContent(req, res) {
        const { answerId } = req.params;
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ success: false, message: 'Nội dung đáp án không được để trống' });
        }
        try {
            const result = await CourseModel.updateAnswerContent(req.db, answerId, content);
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy đáp án' });
            }
            res.json({ success: true, message: 'Cập nhật thành công' });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
        }
    }

    /**
     * Đổi đáp án đúng cho câu hỏi
     * @param {Request} req
     * @param {Response} res
     */
    static async setCorrectAnswer(req, res) {
        const { questionId, answerId } = req.params;
        const { istrue } = req.body;
        try {
            if (typeof istrue !== 'undefined') {
                await CourseModel.setCorrectAnswerCheckbox(req.db, answerId, !!istrue);
            } else {
                await CourseModel.setCorrectAnswer(req.db, questionId, answerId);
            }
            res.json({ success: true, message: 'Cập nhật đáp án đúng thành công' });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
        }
    }

    /**
     * Thêm câu hỏi mới cho bài học
     * @param {Request} req
     * @param {Response} res
     */
    static async addLessonQuestion(req, res) {
        const { courseId, chapterId, lessonId } = req.params;
        const { content, type, answers } = req.body;
        if (!content || !type || !Array.isArray(answers) || (type !== 'text' && answers.length < 2) || (type === 'text' && answers.length < 1)) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin hoặc số đáp án không hợp lệ' });
        }
        try {
            await CourseModel.addLessonQuestion(req.db, courseId, chapterId, lessonId, content, type, answers);
            res.json({ success: true, message: 'Thêm câu hỏi thành công' });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
        }
    }
}

module.exports = {
    showAdminDashboard,
    AdminController
}; 
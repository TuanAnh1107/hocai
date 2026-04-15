const mysql = require('mysql2/promise');

class CourseModel {
   constructor(db) {
        this.db = db;
    }
    /**
     * Lấy roadmap, tiến độ học tập của người dùng
     * @param {string} email
     */
    async getUserRoadmap(email) {
        const [userCourse] = await this.db.query('SELECT roadmap FROM user_course WHERE email = ?', [email]);
        return userCourse.length > 0 ? userCourse[0].roadmap : null;
    }

    /**
     * Lấy thông tin khoá học
     * @param {string} id_course
     */
    async getCourseInfo(id_course) {
        const [courseRows] = await this.db.query('SELECT name_course, url, content FROM course_list WHERE id_course = ?', [id_course]);
        return courseRows.length > 0 ? courseRows[0] : null;
    }

    /**
     * Lấy danh sách chương 
     * @param {any} db
     * @param {string} id_course
     */
    static async getChapters(db, id_course) {
        const [chapters] = await db.query(
            'SELECT id_chapter, name_chapter FROM chapter_list WHERE id_course = ? ORDER BY id_chapter ASC',
            [id_course]
        );
        return chapters;
    }

    /**
     * Lấy danh sách bài học 
     * @param {any} db
     * @param {string} id_course
     * @param {string} id_chapter
     */
    static async getLessons(db, id_course, id_chapter) {
        const [lessons] = await db.query(
            'SELECT id_lesson, name_lesson FROM lesson_name WHERE id_course = ? AND id_chapter = ? ORDER BY id_lesson ASC',
            [id_course, id_chapter]
        );
        return lessons;
    }

    /**
     * Lấy số thứ tự của bài học trong toàn bộ khóa học
     * @param {string} id_course
     * @param {string} id_chapter
     * @param {string} id_lesson
     * @returns {Promise<number>}
     */
    async getLessonSequenceNumber(id_course, id_chapter, id_lesson) {
        const chapters = await CourseModel.getChapters(this.db, id_course);
        let lessonCounter = 0;

        for (const chapter of chapters) {
            const lessons = await CourseModel.getLessons(this.db, id_course, chapter.id_chapter);
            for (const lesson of lessons) {
                lessonCounter += 1;
                if (chapter.id_chapter === id_chapter && lesson.id_lesson === id_lesson) {
                    return lessonCounter;
                }
            }
        }

        return 0;
    }

    /**
     * Lấy nội dung bài học
     * @param {string} id_course
     * @param {string} id_chapter
     * @param {string} id_lesson
     */
    async getLessonContent(id_course, id_chapter, id_lesson) {
        const [contentRows] = await this.db.query(
            'SELECT content, url, review FROM lesson_content WHERE id_course = ? AND id_chapter = ? AND id_lesson = ?',
            [id_course, id_chapter, id_lesson]
        );
        return contentRows.length > 0 ? contentRows[0] : null;
    }

    /**
     * Lấy quiz của bài học
     * @param {string} id_course
     * @param {string} id_chapter
     * @param {string} id_lesson
     */
    async getLessonQuizz(id_course, id_chapter, id_lesson) {
        const [quizzRows] = await this.db.query(
            'SELECT id_quizz, question, type FROM lesson_quizz WHERE id_course = ? AND id_chapter = ? AND id_lesson = ? ORDER BY id_quizz ASC',
            [id_course, id_chapter, id_lesson]
        );

        for (const quizz of quizzRows) {
            const [answers] = await this.db.query(
                'SELECT id_answer, content, istrue FROM quizz_answer WHERE id_quizz = ? ORDER BY id_answer ASC',
                [quizz.id_quizz]
            );
            quizz.answers = answers;
        }

        return quizzRows;
    }

    /**
     * Cập nhật roadmap cho user
     * @param {string} email
     * @param {string} roadmap
     */
    async updateRoadmap(email, roadmap) {
        await this.db.query('UPDATE user_course SET roadmap = ? WHERE email = ?', [roadmap, email]);
    }

    /**
     * Lấy bình luận cho bài học
     * @param {string} id_course
     * @param {string} id_chapter
     * @param {string} id_lesson
     */
    async getLessonComments(id_course, id_chapter, id_lesson) {
        const [rows] = await this.db.query(
            `SELECT uc.email, uc.time_cmt, uc.cmt_content
             FROM lesson_cmt lc
             JOIN user_cmt uc ON lc.id_cmt = uc.id_cmt
             WHERE lc.id_course = ? AND lc.id_chapter = ? AND lc.id_lesson = ?
             ORDER BY uc.time_cmt ASC`,
            [id_course, id_chapter, id_lesson]
        );
        return rows;
    }

    /**
     * Thêm bình luận cho bài học
     * @param {string} email
     * @param {string} id_course
     * @param {string} id_chapter
     * @param {string} id_lesson
     * @param {string} cmt_content
     */
    async addLessonComment(email, id_course, id_chapter, id_lesson, cmt_content) {
        const [result] = await this.db.query(
            'INSERT INTO user_cmt (email, time_cmt, cmt_content) VALUES (?, NOW(), ?)',
            [email, cmt_content]
        );
        const id_cmt = result.insertId;
        await this.db.query(
            'INSERT INTO lesson_cmt (id_cmt, id_course, id_chapter, id_lesson) VALUES (?, ?, ?, ?)',
            [id_cmt, id_course, id_chapter, id_lesson]
        );
        return id_cmt;
    }

    /**
     * Lấy danh sách khoá học 
     * @param {any} db
     */
    static async getAllCourses(db) {
        const [rows] = await db.query('SELECT id_course, name_course FROM course_list');
        return rows;
    }

    /**
     * Cập nhật tên khoá học 
     * @param {any} db
     * @param {string} id
     * @param {string} name
     */
    static async updateCourseName(db, id, name) {
        const [result] = await db.query('UPDATE course_list SET name_course = ? WHERE id_course = ?', [name, id]);
        return result;
    }

    /**
     * Cập nhật tên chương 
     * @param {any} db
     * @param {string} chapterId
     * @param {string} name
     */
    static async updateChapterName(db, chapterId, name) {
        const [result] = await db.query('UPDATE chapter_list SET name_chapter = ? WHERE id_chapter = ?', [name, chapterId]);
        return result;
    }

    /**
     * Cập nhật tên bài học 
     * @param {any} db
     * @param {string} lessonId
     * @param {string} name
     */
    static async updateLessonName(db, lessonId, name) {
        const [result] = await db.query('UPDATE lesson_name SET name_lesson = ? WHERE id_lesson = ?', [name, lessonId]);
        return result;
    }

    /**
     * Lấy danh sách câu hỏi và đáp án của bài học 
     * @param {any} db
     * @param {string} id_course
     * @param {string} id_chapter
     * @param {string} id_lesson
     */
    static async getLessonQuestions(db, id_course, id_chapter, id_lesson) {
        const [questions] = await db.query(
            'SELECT id_quizz, question, type FROM lesson_quizz WHERE id_course = ? AND id_chapter = ? AND id_lesson = ? ORDER BY id_quizz ASC',
            [id_course, id_chapter, id_lesson]
        );
        for (const q of questions) {
            const [answers] = await db.query(
                'SELECT id_answer, content, istrue FROM quizz_answer WHERE id_quizz = ? ORDER BY id_answer ASC',
                [q.id_quizz]
            );
            q.answers = answers;
        }
        return questions;
    }

    /**
     * Cập nhật nội dung câu hỏi 
     * @param {any} db
     * @param {string} questionId
     * @param {string} content
     */
    static async updateQuestionContent(db, questionId, content) {
        const [result] = await db.query('UPDATE lesson_quizz SET question = ? WHERE id_quizz = ?', [content, questionId]);
        return result;
    }

    /**
     * Cập nhật nội dung đáp án 
     * @param {any} db
     * @param {string} answerId
     * @param {string} content
     */
    static async updateAnswerContent(db, answerId, content) {
        const [result] = await db.query('UPDATE quizz_answer SET content = ? WHERE id_answer = ?', [content, answerId]);
        return result;
    }

    /**
     * Đổi đáp án đúng cho câu hỏi 
     * @param {any} db
     * @param {string} questionId
     * @param {string} answerId
     */
    static async setCorrectAnswer(db, questionId, answerId) {
        await db.query('UPDATE quizz_answer SET istrue = 0 WHERE id_quizz = ?', [questionId]);
        await db.query('UPDATE quizz_answer SET istrue = 1 WHERE id_answer = ?', [answerId]);
    }

    /**
     * Đổi đáp án đúng cho đáp án dạng checkbox 
     * @param {any} db
     * @param {string} answerId
     * @param {boolean} istrue
     */
    static async setCorrectAnswerCheckbox(db, answerId, istrue) {
        await db.query('UPDATE quizz_answer SET istrue = ? WHERE id_answer = ?', [istrue ? 1 : 0, answerId]);
    }

    /**
     * Thêm câu hỏi mới cho bài học 
     * @param {any} db
     * @param {string} id_course
     * @param {string} id_chapter
     * @param {string} id_lesson
     * @param {string} content
     * @param {string} type
     * @param {Array} answers
     */
    static async addLessonQuestion(db, id_course, id_chapter, id_lesson, content, type, answers) {
        const [result] = await db.query(
            'INSERT INTO lesson_quizz (id_course, id_chapter, id_lesson, question, type) VALUES (?, ?, ?, ?, ?)',
            [id_course, id_chapter, id_lesson, content, type]
        );
        const id_quizz = result.insertId;
        let id_answer = 1;
        for (const ans of answers) {
            await db.query(
                'INSERT INTO quizz_answer (id_quizz, id_answer, content, istrue) VALUES (?, ?, ?, ?)',
                [id_quizz, id_answer, ans.content, ans.istrue ? 1 : 0]
            );
            id_answer++;
        }
    }
}

module.exports = CourseModel; 

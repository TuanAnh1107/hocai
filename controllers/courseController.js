const CourseModel = require('../models/courseModel');

class CourseController {
    constructor(db) {
        this.courseModel = new CourseModel(db);
    }

    /**
     * Xử lý sự kiện người dùng truy cập trang học
     * @param {Request} req
     * @param {Response} res
     */
    async getCoursePage(req, res) {
        if (!req.session?.user?.userId) {
            return res.send(`<script>alert('Bạn phải đăng nhập để học'); window.location.href = '/';</script>`);
        }

        const email = req.session.user.userId;
        const id_course = req.query.id_course;

        if (!id_course) {
            return res.render('tranghoc', {
                title: 'Khóa học AI - hocAI',
                css: 'tranghoc',
                js: 'tranghoc'
            });
        }

        try {
            const roadmapStr = await this.courseModel.getUserRoadmap(email);
            if (!roadmapStr) {
                return res.status(404).send('Không tìm thấy roadmap');
            }

            req.session.roadmap = roadmapStr;
            const courseRoadmap = this.extractCourseRoadmap(roadmapStr, id_course);
            const currentLessonIndex = parseInt(courseRoadmap, 10) || 0;

            if (currentLessonIndex === 0) {
                const courseInfo = await this.courseModel.getCourseInfo(id_course);
                if (!courseInfo) {
                    return res.status(404).send('Không tìm thấy khóa học');
                }

                return res.render('gioithieukhoahoc', {
                    title: 'Giới thiệu khóa học',
                    name_course: courseInfo.name_course,
                    course_url: courseInfo.url,
                    course_content: courseInfo.content,
                    css: 'gtkh',
                    js: 'gtkh'
                });
            }

            const chapters = await CourseModel.getChapters(this.courseModel.db, id_course);
            const chapterList = await this.buildChapterList(id_course, chapters, currentLessonIndex);

            return res.render('tranghoc', {
                title: 'Khóa học AI - hocAI',
                css: 'tranghoc',
                js: 'tranghoc',
                course: { chapters: chapterList }
            });
        } catch (err) {
            console.error('Lỗi truy vấn CSDL:', err);
            return res.status(500).send('Lỗi máy chủ');
        }
    }

    /**
     * Xử lý sự kiện người dùng bấm đăng ký khóa học
     * @param {Request} req
     * @param {Response} res
     */
    async registerCourse(req, res) {
        if (!req.session?.user?.userId) {
            return res.json({ success: false, message: 'Bạn cần đăng nhập!' });
        }

        const email = req.session.user.userId;
        const { id_course } = req.body;

        if (!id_course) {
            return res.json({ success: false, message: 'Thiếu id_course!' });
        }

        try {
            const roadmapStr = await this.courseModel.getUserRoadmap(email);
            if (!roadmapStr) {
                return res.json({ success: false, message: 'Không tìm thấy user!' });
            }

            const updatedRoadmap = this.updateCourseRoadmap(roadmapStr, id_course);
            if (!updatedRoadmap) {
                return res.json({ success: false, message: 'Không tìm thấy roadmap khóa học!' });
            }

            await this.courseModel.updateRoadmap(email, updatedRoadmap);
            req.session.roadmap = updatedRoadmap;
            return res.json({ success: true });
        } catch (err) {
            console.error('Lỗi cập nhật roadmap:', err);
            return res.json({ success: false, message: 'Lỗi máy chủ!' });
        }
    }

    /**
     * Lấy nội dung bài học
     * @param {Request} req
     * @param {Response} res
     */
    async getLessonContent(req, res) {
        if (!req.session?.user?.userId) {
            return res.status(401).json({ success: false, message: 'Bạn cần đăng nhập!' });
        }

        const { id_course, id_chapter, id_lesson, stt } = req.query;
        if (!id_course || !id_chapter || !id_lesson || !stt) {
            return res.status(400).json({ success: false, message: 'Thiếu tham số!' });
        }

        const accessContext = await this.getAuthorizedLessonContext(req, res, {
            id_course,
            id_chapter,
            id_lesson,
            stt
        });
        if (!accessContext) {
            return;
        }

        const content = await this.courseModel.getLessonContent(id_course, id_chapter, id_lesson);
        if (!content) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy nội dung bài học!' });
        }

        return res.json({ success: true, data: content });
    }

    /**
     * Lấy quiz của bài học
     * @param {Request} req
     * @param {Response} res
     */
    async getLessonQuizz(req, res) {
        if (!req.session?.user?.userId) {
            return res.status(401).json({ success: false, message: 'Bạn cần đăng nhập!' });
        }

        const { id_course, id_chapter, id_lesson } = req.query;
        if (!id_course || !id_chapter || !id_lesson) {
            return res.status(400).json({ success: false, message: 'Thiếu tham số!' });
        }

        try {
            const accessContext = await this.getAuthorizedLessonContext(req, res, {
                id_course,
                id_chapter,
                id_lesson
            });
            if (!accessContext) {
                return;
            }

            const quizzData = await this.courseModel.getLessonQuizz(id_course, id_chapter, id_lesson);
            return res.json({ success: true, data: quizzData });
        } catch (err) {
            console.error('Lỗi lấy quiz:', err);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ!' });
        }
    }

    /**
     * Cập nhật lộ trình học của người dùng
     * @param {Request} req
     * @param {Response} res
     */
    async updateRoadmap(req, res) {
        if (!req.session?.user?.userId) {
            return res.status(401).json({ success: false, message: 'Bạn cần đăng nhập!' });
        }

        const email = req.session.user.userId;
        const { id_course, stt } = req.body;

        if (!id_course || !stt) {
            return res.json({ success: false, message: 'Thiếu tham số!' });
        }

        try {
            const roadmapStr = await this.courseModel.getUserRoadmap(email);
            if (!roadmapStr) {
                return res.json({ success: false, message: 'Không tìm thấy user!' });
            }

            const courseRoadmap = this.extractCourseRoadmap(roadmapStr, id_course);
            const currentLessonIndex = parseInt(courseRoadmap, 10) || 0;
            const newLessonIndex = parseInt(stt, 10);

            if (newLessonIndex > currentLessonIndex) {
                const updatedRoadmap = this.updateCourseRoadmap(roadmapStr, id_course, newLessonIndex);
                if (!updatedRoadmap) {
                    return res.json({ success: false, message: 'Không tìm thấy roadmap khóa học!' });
                }

                await this.courseModel.updateRoadmap(email, updatedRoadmap);
                req.session.roadmap = updatedRoadmap;
                return res.json({ success: true, updated: true });
            }

            return res.json({ success: true, updated: false });
        } catch (err) {
            console.error('Lỗi cập nhật roadmap:', err);
            return res.json({ success: false, message: 'Lỗi máy chủ!' });
        }
    }

    /**
     * Lấy bình luận của bài học
     * @param {Request} req
     * @param {Response} res
     */
    async getLessonComments(req, res) {
        if (!req.session?.user?.userId) {
            return res.status(401).json({ success: false, message: 'Bạn cần đăng nhập!' });
        }

        const { id_course, id_chapter, id_lesson } = req.query;
        if (!id_course || !id_chapter || !id_lesson) {
            return res.status(400).json({ success: false, message: 'Thiếu tham số!' });
        }

        try {
            const accessContext = await this.getAuthorizedLessonContext(req, res, {
                id_course,
                id_chapter,
                id_lesson
            });
            if (!accessContext) {
                return;
            }

            const comments = await this.courseModel.getLessonComments(id_course, id_chapter, id_lesson);
            return res.json({ success: true, data: comments });
        } catch (err) {
            console.error('Lỗi lấy bình luận:', err);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ!' });
        }
    }

    /**
     * Thêm bình luận cho bài học
     * @param {Request} req
     * @param {Response} res
     */
    async addLessonComment(req, res) {
        if (!req.session?.user?.userId) {
            return res.status(401).json({ success: false, message: 'Bạn cần đăng nhập!' });
        }

        const email = req.session.user.userId;
        const { id_course, id_chapter, id_lesson, cmt_content } = req.body;

        if (!id_course || !id_chapter || !id_lesson || !cmt_content) {
            return res.status(400).json({ success: false, message: 'Thiếu tham số!' });
        }

        try {
            const accessContext = await this.getAuthorizedLessonContext(req, res, {
                id_course,
                id_chapter,
                id_lesson
            });
            if (!accessContext) {
                return;
            }

            await this.courseModel.addLessonComment(email, id_course, id_chapter, id_lesson, cmt_content);
            return res.json({ success: true });
        } catch (err) {
            console.error('Lỗi lưu bình luận:', err);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ!' });
        }
    }

    /**
     * Kiểm tra quyền truy cập bài học đồng bộ giữa nội dung, quiz và bình luận
     * @param {Request} req
     * @param {Response} res
     * @param {{id_course: string, id_chapter: string, id_lesson: string, stt?: string|number}} payload
     * @returns {Promise<object|null>}
     */
    async getAuthorizedLessonContext(req, res, payload) {
        const { id_course, id_chapter, id_lesson, stt } = payload;
        const email = req.session?.user?.userId;

        let roadmapStr = req.session?.roadmap;
        if (!roadmapStr && email) {
            roadmapStr = await this.courseModel.getUserRoadmap(email);
            if (roadmapStr) {
                req.session.roadmap = roadmapStr;
            }
        }

        if (!roadmapStr) {
            res.status(403).json({ success: false, message: 'Không tìm thấy roadmap!' });
            return null;
        }

        const courseRoadmap = this.extractCourseRoadmap(roadmapStr, id_course);
        const currentLessonIndex = parseInt(courseRoadmap, 10) || 0;
        const requestedLessonIndex = stt
            ? parseInt(stt, 10)
            : await this.courseModel.getLessonSequenceNumber(id_course, id_chapter, id_lesson);

        if (!requestedLessonIndex) {
            res.status(404).json({ success: false, message: 'Không tìm thấy bài học!' });
            return null;
        }

        if (requestedLessonIndex > currentLessonIndex) {
            res.status(403).json({ success: false, message: 'Bạn chưa được phép truy cập bài học này!' });
            return null;
        }

        return {
            roadmapStr,
            currentLessonIndex,
            requestedLessonIndex
        };
    }

    /**
     * Trích xuất lộ trình khóa học từ roadmap của người dùng
     * @param {string} roadmapStr
     * @param {string} courseTag
     * @returns {string}
     */
    extractCourseRoadmap(roadmapStr, courseTag) {
        const firstIdx = roadmapStr.indexOf(courseTag);
        if (firstIdx === -1) {
            return '';
        }

        const secondIdx = roadmapStr.indexOf(courseTag, firstIdx + courseTag.length);
        if (secondIdx === -1) {
            return roadmapStr.substring(firstIdx + courseTag.length);
        }

        return roadmapStr.substring(firstIdx + courseTag.length, secondIdx);
    }

    /**
     * Cập nhật tiến độ khóa học trong roadmap
     * @param {string} roadmapStr
     * @param {string} courseTag
     * @param {number} [newValue=1]
     * @returns {string|null}
     */
    updateCourseRoadmap(roadmapStr, courseTag, newValue = 1) {
        const firstIdx = roadmapStr.indexOf(courseTag);
        const secondIdx = roadmapStr.indexOf(courseTag, firstIdx + courseTag.length);

        if (firstIdx === -1 || secondIdx === -1) {
            return null;
        }

        const courseRoadmap = roadmapStr.substring(firstIdx + courseTag.length, secondIdx);
        if (courseRoadmap === '0' || (newValue && parseInt(courseRoadmap, 10) < newValue)) {
            return `${roadmapStr.substring(0, firstIdx + courseTag.length)}${newValue || '1'}${roadmapStr.substring(secondIdx)}`;
        }

        return roadmapStr;
    }

    /**
     * Danh sách khóa học theo thứ tự hiển thị
     * @param {string} id_course
     * @param {Array} chapters
     * @param {number} currentLessonIndex
     * @returns {Array}
     */
    async buildChapterList(id_course, chapters, currentLessonIndex) {
        const chapterList = [];
        let lessonCounter = 0;

        for (let i = 0; i < chapters.length; i += 1) {
            const chapter = chapters[i];
            const lessons = await CourseModel.getLessons(this.courseModel.db, id_course, chapter.id_chapter);

            const chapterLessons = lessons.map((lesson) => {
                lessonCounter += 1;
                return {
                    chapter: chapter.id_chapter,
                    id: lesson.id_lesson,
                    name: lesson.name_lesson,
                    stt: lessonCounter,
                    isUnlocked: currentLessonIndex === 0 ? lessonCounter === 1 : lessonCounter <= currentLessonIndex,
                    isActive: lessonCounter === currentLessonIndex
                };
            });

            chapterList.push({
                stt: i + 1,
                name: chapter.name_chapter,
                lessons: chapterLessons
            });
        }

        return chapterList;
    }
}

module.exports = CourseController;

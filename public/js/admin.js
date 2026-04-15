/**
 * Xử lý giao diện và thao tác trang admin: quản lý khoá học, chương, bài học, câu hỏi, đáp án
 */
document.addEventListener('DOMContentLoaded', function() {
    fetch('/api/user/current')
        .then(response => {
            if (!response.ok) {
                throw new Error('Không phản hồi!');
            }
            return response.json();
        })
        .then(data => {
            if (data.role !== 'admin') {
                alert('Bạn không có quyền admin');
                window.location.href = '/';
            }
        })
        .catch(error => {
            console.error('Lỗi xác minh quyền:', error);
            alert('Bạn không có quyền admin');
            window.location.href = '/';
        });

    const adminButtons = document.querySelectorAll('.admin-btn');
    adminButtons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('Button clicked:', this.textContent);
        });
    });

    // Handle logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            try {
                const response = await fetch('/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    window.location.href = '/';
                } else {
                    console.error('Đăng xuất không thành công');
                }
            } catch (error) {
                console.error('Error during logout:', error);
            }
        });
    }

    // Thêm logic cho nút Danh sách khoá học
    const showCoursesBtn = document.getElementById('show-courses-btn');
    const courseListContainer = document.getElementById('course-list-container');

    if (showCoursesBtn && courseListContainer) {
        showCoursesBtn.addEventListener('click', async function() {
            try {
                const response = await fetch('/admin/courses');
                const data = await response.json();
                if (!data.success) throw new Error('Không lấy được danh sách khoá học');
                renderCourseList(data.courses);
            } catch (err) {
                courseListContainer.innerHTML = '<p style="color:red">Lỗi tải danh sách khoá học</p>';
            }
        });
    }

    /**
     * Hiển thị danh sách khoá học
     * @param {Array} courses
     */
    function renderCourseList(courses) {
        if (!courses.length) {
            courseListContainer.innerHTML = '<p>Không có khoá học nào.</p>';
            return;
        }
        courseListContainer.innerHTML = '<ul class="course-list">' +
            courses.map(course => `
                <li data-id="${course.id_course}" class="course-item">
                    <div class="course-item-header">
                        <span class="course-name clickable">${course.name_course}</span>
                        <button class="edit-btn">Sửa</button>
                    </div>
                    <div class="chapter-list-container"></div>
                </li>
            `).join('') + '</ul>';
        addEditHandlers();
        addCourseClickHandlers();
    }

    /**
     * Thêm sự kiện sửa tên khoá học
     */
    function addEditHandlers() {
        const editBtns = courseListContainer.querySelectorAll('.edit-btn');
        editBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const li = this.closest('li');
                const nameSpan = li.querySelector('.course-name');
                const oldName = nameSpan.textContent;
                nameSpan.innerHTML = `<input type="text" value="${oldName}" class="edit-input">`;
                this.style.display = 'none';
                const doneBtn = document.createElement('button');
                doneBtn.textContent = 'Xong';
                doneBtn.className = 'done-btn';
                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = 'Huỷ';
                cancelBtn.className = 'cancel-btn';
                nameSpan.after(doneBtn, cancelBtn);

                doneBtn.addEventListener('click', async function() {
                    const newName = nameSpan.querySelector('input').value.trim();
                    if (!newName) {
                        alert('Tên khoá học không được để trống!');
                        return;
                    }
                    try {
                        const id = li.getAttribute('data-id');
                        const res = await fetch(`/admin/courses/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: newName })
                        });
                        const result = await res.json();
                        if (result.success) {
                            nameSpan.textContent = newName;
                            btn.style.display = '';
                            doneBtn.remove();
                            cancelBtn.remove();
                        } else {
                            alert(result.message || 'Cập nhật thất bại!');
                        }
                    } catch (err) {
                        alert('Lỗi khi cập nhật tên khoá học!');
                    }
                });

                cancelBtn.addEventListener('click', function() {
                    nameSpan.textContent = oldName;
                    btn.style.display = '';
                    doneBtn.remove();
                    cancelBtn.remove();
                });
            });
        });
    }

    /**
     * Thêm sự kiện click vào khoá học để xem chương
     */
    function addCourseClickHandlers() {
        const courseItems = courseListContainer.querySelectorAll('.course-item .course-name');
        courseItems.forEach(span => {
            span.addEventListener('click', async function() {
                const li = this.closest('li');
                const courseId = li.getAttribute('data-id');
                const chapterContainer = li.querySelector('.chapter-list-container');
                if (chapterContainer.innerHTML) {
                    chapterContainer.innerHTML = '';
                    return;
                }
                chapterContainer.innerHTML = '<p>Đang tải chương...</p>';
                try {
                    const res = await fetch(`/admin/courses/${courseId}/chapters`);
                    const data = await res.json();
                    if (!data.success) throw new Error();
                    renderChapterList(data.chapters, chapterContainer, courseId);
                } catch {
                    chapterContainer.innerHTML = '<p style="color:red">Lỗi tải chương</p>';
                }
            });
        });
    }

    /**
     * Hiển thị danh sách chương
     * @param {Array} chapters
     * @param {HTMLElement} container
     * @param {string} courseId
     */
    function renderChapterList(chapters, container, courseId) {
        if (!chapters.length) {
            container.innerHTML = '<p>Không có chương nào.</p>';
            return;
        }
        container.innerHTML = '<ul class="chapter-list">' +
            chapters.map(chap => `
                <li data-id="${chap.id_chapter}" class="chapter-item">
                    <div class="chapter-item-header">
                        <span class="chapter-name clickable">${chap.name_chapter}</span>
                        <button class="edit-chapter-btn">Sửa</button>
                    </div>
                    <div class="lesson-list-container"></div>
                </li>
            `).join('') + '</ul>';
        addChapterEditHandlers(container, courseId);
        addChapterClickHandlers(container, courseId);
    }

    /**
     * Thêm sự kiện sửa tên chương
     * @param {HTMLElement} container
     * @param {string} courseId
     */
    function addChapterEditHandlers(container, courseId) {
        const editBtns = container.querySelectorAll('.edit-chapter-btn');
        editBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const li = this.closest('li');
                const nameSpan = li.querySelector('.chapter-name');
                const oldName = nameSpan.textContent;
                nameSpan.innerHTML = `<input type="text" value="${oldName}" class="edit-input">`;
                this.style.display = 'none';
                const doneBtn = document.createElement('button');
                doneBtn.textContent = 'Xong';
                doneBtn.className = 'done-btn';
                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = 'Huỷ';
                cancelBtn.className = 'cancel-btn';
                nameSpan.after(doneBtn, cancelBtn);
                doneBtn.addEventListener('click', async function() {
                    const newName = nameSpan.querySelector('input').value.trim();
                    if (!newName) { alert('Tên chương không được để trống!'); return; }
                    try {
                        const chapterId = li.getAttribute('data-id');
                        const res = await fetch(`/admin/courses/${courseId}/chapters/${chapterId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: newName })
                        });
                        const result = await res.json();
                        if (result.success) {
                            nameSpan.textContent = newName;
                            btn.style.display = '';
                            doneBtn.remove();
                            cancelBtn.remove();
                        } else {
                            alert(result.message || 'Cập nhật thất bại!');
                        }
                    } catch {
                        alert('Lỗi khi cập nhật tên chương!');
                    }
                });
                cancelBtn.addEventListener('click', function() {
                    nameSpan.textContent = oldName;
                    btn.style.display = '';
                    doneBtn.remove();
                    cancelBtn.remove();
                });
            });
        });
    }

    /**
     * Thêm sự kiện click vào chương để xem bài học
     * @param {HTMLElement} container
     * @param {string} courseId
     */
    function addChapterClickHandlers(container, courseId) {
        const chapterNames = container.querySelectorAll('.chapter-item .chapter-name');
        chapterNames.forEach(span => {
            span.addEventListener('click', async function() {
                const li = this.closest('li');
                const chapterId = li.getAttribute('data-id');
                const lessonContainer = li.querySelector('.lesson-list-container');
                if (lessonContainer.innerHTML) {
                    lessonContainer.innerHTML = '';
                    return;
                }
                lessonContainer.innerHTML = '<p>Đang tải bài học...</p>';
                try {
                    const res = await fetch(`/admin/courses/${courseId}/chapters/${chapterId}/lessons`);
                    const data = await res.json();
                    if (!data.success) throw new Error();
                    renderLessonList(data.lessons, lessonContainer, courseId, chapterId);
                } catch {
                    lessonContainer.innerHTML = '<p style="color:red">Lỗi tải bài học</p>';
                }
            });
        });
    }

    function renderLessonList(lessons, container, courseId, chapterId) {
        if (!lessons.length) {
            container.innerHTML = '<p>Không có bài học nào.</p>';
            return;
        }
        container.innerHTML = '<ul class="lesson-list">' +
            lessons.map(lesson => `
                <li data-id="${lesson.id_lesson}" class="lesson-item">
                    <span class="lesson-name">${lesson.name_lesson}</span>
                    <button class="edit-lesson-btn">Sửa</button>
                </li>
            `).join('') + '</ul>';
        addLessonEditHandlers(container, courseId, chapterId);
    }

    function addLessonEditHandlers(container, courseId, chapterId) {
        const editBtns = container.querySelectorAll('.edit-lesson-btn');
        editBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const li = this.closest('li');
                const nameSpan = li.querySelector('.lesson-name');
                const oldName = nameSpan.textContent;
                nameSpan.innerHTML = `<input type="text" value="${oldName}" class="edit-input">`;
                this.style.display = 'none';
                const doneBtn = document.createElement('button');
                doneBtn.textContent = 'Xong';
                doneBtn.className = 'done-btn';
                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = 'Huỷ';
                cancelBtn.className = 'cancel-btn';
                nameSpan.after(doneBtn, cancelBtn);
                doneBtn.addEventListener('click', async function() {
                    const newName = nameSpan.querySelector('input').value.trim();
                    if (!newName) { alert('Tên bài học không được để trống!'); return; }
                    try {
                        const lessonId = li.getAttribute('data-id');
                        const res = await fetch(`/admin/courses/${courseId}/chapters/${chapterId}/lessons/${lessonId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: newName })
                        });
                        const result = await res.json();
                        if (result.success) {
                            nameSpan.textContent = newName;
                            btn.style.display = '';
                            doneBtn.remove();
                            cancelBtn.remove();
                        } else {
                            alert(result.message || 'Cập nhật thất bại!');
                        }
                    } catch {
                        alert('Lỗi khi cập nhật tên bài học!');
                    }
                });
                cancelBtn.addEventListener('click', function() {
                    nameSpan.textContent = oldName;
                    btn.style.display = '';
                    doneBtn.remove();
                    cancelBtn.remove();
                });
            });
        });
    }

    // === Quản lý câu hỏi ===
    const selectCourse = document.getElementById('select-course');
    const selectChapter = document.getElementById('select-chapter');
    const selectLesson = document.getElementById('select-lesson');
    const questionListContainer = document.getElementById('question-list-container');

    async function loadCoursesForSelect() {
        try {
            const res = await fetch('/admin/courses');
            const data = await res.json();
            if (!data.success) throw new Error();
            selectCourse.innerHTML = '<option value="">Chọn khoá học</option>' +
                data.courses.map(c => `<option value="${c.id_course}">${c.name_course}</option>`).join('');
            selectChapter.innerHTML = '<option value="">Chọn chương</option>';
            selectLesson.innerHTML = '<option value="">Chọn bài học</option>';
            questionListContainer.innerHTML = '';
        } catch {
            selectCourse.innerHTML = '<option value="">Lỗi tải khoá học</option>';
        }
    }

    selectCourse.addEventListener('change', async function() {
        const courseId = this.value;
        if (!courseId) {
            selectChapter.innerHTML = '<option value="">Chọn chương</option>';
            selectLesson.innerHTML = '<option value="">Chọn bài học</option>';
            questionListContainer.innerHTML = '';
            return;
        }
        try {
            const res = await fetch(`/admin/courses/${courseId}/chapters`);
            const data = await res.json();
            if (!data.success) throw new Error();
            selectChapter.innerHTML = '<option value="">Chọn chương</option>' +
                data.chapters.map(ch => `<option value="${ch.id_chapter}">${ch.name_chapter}</option>`).join('');
            selectLesson.innerHTML = '<option value="">Chọn bài học</option>';
            questionListContainer.innerHTML = '';
        } catch {
            selectChapter.innerHTML = '<option value="">Lỗi tải chương</option>';
        }
    });
 
    selectChapter.addEventListener('change', async function() {
        const courseId = selectCourse.value;
        const chapterId = this.value;
        if (!chapterId) {
            selectLesson.innerHTML = '<option value="">Chọn bài học</option>';
            questionListContainer.innerHTML = '';
            return;
        }
        try {
            const res = await fetch(`/admin/courses/${courseId}/chapters/${chapterId}/lessons`);
            const data = await res.json();
            if (!data.success) throw new Error();
            selectLesson.innerHTML = '<option value="">Chọn bài học</option>' +
                data.lessons.map(ls => `<option value="${ls.id_lesson}">${ls.name_lesson}</option>`).join('');
            questionListContainer.innerHTML = '';
        } catch {
            selectLesson.innerHTML = '<option value="">Lỗi tải bài học</option>';
        }
    });

    selectLesson.addEventListener('change', async function() {
        const courseId = selectCourse.value;
        const chapterId = selectChapter.value;
        const lessonId = this.value;
        if (!lessonId) {
            questionListContainer.innerHTML = '';
            return;
        }
        try {
            const res = await fetch(`/admin/courses/${courseId}/chapters/${chapterId}/lessons/${lessonId}/questions`);
            const data = await res.json();
            if (!data.success) throw new Error();
            renderQuestionList(data.questions);
        } catch {
            questionListContainer.innerHTML = '<p style="color:red">Lỗi tải câu hỏi</p>';
        }
    });

    if (selectCourse) loadCoursesForSelect();

    function renderQuestionList(questions) {
        if (!questions.length) {
            questionListContainer.innerHTML = '<p>Không có câu hỏi nào.</p>';
        } else {
            questionListContainer.innerHTML = '<ul class="question-list">' +
                questions.map(q => `
                    <li data-id="${q.id_quizz}" class="question-item">
                        <div class="question-content">
                            <span class="question-text">${q.question}</span>
                            <button class="edit-question-btn">Sửa</button>
                        </div>
                        <ul class="answer-list">
                            ${q.answers.map(ans => `
                                <li data-id="${ans.id_answer}" class="answer-item">
                                    <span class="answer-text">${ans.content}</span>
                                    <button class="edit-answer-btn">Sửa</button>
                                    <input type="${q.type === 'checkbox' ? 'checkbox' : 'radio'}" name="correct-${q.id_quizz}" class="correct-radio" ${ans.istrue ? 'checked' : ''}>
                                    <span class="correct-label">${ans.istrue ? 'Đáp án đúng' : ''}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </li>
                `).join('') + '</ul>';
        }
        const addBtn = document.createElement('button');
        addBtn.textContent = 'Thêm câu hỏi';
        addBtn.className = 'done-btn';
        addBtn.style.marginTop = '18px';
        questionListContainer.appendChild(addBtn);
        addBtn.addEventListener('click', showAddQuestionForm);
        addQuestionEditHandlers();
        addAnswerEditHandlers();
        addCorrectRadioHandlers();
    }

    function showAddQuestionForm() {
        const oldForm = document.getElementById('add-question-form');
        if (oldForm) oldForm.remove();
        const form = document.createElement('form');
        form.id = 'add-question-form';
        form.innerHTML = `
            <div style="margin: 18px 0; padding: 18px; background: #f6faff; border-radius: 8px; border: 1.5px solid #d0e3f1;">
                <label><b>Nội dung câu hỏi:</b><br><input type="text" id="new-question-content" class="edit-input" style="width:90%"></label><br><br>
                <label><b>Thể loại:</b>
                    <select id="new-question-type" class="edit-input">
                        <option value="radio">Một đáp án đúng (radio)</option>
                        <option value="checkbox">Nhiều đáp án đúng (checkbox)</option>
                        <option value="text">Tự luận (text)</option>
                    </select>
                </label><br><br>
                <div id="new-answers-area">
                    <b>Đáp án:</b><br>
                    <div class="new-answer-row">
                        <input type="text" class="edit-input new-answer-content" placeholder="Nội dung đáp án">
                        <input type="checkbox" class="new-answer-correct"> Đúng
                        <button type="button" class="remove-answer-btn cancel-btn">X</button>
                    </div>
                    <div class="new-answer-row">
                        <input type="text" class="edit-input new-answer-content" placeholder="Nội dung đáp án">
                        <input type="checkbox" class="new-answer-correct"> Đúng
                        <button type="button" class="remove-answer-btn cancel-btn">X</button>
                    </div>
                </div>
                <button type="button" id="add-answer-btn" class="edit-btn" style="margin-top:10px">Thêm đáp án</button>
                <br><br>
                <button type="submit" class="done-btn">Lưu câu hỏi</button>
                <button type="button" id="cancel-add-question" class="cancel-btn">Huỷ</button>
            </div>
        `;
        questionListContainer.appendChild(form);
        const answersArea = form.querySelector('#new-answers-area');
        form.querySelector('#add-answer-btn').onclick = function() {
            const row = document.createElement('div');
            row.className = 'new-answer-row';
            row.innerHTML = `<input type="text" class="edit-input new-answer-content" placeholder="Nội dung đáp án">
                <input type="checkbox" class="new-answer-correct"> Đúng
                <button type="button" class="remove-answer-btn cancel-btn">X</button>`;
            answersArea.appendChild(row);
            row.querySelector('.remove-answer-btn').onclick = function() { row.remove(); };
        };
        answersArea.querySelectorAll('.remove-answer-btn').forEach(btn => {
            btn.onclick = function() { btn.closest('.new-answer-row').remove(); };
        });
        form.querySelector('#new-question-type').onchange = function() {
            const type = this.value;
            const isRadio = type === 'radio';
            const isText = type === 'text';
            answersArea.querySelectorAll('.new-answer-correct').forEach((cb, idx, arr) => {
                cb.type = isRadio ? 'radio' : 'checkbox';
                cb.name = isRadio ? 'new-correct' : '';
                cb.style.display = isText ? 'none' : '';
                cb.nextSibling.textContent = isText ? '' : ' Đúng';
            });
        };
        form.querySelector('#new-question-type').dispatchEvent(new Event('change'));
        form.querySelector('#cancel-add-question').onclick = function() { form.remove(); };
        form.onsubmit = async function(e) {
            e.preventDefault();
            const content = form.querySelector('#new-question-content').value.trim();
            const type = form.querySelector('#new-question-type').value;
            const answerRows = Array.from(form.querySelectorAll('.new-answer-row'));
            let answers = answerRows.map(row => ({
                content: row.querySelector('.new-answer-content').value.trim(),
                istrue: row.querySelector('.new-answer-correct').checked
            }));
            if (!content) return alert('Nội dung câu hỏi không được để trống!');
            if (type === 'text') {
                if (answers.length < 1) return alert('Cần ít nhất 1 đáp án mẫu cho câu hỏi tự luận!');
            } else {
                if (answers.length < 2) return alert('Cần ít nhất 2 đáp án!');
            }
            if (answers.some(a => !a.content)) return alert('Không được để trống nội dung đáp án!');
            if (type === 'radio' && answers.filter(a => a.istrue).length !== 1) return alert('Phải chọn đúng 1 đáp án đúng!');
            if (type === 'checkbox' && answers.filter(a => a.istrue).length < 1) return alert('Phải chọn ít nhất 1 đáp án đúng!');
            if (type === 'text') answers = answers.map(a => ({ ...a, istrue: true }));
            const courseId = selectCourse.value;
            const chapterId = selectChapter.value;
            const lessonId = selectLesson.value;
            try {
                const res = await fetch(`/admin/courses/${courseId}/chapters/${chapterId}/lessons/${lessonId}/questions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content, type, answers })
                });
                const result = await res.json();
                if (result.success) {
                    form.remove();
                    selectLesson.dispatchEvent(new Event('change'));
                } else {
                    alert(result.message || 'Thêm câu hỏi thất bại!');
                }
            } catch {
                alert('Lỗi khi thêm câu hỏi!');
            }
        };
    }

    // Sửa nội dung câu hỏi
    function addQuestionEditHandlers() {
        const editBtns = questionListContainer.querySelectorAll('.edit-question-btn');
        editBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const li = this.closest('li');
                const textSpan = li.querySelector('.question-text');
                const oldText = textSpan.textContent;
                textSpan.innerHTML = `<input type="text" value="${oldText}" class="edit-input">`;
                this.style.display = 'none';
                const doneBtn = document.createElement('button');
                doneBtn.textContent = 'Xong';
                doneBtn.className = 'done-btn';
                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = 'Huỷ';
                cancelBtn.className = 'cancel-btn';
                textSpan.after(doneBtn, cancelBtn);
                doneBtn.addEventListener('click', async function() {
                    const newText = textSpan.querySelector('input').value.trim();
                    if (!newText) { alert('Nội dung câu hỏi không được để trống!'); return; }
                    try {
                        const id = li.getAttribute('data-id');
                        const res = await fetch(`/admin/questions/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content: newText })
                        });
                        const result = await res.json();
                        if (result.success) {
                            textSpan.textContent = newText;
                            btn.style.display = '';
                            doneBtn.remove();
                            cancelBtn.remove();
                        } else {
                            alert(result.message || 'Cập nhật thất bại!');
                        }
                    } catch {
                        alert('Lỗi khi cập nhật câu hỏi!');
                    }
                });
                cancelBtn.addEventListener('click', function() {
                    textSpan.textContent = oldText;
                    btn.style.display = '';
                    doneBtn.remove();
                    cancelBtn.remove();
                });
            });
        });
    }
    // Sửa nội dung đáp án
    function addAnswerEditHandlers() {
        const editBtns = questionListContainer.querySelectorAll('.edit-answer-btn');
        editBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const li = this.closest('li');
                const textSpan = li.querySelector('.answer-text');
                const oldText = textSpan.textContent;
                textSpan.innerHTML = `<input type="text" value="${oldText}" class="edit-input">`;
                this.style.display = 'none';
                const doneBtn = document.createElement('button');
                doneBtn.textContent = 'Xong';
                doneBtn.className = 'done-btn';
                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = 'Huỷ';
                cancelBtn.className = 'cancel-btn';
                textSpan.after(doneBtn, cancelBtn);
                doneBtn.addEventListener('click', async function() {
                    const newText = textSpan.querySelector('input').value.trim();
                    if (!newText) { alert('Nội dung đáp án không được để trống!'); return; }
                    try {
                        const id = li.getAttribute('data-id');
                        const res = await fetch(`/admin/answers/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content: newText })
                        });
                        const result = await res.json();
                        if (result.success) {
                            textSpan.textContent = newText;
                            btn.style.display = '';
                            doneBtn.remove();
                            cancelBtn.remove();
                        } else {
                            alert(result.message || 'Cập nhật thất bại!');
                        }
                    } catch {
                        alert('Lỗi khi cập nhật đáp án!');
                    }
                });
                cancelBtn.addEventListener('click', function() {
                    textSpan.textContent = oldText;
                    btn.style.display = '';
                    doneBtn.remove();
                    cancelBtn.remove();
                });
            });
        });
    }
    // Đổi đáp án đúng
    function addCorrectRadioHandlers() {
        const radios = questionListContainer.querySelectorAll('.correct-radio');
        radios.forEach(radio => {
            radio.addEventListener('change', async function() {
                const answerLi = this.closest('.answer-item');
                const answerId = answerLi.getAttribute('data-id');
                const questionLi = this.closest('.question-item');
                const questionId = questionLi.getAttribute('data-id');
                const questionType = questionLi.querySelector('.answer-list input').type;
                if (questionType === 'radio') {
                    if (!this.checked) return;
                    try {
                        const res = await fetch(`/admin/questions/${questionId}/answers/${answerId}/correct`, {
                            method: 'PUT'
                        });
                        const result = await res.json();
                        if (result.success) {
                            selectLesson.dispatchEvent(new Event('change'));
                        } else {
                            alert(result.message || 'Cập nhật thất bại!');
                        }
                    } catch {
                        alert('Lỗi khi cập nhật đáp án đúng!');
                    }
                } else if (questionType === 'checkbox') {
                    try {
                        const res = await fetch(`/admin/questions/${questionId}/answers/${answerId}/correct`, {
                            method: 'PUT',
                            body: JSON.stringify({ istrue: this.checked }),
                            headers: { 'Content-Type': 'application/json' }
                        });
                        const result = await res.json();
                        if (!result.success) {
                            alert(result.message || 'Cập nhật thất bại!');
                        }
                    } catch {
                        alert('Lỗi khi cập nhật đáp án đúng!');
                    }
                }
            });
        });
    }
}); 
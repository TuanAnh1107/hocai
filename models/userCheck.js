/**
 * Tìm người dùng theo email
 * @param {any} db
 * @param {string} email
 */
async function findUserByEmail(db, email) {
    const [users] = await db.query('SELECT * FROM user_data WHERE email = ?', [email]);
    return users.length > 0 ? users[0] : null;
}

/**
 * Lấy thông tin chi tiết người dùng theo email
 * @param {any} db
 * @param {string} email
 */
async function findUserDetailsByEmail(db, email) {
    const [users] = await db.query(
        'SELECT u.email, u.username, u.account, u.time_create, u.password, u.google_id, u.role, c.roadmap ' +
        'FROM user_data u LEFT JOIN user_course c ON u.email = c.email WHERE u.email = ?',
        [email]
    );
    return users.length > 0 ? users[0] : null;
}

/**
 * Tạo người dùng mới
 * @param {any} db
 * @param {object} userData
 */
async function createUser(db, userData) {
    const { email, account, username, password, time_create, google_id } = userData;
    const [result] = await db.query(
        'INSERT INTO user_data (email, account, username, password, time_create, google_id, role) VALUES (?, ?, ?, ?, ?, ?, "user")',
        [email, account, username, password, time_create, google_id]
    );
    await db.query(
        'INSERT INTO user_course (email, roadmap) VALUES (?, ?)',
        [email, 'cbai0cbaikh0khgm0gm']
    );
    return result.insertId;
}

/**
 * Cập nhật Google ID cho người dùng
 * @param {any} db
 * @param {string} email
 * @param {string} googleId
 */
async function updateUserGoogleId(db, email, googleId) {
    await db.query('UPDATE user_data SET google_id = ? WHERE email = ?', [googleId, email]);
}

/**
 * Cập nhật mật khẩu người dùng theo email
 * @param {any} db
 * @param {string} email
 * @param {string} hashedPassword
 */
async function updateUserPassword(db, email, hashedPassword) {
    await db.query('UPDATE user_data SET password = ? WHERE email = ?', [hashedPassword, email]);
}

/**
 * Tạo token đặt lại mật khẩu
 * @param {any} db
 * @param {{email: string, tokenHash: string, expiresAt: Date|string}} payload
 */
async function createPasswordResetToken(db, { email, tokenHash, expiresAt }) {
    await db.query(
        'INSERT INTO password_reset_tokens (email, token_hash, expires_at) VALUES (?, ?, ?)',
        [email, tokenHash, expiresAt]
    );
}

/**
 * Lấy token đặt lại mật khẩu còn hiệu lực
 * @param {any} db
 * @param {string} tokenHash
 */
async function findValidPasswordResetToken(db, tokenHash) {
    const [rows] = await db.query(
        `SELECT id, email, expires_at, used_at
         FROM password_reset_tokens
         WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
         ORDER BY id DESC
         LIMIT 1`,
        [tokenHash]
    );
    return rows.length > 0 ? rows[0] : null;
}

/**
 * Đánh dấu token đã sử dụng
 * @param {any} db
 * @param {number} id
 */
async function markPasswordResetTokenUsed(db, id) {
    await db.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [id]);
}

/**
 * Xóa toàn bộ token reset của người dùng
 * @param {any} db
 * @param {string} email
 */
async function deletePasswordResetTokensByEmail(db, email) {
    await db.query('DELETE FROM password_reset_tokens WHERE email = ?', [email]);
}

/**
 * Dọn token reset đã hết hạn hoặc đã dùng
 * @param {any} db
 */
async function deleteExpiredPasswordResetTokens(db) {
    await db.query('DELETE FROM password_reset_tokens WHERE expires_at <= NOW() OR used_at IS NOT NULL');
}

/**
 * Tìm người dùng theo account
 * @param {any} db
 * @param {string} account
 */
async function findUserByAccount(db, account) {
    const [users] = await db.query('SELECT * FROM user_data WHERE account = ?', [account]);
    return users.length > 0 ? users[0] : null;
}

/**
 * Lấy roadmap của user
 * @param {any} db
 * @param {string} email
 */
async function getUserRoadmap(db, email) {
    const [rows] = await db.query('SELECT roadmap FROM user_course WHERE email = ?', [email]);
    return rows.length > 0 ? rows[0].roadmap : null;
}

/**
 * Lấy danh sách khoá học và bài học đang học của user
 * @param {any} db
 * @param {string} email
 */
async function getUserCoursesProgress(db, email) {
  
    const [roadmapRows] = await db.query('SELECT roadmap FROM user_course WHERE email = ?', [email]);
    if (!roadmapRows.length) return [];
    const roadmapStr = roadmapRows[0].roadmap;

    const [courses] = await db.query('SELECT id_course, name_course FROM course_list');
    const result = [];
    for (const course of courses) {
        const tag = course.id_course;
        const firstIdx = roadmapStr.indexOf(tag);
        if (firstIdx === -1) continue;
        const secondIdx = roadmapStr.indexOf(tag, firstIdx + tag.length);
        if (secondIdx === -1) continue;
        const courseRoadmap = roadmapStr.substring(firstIdx + tag.length, secondIdx);
        const lessonIndex = parseInt(courseRoadmap);
        if (!lessonIndex || lessonIndex === 0) continue;
        const [lessonRows] = await db.query(
            'SELECT name_lesson FROM lesson_name WHERE id_course = ? ORDER BY id_lesson ASC',
            [tag]
        );
        let lessonName = '';
        if (lessonRows.length >= lessonIndex) {
            lessonName = lessonRows[lessonIndex - 1].name_lesson;
        }
        result.push({
            id_course: tag,
            name_course: course.name_course,
            lesson: lessonName
        });
    }
    return result;
}

/**
 * Cập nhật thông tin người dùng
 * @param {any} db
 * @param {string} oldEmail
 * @param {object} param2
 */
async function updateUserInfo(db, oldEmail, { email, account, username, password }) {
    let result;
    if (password && password.length > 0) {
        result = await db.query(
            'UPDATE user_data SET email = ?, account = ?, username = ?, password = ? WHERE email = ?',
            [email, account, username, password, oldEmail]
        );
    } else {
        result = await db.query(
            'UPDATE user_data SET email = ?, account = ?, username = ? WHERE email = ?',
            [email, account, username, oldEmail]
        );
    }
    console.log('Update user_data result:', result);
    if (oldEmail !== email) {
        const res2 = await db.query('UPDATE user_course SET email = ? WHERE email = ?', [email, oldEmail]);
        console.log('Update user_course result:', res2);
    }
}

module.exports = {
    findUserByEmail,
    findUserDetailsByEmail,
    createUser,
    updateUserGoogleId,
    updateUserPassword,
    createPasswordResetToken,
    findValidPasswordResetToken,
    markPasswordResetTokenUsed,
    deletePasswordResetTokensByEmail,
    deleteExpiredPasswordResetTokens,
    findUserByAccount,
    getUserRoadmap,
    getUserCoursesProgress,
    updateUserInfo,
};

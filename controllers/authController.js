const crypto = require('crypto');
const { google } = require('googleapis');
const bcrypt = require('bcryptjs');
const oauth2Client = require('../config/ggAuth');
const { getAppBaseUrl } = require('../config/appBaseUrl');
const userModel = require('../models/userCheck');

const RESET_TOKEN_TTL_MINUTES = parseInt(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES, 10) || 30;

/**
 * Kiểm tra đăng nhập Google đã được cấu hình hay chưa.
 * @returns {boolean}
 */
function isGoogleAuthEnabled() {
    return Boolean(
        process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        getAppBaseUrl()
    );
}

/**
 * Dùng link local trong môi trường phát triển để test reset password.
 * @returns {boolean}
 */
function shouldShowDevResetLink() {
    if (process.env.SHOW_DEV_RESET_LINK === 'true') {
        return true;
    }
    if (process.env.SHOW_DEV_RESET_LINK === 'false') {
        return false;
    }
    return process.env.NODE_ENV !== 'production';
}

/**
 * Lấy base URL của ứng dụng.
 * @returns {string}
 */
function getBaseUrl() {
    return getAppBaseUrl();
}

/**
 * Render trang đăng nhập/đăng ký/trợ giúp.
 * @param {Response} res
 * @param {object} options
 */
function renderLoginPage(res, options = {}) {
    const {
        isRegistering = false,
        isForgotPassword = false,
        errorMessage,
        successMessage,
        formData = {},
        forgotFormData = {},
        devResetLink = ''
    } = options;

    let title = 'Đăng nhập';
    if (isRegistering) {
        title = 'Đăng ký';
    }
    if (isForgotPassword) {
        title = 'Quên mật khẩu';
    }

    return res.render('login', {
        layout: false,
        title,
        css: 'login',
        js: 'login',
        isRegistering,
        isForgotPassword,
        googleLoginEnabled: isGoogleAuthEnabled(),
        errorMessage,
        successMessage,
        formData,
        forgotFormData,
        devResetLink
    });
}

/**
 * Render trang đặt lại mật khẩu.
 * @param {Response} res
 * @param {object} options
 */
function renderResetPasswordPage(res, options = {}) {
    const {
        errorMessage,
        successMessage,
        token = ''
    } = options;

    return res.render('reset-password', {
        title: 'Đặt lại mật khẩu',
        css: 'login',
        errorMessage,
        successMessage,
        token
    });
}

/**
 * Tìm người dùng theo email hoặc tài khoản.
 * @param {any} db
 * @param {string} accountOrEmail
 */
async function findUserByIdentity(db, accountOrEmail) {
    const identity = (accountOrEmail || '').trim();
    if (!identity) {
        return null;
    }

    if (identity.includes('@')) {
        return userModel.findUserDetailsByEmail(db, identity);
    }

    return userModel.findUserByAccount(db, identity);
}

/**
 * Kiểm tra độ mạnh của mật khẩu.
 * @param {string} password
 * @returns {string|null}
 */
function validatePasswordStrength(password) {
    if (!password || password.length < 6) {
        return 'Mật khẩu phải có ít nhất 6 ký tự.';
    }

    if (!/[A-Z]/.test(password)) {
        return 'Mật khẩu phải chứa ít nhất 1 ký tự viết hoa.';
    }

    if (!/[0-9]/.test(password)) {
        return 'Mật khẩu phải chứa ít nhất 1 số.';
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.';
    }

    return null;
}

/**
 * Tạo hash cho token reset mật khẩu.
 * @param {string} token
 * @returns {string}
 */
function hashResetToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Hiển thị trang đăng nhập/đăng ký.
 * @param {Request} req
 * @param {Response} res
 */
const showLogin = (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect('/');
    }

    return renderLoginPage(res, {
        isRegistering: req.query.action === 'register'
    });
};

/**
 * Xử lý đăng ký.
 * @param {Request} req
 * @param {Response} res
 */
const register = async (req, res) => {
    const { email, account, displayName, password, confirmPassword, agreeTerms } = req.body;
    const db = req.db;
    const formData = { email, account, displayName };

    if (!email || !account || !displayName || !password || !confirmPassword) {
        return renderLoginPage(res, {
            isRegistering: true,
            errorMessage: 'Vui lòng điền đầy đủ các trường bắt buộc.',
            formData
        });
    }

    if (password !== confirmPassword) {
        return renderLoginPage(res, {
            isRegistering: true,
            errorMessage: 'Mật khẩu và xác nhận mật khẩu không khớp.',
            formData
        });
    }

    if (!agreeTerms) {
        return renderLoginPage(res, {
            isRegistering: true,
            errorMessage: 'Bạn phải đồng ý với chính sách bảo mật.',
            formData
        });
    }

    try {
        const existingUser = await userModel.findUserByEmail(db, email);
        if (existingUser) {
            return renderLoginPage(res, {
                isRegistering: true,
                errorMessage: 'Email này đã được sử dụng để đăng ký.',
                formData
            });
        }

        const existingAccount = await userModel.findUserByAccount(db, account);
        if (existingAccount) {
            return renderLoginPage(res, {
                isRegistering: true,
                errorMessage: 'Tài khoản này đã tồn tại. Vui lòng chọn tài khoản khác.',
                formData
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const currentDate = new Date().toISOString().slice(0, 10);
        const newUser = {
            email,
            account,
            username: displayName,
            password: hashedPassword,
            time_create: currentDate,
            google_id: null,
            role: 'user'
        };

        await userModel.createUser(db, newUser);
        req.session.user = {
            userId: newUser.email,
            username: newUser.username
        };

        req.session.save((err) => {
            if (err) {
                console.error('Lỗi khi lưu session sau khi đăng ký:', err);
                return res.redirect('/login?registration_error=session_save');
            }

            return res.redirect('/');
        });
    } catch (error) {
        console.error('Lỗi trong quá trình đăng ký:', error);
        return renderLoginPage(res, {
            isRegistering: true,
            errorMessage: 'Đã xảy ra lỗi trong quá trình đăng ký. Vui lòng thử lại.',
            formData
        });
    }
};

/**
 * Xử lý đăng nhập.
 * @param {Request} req
 * @param {Response} res
 */
const login = async (req, res) => {
    const { email, password } = req.body;
    const db = req.db;
    const formData = { email };

    if (!email || !password) {
        return renderLoginPage(res, {
            errorMessage: 'Vui lòng nhập email/tài khoản và mật khẩu.',
            formData
        });
    }

    try {
        const userfind = await findUserByIdentity(db, email);

        if (!userfind) {
            return renderLoginPage(res, {
                errorMessage: 'Email/tài khoản hoặc mật khẩu không chính xác.',
                formData
            });
        }

        const match = await bcrypt.compare(password, userfind.password);
        if (!match) {
            return renderLoginPage(res, {
                errorMessage: 'Email/tài khoản hoặc mật khẩu không chính xác.',
                formData
            });
        }

        req.session.user = {
            userId: userfind.email,
            username: userfind.username,
            role: userfind.role
        };

        const roadmap = await userModel.getUserRoadmap(db, userfind.email);
        if (roadmap) {
            req.session.roadmap = roadmap;
        }

        req.session.save((err) => {
            if (err) {
                console.error('Lỗi khi lưu session:', err);
                return res.redirect('/login?error=session_save_error');
            }

            if (userfind.role === 'user') {
                return res.redirect('/');
            }

            return res.redirect('/admin');
        });
    } catch (error) {
        console.error('Lỗi trong quá trình đăng nhập:', error);
        return renderLoginPage(res, {
            errorMessage: 'Đã xảy ra lỗi trong quá trình đăng nhập. Vui lòng thử lại.',
            formData
        });
    }
};

/**
 * Yêu cầu đặt lại mật khẩu bằng token.
 * @param {Request} req
 * @param {Response} res
 */
const forgotPassword = async (req, res) => {
    const db = req.db;
    const accountOrEmail = (req.body.accountOrEmail || '').trim();
    const forgotFormData = { accountOrEmail };

    if (!accountOrEmail) {
        return renderLoginPage(res, {
            isForgotPassword: true,
            errorMessage: 'Vui lòng nhập email hoặc tài khoản đã đăng ký.',
            forgotFormData
        });
    }

    try {
        await userModel.deleteExpiredPasswordResetTokens(db);
        const user = await findUserByIdentity(db, accountOrEmail);
        let devResetLink = '';

        if (user && user.email) {
            const rawToken = crypto.randomBytes(32).toString('hex');
            const tokenHash = hashResetToken(rawToken);
            const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

            await userModel.deletePasswordResetTokensByEmail(db, user.email);
            await userModel.createPasswordResetToken(db, {
                email: user.email,
                tokenHash,
                expiresAt
            });

            if (shouldShowDevResetLink()) {
                devResetLink = `${getBaseUrl()}/reset-password?token=${rawToken}`;
                console.log(`[Password Reset][DEV] ${user.email}: ${devResetLink}`);
            }
        }

        return renderLoginPage(res, {
            isForgotPassword: true,
            successMessage: 'Nếu tài khoản tồn tại, chúng tôi đã tạo yêu cầu đặt lại mật khẩu. Hãy kiểm tra email hoặc dùng link dev bên dưới.',
            forgotFormData,
            devResetLink
        });
    } catch (error) {
        console.error('Lỗi trong quá trình tạo yêu cầu đặt lại mật khẩu:', error);
        return renderLoginPage(res, {
            isForgotPassword: true,
            errorMessage: 'Đã xảy ra lỗi trong quá trình xử lý. Vui lòng thử lại.',
            forgotFormData
        });
    }
};

/**
 * Hiển thị trang nhập mật khẩu mới từ token.
 * @param {Request} req
 * @param {Response} res
 */
const showResetPasswordPage = async (req, res) => {
    const token = (req.query.token || '').trim();

    if (!token) {
        return renderResetPasswordPage(res, {
            errorMessage: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã thiếu token.'
        });
    }

    try {
        await userModel.deleteExpiredPasswordResetTokens(req.db);
        const tokenHash = hashResetToken(token);
        const resetRecord = await userModel.findValidPasswordResetToken(req.db, tokenHash);

        if (!resetRecord) {
            return renderResetPasswordPage(res, {
                errorMessage: 'Liên kết đặt lại mật khẩu không còn hiệu lực hoặc đã được sử dụng.'
            });
        }

        return renderResetPasswordPage(res, { token });
    } catch (error) {
        console.error('Lỗi khi mở trang đặt lại mật khẩu:', error);
        return renderResetPasswordPage(res, {
            errorMessage: 'Không thể mở trang đặt lại mật khẩu lúc này. Vui lòng thử lại.'
        });
    }
};

/**
 * Đặt lại mật khẩu bằng token.
 * @param {Request} req
 * @param {Response} res
 */
const resetPassword = async (req, res) => {
    const token = (req.body.token || '').trim();
    const newPassword = req.body.newPassword || '';
    const confirmNewPassword = req.body.confirmNewPassword || '';

    if (!token) {
        return renderResetPasswordPage(res, {
            errorMessage: 'Thiếu token đặt lại mật khẩu.'
        });
    }

    if (!newPassword || !confirmNewPassword) {
        return renderResetPasswordPage(res, {
            token,
            errorMessage: 'Vui lòng nhập đầy đủ mật khẩu mới và xác nhận mật khẩu.'
        });
    }

    if (newPassword !== confirmNewPassword) {
        return renderResetPasswordPage(res, {
            token,
            errorMessage: 'Mật khẩu mới và xác nhận mật khẩu không khớp.'
        });
    }

    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
        return renderResetPasswordPage(res, {
            token,
            errorMessage: passwordError
        });
    }

    try {
        await userModel.deleteExpiredPasswordResetTokens(req.db);
        const tokenHash = hashResetToken(token);
        const resetRecord = await userModel.findValidPasswordResetToken(req.db, tokenHash);

        if (!resetRecord) {
            return renderResetPasswordPage(res, {
                errorMessage: 'Liên kết đặt lại mật khẩu không còn hiệu lực hoặc đã được sử dụng.'
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await userModel.updateUserPassword(req.db, resetRecord.email, hashedPassword);
        await userModel.markPasswordResetTokenUsed(req.db, resetRecord.id);
        await userModel.deletePasswordResetTokensByEmail(req.db, resetRecord.email);

        return renderLoginPage(res, {
            successMessage: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.'
        });
    } catch (error) {
        console.error('Lỗi trong quá trình đặt lại mật khẩu:', error);
        return renderResetPasswordPage(res, {
            token,
            errorMessage: 'Không thể đặt lại mật khẩu lúc này. Vui lòng thử lại.'
        });
    }
};

/**
 * Chuyển hướng xác thực Google OAuth.
 * @param {Request} req
 * @param {Response} res
 */
const googleAuth = (req, res) => {
    if (!isGoogleAuthEnabled()) {
        return renderLoginPage(res, {
            errorMessage: 'Đăng nhập Google chưa được cấu hình trên môi trường hiện tại.'
        });
    }

    const scope = [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope,
        prompt: 'consent'
    });

    return res.redirect(authUrl);
};

/**
 * Xử lý callback từ Google OAuth.
 * @param {Request} req
 * @param {Response} res
 */
const googleCallback = async (req, res) => {
    if (!isGoogleAuthEnabled()) {
        return renderLoginPage(res, {
            errorMessage: 'Đăng nhập Google chưa được cấu hình trên môi trường hiện tại.'
        });
    }

    const code = req.query.code;
    const db = req.db;

    if (!code) {
        console.error('Không nhận được mã code từ Google.');
        return res.redirect('/login?error=google_auth_failed_no_code');
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const people = google.people({ version: 'v1', auth: oauth2Client });
        const profileInfo = await people.people.get({
            resourceName: 'people/me',
            personFields: 'names,emailAddresses,metadata'
        });

        const emailFromGoogle = profileInfo.data.emailAddresses && profileInfo.data.emailAddresses.length > 0
            ? profileInfo.data.emailAddresses[0].value
            : null;
        const nameFromGoogle = profileInfo.data.names && profileInfo.data.names.length > 0
            ? profileInfo.data.names[0].displayName
            : 'Người dùng HocAI';
        const googleId = profileInfo.data.metadata && profileInfo.data.metadata.sources && profileInfo.data.metadata.sources.length > 0
            ? profileInfo.data.metadata.sources.find((source) => source.type === 'PROFILE')?.id || profileInfo.data.metadata.sources[0].id
            : null;

        let userRecordForSession;
        const existingUser = await userModel.findUserDetailsByEmail(db, emailFromGoogle);

        if (existingUser) {
            userRecordForSession = {
                email: existingUser.email,
                username: existingUser.username,
                role: existingUser.role
            };

            if (googleId && !existingUser.google_id) {
                await userModel.updateUserGoogleId(db, emailFromGoogle, googleId);
            }
        } else {
            const randomPassword = generateRandomPassword();
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            const currentDate = new Date().toISOString().slice(0, 10);
            const newUser = {
                email: emailFromGoogle,
                account: null,
                username: nameFromGoogle,
                password: hashedPassword,
                time_create: currentDate,
                google_id: googleId,
                role: 'user'
            };

            await userModel.createUser(db, newUser);
            userRecordForSession = {
                email: emailFromGoogle,
                username: nameFromGoogle,
                account: null,
                role: 'user'
            };
        }

        req.session.user = {
            userId: userRecordForSession.email,
            username: userRecordForSession.username,
            role: userRecordForSession.role
        };

        const roadmap = await userModel.getUserRoadmap(db, userRecordForSession.email);
        if (roadmap) {
            req.session.roadmap = roadmap;
        }

        req.session.save((err) => {
            if (err) {
                console.error('Lỗi khi lưu session:', err);
                return res.redirect('/login?error=session_save_error');
            }

            if (userRecordForSession.role === 'user') {
                return res.redirect('/');
            }

            return res.redirect('/admin');
        });
    } catch (error) {
        console.error('Lỗi trong Google OAuth callback:', error.message);
        if (error.response && error.response.data) {
            console.error('Chi tiết lỗi từ Google:', error.response.data);
        }
        return res.redirect('/login?error=google_auth_failed');
    }
};

/**
 * Lấy thông tin người dùng hiện tại.
 * @param {Request} req
 * @param {Response} res
 */
const getCurrentUser = async (req, res) => {
    if (req.session && req.session.user && req.session.user.userId) {
        try {
            const user = await userModel.findUserDetailsByEmail(req.db, req.session.user.userId);
            if (user) {
                return res.json({
                    username: user.username,
                    email: user.email,
                    account: user.account,
                    role: user.role,
                    time_create: user.time_create.toLocaleString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    }),
                    roadmap: user.roadmap
                });
            }

            req.session.destroy();
            return res.status(401).json({ message: 'Người dùng không hợp lệ' });
        } catch (dbError) {
            console.error('Lỗi lấy user từ DB cho session:', dbError);
            return res.status(500).json({ message: 'Lỗi máy chủ' });
        }
    }

    return res.status(401).json({ message: 'Chưa đăng nhập' });
};

/**
 * Đăng xuất người dùng.
 * @param {Request} req
 * @param {Response} res
 */
const logout = (req, res) => {
    if (req.session) {
        return req.session.destroy((err) => {
            if (err) {
                console.error('Lỗi khi hủy session:', err);
                if (!res.headersSent) {
                    return res.status(500).send('Không thể đăng xuất, vui lòng thử lại.');
                }
                return;
            }

            res.clearCookie(process.env.SESSION_COOKIE_NAME || 'connect.sid');
            return res.redirect('/');
        });
    }

    return res.redirect('/');
};

/**
 * Lấy danh sách khóa học của người dùng.
 * @param {Request} req
 * @param {Response} res
 */
const getUserCourses = async (req, res) => {
    if (!req.session || !req.session.user || !req.session.user.userId) {
        return res.status(401).json({ message: 'Chưa đăng nhập' });
    }

    try {
        const courses = await userModel.getUserCoursesProgress(req.db, req.session.user.userId);
        return res.json({ courses });
    } catch (err) {
        console.error('Lỗi lấy danh sách khóa học:', err);
        return res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

/**
 * Cập nhật thông tin người dùng.
 * @param {Request} req
 * @param {Response} res
 */
const handleUpdateUserInfo = async (req, res) => {
    const db = req.db;

    try {
        if (!req.session || !req.session.user) {
            return res.status(401).send('Chưa đăng nhập');
        }

        const oldEmail = req.session.user.userId;
        const { email, account, username, password } = req.body;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const accountRegex = /^[a-zA-Z0-9_]+$/;

        if (!email || !account || !username) {
            return res.status(400).send('Thiếu thông tin');
        }

        if (!emailRegex.test(email)) {
            return res.status(400).send('Email không hợp lệ');
        }

        if (!accountRegex.test(account)) {
            return res.status(400).send('Tài khoản chỉ được chứa chữ, số, dấu gạch dưới');
        }

        if (username.trim().length === 0) {
            return res.status(400).send('Tên người dùng không được để trống');
        }

        let hashedPassword = password;
        if (password && password.length > 0) {
            const passwordError = validatePasswordStrength(password);
            if (passwordError) {
                return res.status(400).send(passwordError);
            }

            hashedPassword = await bcrypt.hash(password, 10);
        }

        await userModel.updateUserInfo(db, oldEmail, {
            email,
            account,
            username,
            password: hashedPassword
        });

        if (oldEmail !== email) {
            req.session.user.userId = email;
        }
        req.session.user.account = account;
        req.session.user.username = username;

        return res.json({ success: true });
    } catch (err) {
        console.error('Lỗi cập nhật user:', err);
        return res.status(500).send('Lỗi server');
    }
};

/**
 * Tạo mật khẩu ngẫu nhiên.
 * @returns {string}
 */
function generateRandomPassword() {
    const numbers = '0123456789';
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';

    for (let i = 0; i < 6; i += 1) {
        password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    for (let i = 0; i < 5; i += 1) {
        password += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
    return password.split('').sort(() => 0.5 - Math.random()).join('');
}

module.exports = {
    showLogin,
    register,
    login,
    forgotPassword,
    showResetPasswordPage,
    resetPassword,
    googleAuth,
    googleCallback,
    getCurrentUser,
    logout,
    getUserCourses,
    handleUpdateUserInfo,
    generateRandomPassword
};

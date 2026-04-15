const fs = require('fs');
const path = require('path');

const feedbackLogPath = path.join(__dirname, '..', 'logs', 'feedback.log');

/**
 * Render trang phản hồi.
 * @param {Response} res
 * @param {object} options
 */
function renderFeedbackPage(res, options = {}) {
    const {
        errorMessage,
        successMessage,
        formData = {}
    } = options;

    return res.render('feedback', {
        title: 'Phản hồi hocAI',
        css: 'feedback',
        errorMessage,
        successMessage,
        formData
    });
}

/**
 * Hiển thị trang phản hồi.
 * @param {Request} req
 * @param {Response} res
 */
async function showFeedbackPage(req, res) {
    const formData = {
        name: '',
        email: req.session?.user?.userId || '',
        message: ''
    };

    return renderFeedbackPage(res, { formData });
}

/**
 * Lưu phản hồi vào file log local.
 * @param {Request} req
 * @param {Response} res
 */
async function submitFeedback(req, res) {
    const formData = {
        name: (req.body.name || '').trim(),
        email: (req.body.email || '').trim(),
        message: (req.body.message || '').trim()
    };

    if (!formData.name || !formData.email || !formData.message) {
        return renderFeedbackPage(res, {
            errorMessage: 'Vui lòng điền đầy đủ họ tên, email và nội dung phản hồi.',
            formData
        });
    }

    try {
        await fs.promises.mkdir(path.dirname(feedbackLogPath), { recursive: true });
        const entry = {
            createdAt: new Date().toISOString(),
            name: formData.name,
            email: formData.email,
            message: formData.message,
            userId: req.session?.user?.userId || null,
            ip: req.ip,
            userAgent: req.headers['user-agent'] || ''
        };

        await fs.promises.appendFile(
            feedbackLogPath,
            `${JSON.stringify(entry)}\n`,
            'utf8'
        );

        return renderFeedbackPage(res, {
            successMessage: 'Cảm ơn bạn đã gửi phản hồi. Chúng tôi đã ghi nhận nội dung của bạn.',
            formData: {
                name: '',
                email: req.session?.user?.userId || formData.email,
                message: ''
            }
        });
    } catch (error) {
        console.error('Lỗi khi lưu phản hồi:', error);
        return renderFeedbackPage(res, {
            errorMessage: 'Không thể gửi phản hồi lúc này. Vui lòng thử lại sau.',
            formData
        });
    }
}

module.exports = {
    showFeedbackPage,
    submitFeedback
};

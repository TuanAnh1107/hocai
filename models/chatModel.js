const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

// Dữ liệu mẫu cho các câu hỏi và câu trả lời
const sampleData = [
    {
        question: "làm thế nào để đăng ký tài khoản",
        answer: "Để đăng ký tài khoản, bạn cần truy cập vào trang chủ và nhấn vào nút 'Đăng ký'. Sau đó điền đầy đủ thông tin theo yêu cầu."
    },
    {
        question: "quên tài khoản phải làm sao",
        answer: "Bạn có thể sử dụng email hoặc tài khoản mà bạn đã đăng ký để truy cập, trường hợp bạn quên cả 2 hãy gửi phản hồi cho chúng tôi (phần PHẢN HỒI ở cuối trang) để chúng tôi hỗ trợ."
    },
    {
        question: "quên mật khẩu phải làm sao",
        answer: "Nếu bạn quên mật khẩu, hãy nhấn vào nút 'Quên mật khẩu' trên trang đăng nhập. Hệ thống sẽ gửi link đặt lại mật khẩu qua email của bạn."
    },
    {
        question: "miễn phí",
        answer: "Các khoá học của chúng tôi hiện tại đều miễn phí. Các khoá học cao cấp sẽ được cập nhật sau."
    },
    {
        question: "học có mất tiền không",
        answer: "Các khoá học của chúng tôi hiện tại đều miễn phí. Các khoá học cao cấp sẽ được cập nhật sau."
    },
    {
        question: "bao nhiêu khoá học",
        answer: "Hiện tại chúng tôi cung cấp 3 khoá học ( Chat với AI, Kahoot, Gamma AI ). Các khoá học mới sẽ liên tục được bổ sung trong thời gian sớm nhất."
    },
    {
        question: "không đăng nhập",
        answer: "Nếu bạn không đăng nhập, hocAI vẫn sẽ cung cấp cho bạn các khoá học miễn phí nhưng tiến độ học tập sẽ không được lưu ( bạn phải học lại mỗi lần tải lại trang )"
    }
];

/**
 * Tính độ tương đồng 
 * @param {string} text1
 * @param {string} text2
 * @returns {number}
 */
function calculateSimilarity(text1, text2) {
    const tfidf = new TfIdf();
    tfidf.addDocument(text1);
    tfidf.addDocument(text2);
    
    let similarity = 0;
    const tokens1 = tokenizer.tokenize(text1);
    const tokens2 = tokenizer.tokenize(text2);
    
    tokens1.forEach(token => {
        if (tokens2.includes(token)) {
            similarity += 1;
        }
    });
    
    return similarity / Math.max(tokens1.length, tokens2.length);
}

/**
 * Tìm câu trả lời phù hợp nhất với câu hỏi của người dùng
 * @param {string} userQuestion
 * @returns {{similarity: number, answer: string|null}}
 */
function findBestAnswer(userQuestion) {
    let bestMatch = {
        similarity: 0,
        answer: null
    };

    sampleData.forEach(item => {
        const similarity = calculateSimilarity(userQuestion.toLowerCase(), item.question.toLowerCase());
        if (similarity > bestMatch.similarity) {
            bestMatch = {
                similarity: similarity,
                answer: item.answer
            };
        }
    });

    return bestMatch;
}

module.exports = {
    /**
     * Bot trả lời
     * @param {string} userMessage
     * @returns {{type: string, content: string}}
     */
    processMessage: function(userMessage) {
        const result = findBestAnswer(userMessage);
        
        if (result.similarity >= 0.3) {
            return {
                type: 'answer',
                content: result.answer
            };
        } else {
            return {
                type: 'fallback',
                content: 'Không thể cung cấp câu trả lời. Sử dụng thanh tìm kiếm để tìm kiếm thông tin hoặc gửi phản hồi <a href="/feedback">tại đây</a>'
            };
        }
    }
}; 
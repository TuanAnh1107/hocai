/**
 * Xử lý hiệu ứng scroll, cuộn lên đầu trang, chat popup, animation chuyển trang
 */
window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
        document.body.classList.remove('page-exiting-left');
        document.documentElement.style.overflowX = '';
        document.body.style.overflowX = '';
    }
});
const scrollElements = document.querySelectorAll('.scroll');

if (scrollElements.length > 0) {
    const scrollOptions = {
        root: null, 
        rootMargin: '0px', 
        threshold: 0.1 
    };

    /**
     * Thêm class visible cho các phần tử scroll khi xuất hiện trên màn hình
     * @param {IntersectionObserverEntry[]} entries
     * @param {IntersectionObserver} observer
     */
    const scrollCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    };
    const scrollObserver = new IntersectionObserver(scrollCallback, scrollOptions);
    scrollElements.forEach(el => {
        scrollObserver.observe(el);
    });
}
document.addEventListener('DOMContentLoaded', function () {
    const scrollToTopButton = document.querySelector('.scroll-to-top');
    const scrollscreen = 150;
    /**
     * Hiển thị hoặc ẩn nút scroll-to-top
     */
    function toggleScrollToTopButton() {
        
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

        if (currentScroll > scrollscreen) {
            scrollToTopButton.classList.add('show');
        } else {
            scrollToTopButton.classList.remove('show');
        }
    }

    /**
     * Cuộn lên đầu trang
     */
    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    window.addEventListener('scroll', toggleScrollToTopButton);

    if (scrollToTopButton) {
        scrollToTopButton.addEventListener('click', scrollToTop);
    }
    //Box chat
    const chatButton = document.getElementById('chatButton');
    const chatPopup = document.getElementById('chatPopup');
    
    const closeChat = document.getElementById('closeChat');
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const chatMessages = document.getElementById('chatMessages');

    if (chatButton && chatPopup && closeChat && chatMessages && chatInput && sendChatBtn) {

        chatButton.addEventListener('click', () => {
            if (chatPopup.classList.contains('show')) {
                chatPopup.classList.remove('show');
            }
            else {
                chatPopup.classList.add('show');
                chatInput.focus();
            }
        });

        closeChat.addEventListener('click', () => {
            chatPopup.classList.remove('show');
        });
}
    /**
     * Thêm tin nhắn vào khung chat
     * @param {string} message
     * @param {boolean} isUser
     */
    function addMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;
        messageDiv.innerHTML = message;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * Gửi tin nhắn chat tới server
     */
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;
        addMessage(message, true);
        chatInput.value = '';

        try {
            const response = await fetch('/chat/process-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message }),
            });

            const data = await response.json();
            addMessage(data.content);
        } catch (error) {
            console.error('Error:', error);
            addMessage('Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.');
        }
    }

    // Xử lý sự kiện gửi tin nhắn
    sendChatBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    //Animation sang trang khác
    document.querySelectorAll('a.link').forEach(link => {
        console.log(link)
        link.addEventListener('click', function (event) {
            const href = this.getAttribute('href');
            const target = this.getAttribute('target'); 
            if (href && href !== '#' && !href.startsWith('javascript:') && target !== '_blank') {
                event.preventDefault(); 
                document.documentElement.style.overflowX = 'hidden';
                document.body.style.overflowX = 'hidden';
                document.body.classList.add('page-exiting-left');
                setTimeout(() => {
                    window.location.href = href;
                }, 500);
            }
        });
    });
});


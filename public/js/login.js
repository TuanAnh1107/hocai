/**
 * Xử lý giao diện đăng nhập/đăng ký/trợ giúp và xác thực form phía client.
 */
document.addEventListener('DOMContentLoaded', function () {
    const signupBtn = document.getElementById('signup');
    const signupBox = document.querySelector('.signup-box');
    const loginBox = document.querySelector('.login-box');
    const loginBtn = document.getElementById('login');
    const googleLoginButtons = document.querySelectorAll('.google-login-button');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const forgotPasswordBox = document.querySelector('.forgot-password-box');
    const backToLogin = document.getElementById('back-to-login');

    /**
     * Hiển thị lỗi lên form.
     * @param {HTMLElement} form
     * @param {string} message
     */
    function showError(form, message) {
        removeError(form);
        const error = document.createElement('div');
        error.className = 'error-message';
        error.textContent = message;
        form.insertBefore(error, form.firstChild);
    }

    /**
     * Xóa lỗi khỏi form.
     * @param {HTMLElement} form
     */
    function removeError(form) {
        const oldError = form.querySelector('.error-message');
        if (oldError) {
            oldError.remove();
        }
    }

    /**
     * Kiểm tra độ mạnh của mật khẩu.
     * @param {string} password
     * @returns {string|null}
     */
    function getPasswordError(password) {
        if (password.length < 6) {
            return 'Mật khẩu phải có ít nhất 6 ký tự.';
        }
        if (!(/[A-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password))) {
            return 'Mật khẩu phải có ít nhất 1 chữ cái in hoa, 1 số và 1 ký tự đặc biệt.';
        }
        return null;
    }

    /**
     * Chuyển panel đang hiển thị.
     * @param {'login'|'signup'|'forgot'} panelName
     */
    function setActivePanel(panelName) {
        const panels = {
            login: loginBox,
            signup: signupBox,
            forgot: forgotPasswordBox
        };

        Object.values(panels).forEach((panel) => {
            if (!panel) {
                return;
            }
            panel.classList.remove('active');
            panel.style.display = 'none';
        });

        const activePanel = panels[panelName] || loginBox;
        if (activePanel) {
            activePanel.classList.add('active');
            activePanel.style.display = 'flex';
        }
    }

    const initialPanel = forgotPasswordBox && forgotPasswordBox.classList.contains('active')
        ? 'forgot'
        : signupBox && signupBox.classList.contains('active')
            ? 'signup'
            : 'login';
    setActivePanel(initialPanel);

    if (signupBtn) {
        signupBtn.addEventListener('click', function (e) {
            e.preventDefault();
            setActivePanel('signup');
        });
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', function (e) {
            e.preventDefault();
            setActivePanel('login');
        });
    }

    googleLoginButtons.forEach((button) => {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            window.location.href = '/auth/google';
        });
    });

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function (e) {
            e.preventDefault();
            setActivePanel('forgot');
        });
    }

    if (backToLogin) {
        backToLogin.addEventListener('click', function (e) {
            e.preventDefault();
            setActivePanel('login');
        });
    }

    const loginForm = document.querySelector('.login-box form');
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            const passwordInput = loginForm.querySelector('input[name="password"]');
            removeError(loginForm);
            if (passwordInput.value.length < 6) {
                e.preventDefault();
                showError(loginForm, 'Mật khẩu phải có ít nhất 6 ký tự.');
                passwordInput.focus();
            }
        });
    }

    const signupForm = document.querySelector('.signup-box form');
    if (signupForm) {
        signupForm.addEventListener('submit', function (e) {
            const accountInput = signupForm.querySelector('input[name="account"]');
            const passwordInput = signupForm.querySelector('input[name="password"]');
            const confirmPasswordInput = signupForm.querySelector('input[name="confirmPassword"]');
            const account = accountInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            removeError(signupForm);

            if (!/^[a-zA-Z0-9_]{4,}$/.test(account)) {
                e.preventDefault();
                showError(signupForm, 'Tài khoản chỉ được chứa chữ, số, dấu gạch dưới và tối thiểu 4 ký tự.');
                accountInput.focus();
                return;
            }

            const passwordError = getPasswordError(password);
            if (passwordError) {
                e.preventDefault();
                showError(signupForm, passwordError);
                passwordInput.focus();
                return;
            }

            if (password !== confirmPassword) {
                e.preventDefault();
                showError(signupForm, 'Mật khẩu xác nhận không khớp.');
                confirmPasswordInput.focus();
            }
        });
    }

    const forgotForm = document.querySelector('.forgot-password-box form');
    if (forgotForm) {
        forgotForm.addEventListener('submit', function (e) {
            const identityInput = forgotForm.querySelector('input[name="accountOrEmail"]');
            const identity = identityInput.value.trim();

            removeError(forgotForm);

            if (!identity) {
                e.preventDefault();
                showError(forgotForm, 'Vui lòng nhập email hoặc tài khoản đã đăng ký.');
                identityInput.focus();
            }
        });
    }
});

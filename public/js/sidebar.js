/**
 * Xử lý sidebar, popup thông tin người dùng, chỉnh sửa thông tin, đăng xuất
 */
document.addEventListener('DOMContentLoaded', function () {
    const toggleBtn = document.querySelector('.side-bar-toggle svg');
    const sidebarMenu = document.querySelector('.side-bar-menu');
    toggleBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        this.classList.toggle('active');
        sidebarMenu.classList.toggle('active');
    });

    document.addEventListener('click', function (e) {
        if (!sidebarMenu.contains(e.target) && e.target !== toggleBtn) {
            toggleBtn.classList.remove('active');
            sidebarMenu.classList.remove('active');
        }
    });


    const dropdownParents = document.querySelectorAll('.side-bar-menu > ul > li:has(.dropdown-menu)');
    dropdownParents.forEach(parent => {
        const link = parent.querySelector('a');
        const dropdown = parent.querySelector('.dropdown-menu');

        link.addEventListener('click', function (e) {
            if (window.innerWidth <= 900) {
                e.preventDefault();
                e.stopPropagation();
                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            }
        });
    });
    const loginInfoLink = document.getElementById('login-info');
    const logoutButton = document.getElementById('logoutButtonFromPopup');
    const userPopupOverlay = document.getElementById('userPopupOverlay');
    const userInfoPopupContainer = document.getElementById('userInfoPopup'); 
    const closePopupBtn = document.getElementById('closePopupBtn');
    const bodyElement = document.body;

    const popupUsername = document.getElementById('popup-username');
    const popupAccount = document.getElementById('popup-account');
    const popupEmail = document.getElementById('popup-email');
    const popupLoginDate = document.getElementById('popup-logindate');
    const popupCourses = document.getElementById('popup-courses');

    const editUserBtn = document.getElementById('editUserBtn');
    const saveUserBtn = document.getElementById('saveUserBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const editUsernameInput = document.getElementById('edit-username');
    const editAccountInput = document.getElementById('edit-account');
    const editEmailInput = document.getElementById('edit-email');
    const editPasswordInput = document.getElementById('edit-password');

    let currentUserData = null; 

    /**
     * Lấy thông tin người dùng hiện tại và hiển thị popup
     */
    async function fetchAndShowUserInfo() {
        try {
            const response = await fetch('/api/user/current');
            if (response.ok) {
                const userData = await response.json();
                currentUserData = userData; 
                if (userData && userData.username) {
                    loginInfoLink.textContent = `Xin chào, ${userData.username}`;
                    loginInfoLink.removeAttribute('href');
                    loginInfoLink.style.cursor = 'pointer';
                    loginInfoLink.onclick = async function (event) {
                        event.preventDefault();
                        if (popupUsername) popupUsername.textContent = userData.username;
                        if (popupAccount) popupAccount.textContent = userData.account || 'N/A';
                        if (popupEmail) popupEmail.textContent = userData.email;
                        if (popupLoginDate) popupLoginDate.textContent = userData.time_create;
                        if (popupCourses) {
                            popupCourses.innerHTML = '<div>Đang tải...</div>';
                            try {
                                const res = await fetch('/api/user/courses');
                                if (res.ok) {
                                    const data = await res.json();
                                    if (data.courses && data.courses.length > 0) {
                                        let html = '<ul>';
                                        data.courses.forEach(c => {
                                            html += `<li>${c.name_course} - ${c.lesson}</li>`;
                                        });
                                        html += '</ul>';
                                        popupCourses.innerHTML = html;
                                    } else {
                                        popupCourses.innerHTML = '<ul><li>Bạn chưa chọn khoá học nào.</li></ul>';
                                    }
                                } else {
                                    popupCourses.innerHTML = '<ul><li>Lỗi khi lấy khoá học.</li></ul>';
                                }
                            } catch (err) {
                                popupCourses.innerHTML = '<ul><li>Lỗi khi lấy khoá học.</li></ul>';
                            }
                        }
                        showUserPopup();
                    };
                } else {
                    setLoginLinkDefault();
                }
            } else if (response.status === 401) {
                setLoginLinkDefault();
            } else {
                console.error('API error:', response.status, await response.text());
                setLoginLinkDefault();
            }
        } catch (error) {
            console.error('Lỗi khi lấy thông tin người dùng:', error);
            setLoginLinkDefault();
        }
    }

    /**
     * Đặt lại link đăng nhập về mặc định
     */
    function setLoginLinkDefault() {
        loginInfoLink.textContent = 'Đăng nhập';
        loginInfoLink.setAttribute('href', '/login');
        loginInfoLink.style.cursor = '';
        loginInfoLink.onclick = null;
    }

    /**
     * Hiển thị popup thông tin người dùng
     */
    function showUserPopup() {
        if (userPopupOverlay && userInfoPopupContainer) {
            userPopupOverlay.classList.add('active');
            bodyElement.style.overflow = 'hidden';
        }
    }

    /**
     * Ẩn popup thông tin người dùng
     */
    function hideUserPopup() {
        if (userPopupOverlay) {
            userPopupOverlay.classList.remove('active');
            bodyElement.style.overflow = '';
        }
    }

    if (loginInfoLink) {
        fetchAndShowUserInfo(); 
    }

    if (closePopupBtn) {
        closePopupBtn.addEventListener('click', hideUserPopup);
    }

    if (userPopupOverlay) {
        userPopupOverlay.addEventListener('click', function (event) {
            
            if (event.target === userPopupOverlay) {
                hideUserPopup();
            }
        });
    }

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && userPopupOverlay && userPopupOverlay.classList.contains('active')) {
            hideUserPopup();
        }
    });
    if (logoutButton) {
        logoutButton.addEventListener('click', async function () {
            try {
               
                const response = await fetch('/logout', {
                    method: 'POST',
                    headers: {
                       
                    }
                });

                if (response.ok) {
                   
                    console.log('Đăng xuất thành công, đang chuyển hướng...');
                    window.location.href = '/'; 
                } else {
                  
                    console.error('Lỗi đăng xuất:', response.status, await response.text());
                    alert('Đăng xuất không thành công. Vui lòng thử lại.');
                }
            } catch (error) {
                console.error('Lỗi khi gửi yêu cầu đăng xuất:', error);
                alert('Đã xảy ra lỗi. Vui lòng thử lại.');
            }
        });
    }

    /**
     * Bật/tắt chế độ chỉnh sửa thông tin người dùng
     * @param {boolean} isEdit
     */
    function setEditMode(isEdit) {
     
        popupUsername.style.display = isEdit ? 'none' : '';
        editUsernameInput.style.display = isEdit ? '' : 'none';
        popupAccount.style.display = isEdit ? 'none' : '';
        editAccountInput.style.display = isEdit ? '' : 'none';
        popupEmail.style.display = isEdit ? 'none' : '';
        editEmailInput.style.display = isEdit ? '' : 'none';
        
        editPasswordInput.style.display = isEdit ? '' : 'none';
       
        editUserBtn.style.display = isEdit ? 'none' : '';
        saveUserBtn.style.display = isEdit ? '' : 'none';
        cancelEditBtn.style.display = isEdit ? '' : 'none';
    }

    if (editUserBtn && saveUserBtn && cancelEditBtn) {
        editUserBtn.addEventListener('click', function () {
            if (!currentUserData) return;
            
            editUsernameInput.value = currentUserData.username || '';
            editAccountInput.value = currentUserData.account || '';
            editEmailInput.value = currentUserData.email || '';
            editPasswordInput.value = '';
            setEditMode(true);
        });
        cancelEditBtn.addEventListener('click', function () {
            setEditMode(false);
        });
        
        saveUserBtn.addEventListener('click', async function () {
            if (!currentUserData) return;
            
            const newUsername = editUsernameInput.value.trim();
            const newAccount = editAccountInput.value.trim();
            const newEmail = editEmailInput.value.trim();
            const newPassword = editPasswordInput.value; 
           
            if (!newUsername || !newAccount || !newEmail) {
                alert('Vui lòng nhập đầy đủ thông tin.');
                return;
            }
          
            try {
                const res = await fetch('/api/user/update', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: newUsername,
                        account: newAccount,
                        email: newEmail,
                        password: newPassword 
                    })
                });
                if (res.ok) {
                    
                    currentUserData.username = newUsername;
                    currentUserData.account = newAccount;
                    currentUserData.email = newEmail;
                    if (popupUsername) popupUsername.textContent = newUsername;
                    if (popupAccount) popupAccount.textContent = newAccount;
                    if (popupEmail) popupEmail.textContent = newEmail;
                    setEditMode(false);
                    alert('Cập nhật thông tin thành công!');
                } else {
                    const err = await res.text();
                    alert('Cập nhật thất bại: ' + err);
                }
            } catch (e) {
                alert('Có lỗi khi cập nhật: ' + e.message);
            }
        });
    }
    setEditMode(false); 
});

/**
 * Xử lý sự kiện đăng ký khoá học từ trang giới thiệu khoá học
 */
const registerBtn = document.getElementById('registerCourseBtn');
if (registerBtn) {
  /**
   * Gửi yêu cầu đăng ký khoá học khi bấm nút
   */
  registerBtn.addEventListener('click', async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const id_course = urlParams.get('id_course');
    if (!id_course) return alert('Thiếu thông tin khoá học!');
    try {
      const res = await fetch('/register-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_course })
      });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else {
        alert(data.message || 'Đăng ký thất bại!');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ!');
    }
  });
}
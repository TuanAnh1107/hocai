/**
 * Xử lý giao diện trang học, quiz, bình luận, cập nhật tiến độ
 */
document.addEventListener("DOMContentLoaded", function () {
  const quizForm = document.querySelector("#quizPopup form");
  const quizScore = document.getElementById("quizScore");

  const quizResult = document.getElementById("quizResult");
  const finishQuizBtn = document.getElementById("finishQuizBtn");
  const submitBtn = quizForm.querySelector(".btn-submit");
  const btn = document.getElementById('completeBtn');
  const quizzPopup = document.getElementById('quizPopup');
  const allLabels = quizForm.querySelectorAll('label');
  let lastQuizzData = null; 
  if (btn && quizzPopup) {
    btn.addEventListener('click', async () => {
      const activeItem = document.querySelector('.item.active');
      const params = new URLSearchParams(window.location.search);
      if (activeItem) {
        const id_course = params.get('id_course');
        const id_chapter = activeItem.getAttribute('data-id_chapter');
        const id_lesson = activeItem.getAttribute('data-id_lesson');
        const stt = activeItem.getAttribute('data-stt');
        try {
          const res = await fetch(`/lesson-quizz?id_course=${id_course}&id_chapter=${id_chapter}&id_lesson=${id_lesson}`);
          const data = await res.json();
          console.log(`/lesson-quizz?id_course=${id_course}&id_chapter=${id_chapter}&id_lesson=${id_lesson}`);
          console.log('Dữ liệu quizz:', data);
          if (data.success && Array.isArray(data.data)) {
            lastQuizzData = data.data;
            const form = document.querySelector('#quizPopup form');
            form.querySelectorAll('.question-box').forEach(qb => qb.remove());
            data.data.forEach((quizz, idx) => {
              const box = document.createElement('div');
              box.className = 'question-box';
              const p = document.createElement('p');
              p.textContent = `${idx + 1}. ${quizz.question}`;
              box.appendChild(p);
              if (quizz.type === 'radio' || quizz.type === 'checkbox') {
                const ul = document.createElement('ul');
                ul.className = 'answer-list';
                quizz.answers.forEach(ans => {
                  const li = document.createElement('li');
                  const label = document.createElement('label');
                  const input = document.createElement('input');
                  input.type = quizz.type;
                  input.name = `q${idx + 1}`;
                  input.value = ans.id_answer;
                  label.appendChild(input);
                  label.appendChild(document.createTextNode(' ' + ans.content));
                  li.appendChild(label);
                  ul.appendChild(li);
                });
                box.appendChild(ul);
              } else if (quizz.type === 'text') {
                const input = document.createElement('input');
                input.type = 'text';
                input.name = `q${idx + 1}`;
                input.placeholder = '...';
                input.style.width = '100%';
                input.style.padding = '10px';
                input.style.borderRadius = '10px';
                input.style.border = '1px solid #ccc';
                box.appendChild(input);
              }
              const submitBtn = form.querySelector('.btn-submit');
              form.insertBefore(box, submitBtn);
            });
          }
        } catch (err) {
          console.error('Lỗi lấy quizz:', err);
        }
      }

      quizResult.style.display = "none";
      quizzPopup.style.display = 'flex';
      submitBtn.style.display = "block";
      allLabels.forEach(label => {
        label.classList.remove('correct-answer', 'incorrect-user-answer');
      });
    });
  }
  // === Gửi bình luận ===
  const sendBtn = document.getElementById("sendComment");
  const commentInput = document.getElementById("commentInput");
  const commentList = document.getElementById("commentList");
  const commentCountEl = document.querySelector(".comment-section h4 span");
  /**
   * Cập nhật số lượng bình luận hiển thị
   */
  function updateCommentCount() {
    const commentCount = commentList.querySelectorAll("p").length;
    if (commentCountEl) {
      commentCountEl.textContent = `${commentCount} bình luận`;
    }
  }

  updateCommentCount();

  if (sendBtn && commentInput && commentList) {
    sendBtn.addEventListener("click", async () => {
      const content = commentInput.value.trim();
      if (content !== "") {
      
        const activeItem = document.querySelector('.item.active');
        const params = new URLSearchParams(window.location.search);
        if (!activeItem) return;
        const id_course = params.get('id_course');
        const id_chapter = activeItem.getAttribute('data-id_chapter');
        const id_lesson = activeItem.getAttribute('data-id_lesson');
        try {
          const res = await fetch('/lesson-comment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_course, id_chapter, id_lesson, cmt_content: content })
          });
          const data = await res.json();
          if (data.success) {
            commentInput.value = "";
            loadLessonComments(id_course, id_chapter, id_lesson);
          } else {
            alert(data.message || 'Gửi bình luận thất bại!');
          }
        } catch (err) {
          alert('Có lỗi khi gửi bình luận!');
        }
      }
    });
  }

  // === Xử lý quizz ===
 
  const correctAnswers = {
    0: 'OpenAI',
    1: ['1', '3'],
    2: 'Generative Pre-trained Transformer'

  };

  /**
   * So sánh hai mảng đáp án nhiều lựa chọn
   * @param {string[]} arr1
   * @param {string[]} arr2
   * @returns {boolean}
   */
  function multiplechoice(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    const sortedArr1 = [...arr1].sort();
    const sortedArr2 = [...arr2].sort();
    for (let i = 0; i < sortedArr1.length; i++) {
      if (sortedArr1[i] !== sortedArr2[i]) return false;
    }
    return true;
  }
  /**
  * Xử lý khi nhấn nút submit
  */
  if (quizForm) {
    quizForm.addEventListener("submit", function (e) {
      e.preventDefault();
      let score = 0;
      const questionBoxes = quizForm.querySelectorAll('.question-box');
      const totalQuestions = questionBoxes.length;


      allLabels.forEach(label => {
        label.classList.remove('correct-answer', 'incorrect-user-answer');
      });
      submitBtn.style.display = "none";

      console.log(questionBoxes);
      if (!lastQuizzData) {
        alert('Không có dữ liệu quizz!');
        return;
      }
      questionBoxes.forEach((box, index) => {
        const quizz = lastQuizzData[index];
        if (!quizz) return;
        const type = quizz.type;
        let isCorrect = false;
        if (type === 'radio') {
          const correctAns = quizz.answers.find(a => a.istrue == 1);
          const selected = box.querySelector('input[type="radio"]:checked');
          const allInput = box.querySelectorAll('input[type="radio"]');
          allInput.forEach(input => {
            const label = input.closest('label');
            if (selected && input === selected && input.value == correctAns.id_answer) {
              isCorrect = true;
              label.classList.add('correct-answer');
            } else if (selected && input === selected) {
              label.classList.add('incorrect-user-answer');
            }
          });
        } else if (type === 'checkbox') {
          const correctAns = quizz.answers.filter(a => a.istrue == 1).map(a => a.id_answer.toString());
          const selected = Array.from(box.querySelectorAll('input[type="checkbox"]:checked')).map(i => i.value);
          const allInput = box.querySelectorAll('input[type="checkbox"]');
          const arraysEqual = (a, b) => a.length === b.length && a.sort().every((v, i) => v === b.sort()[i]);
          if (arraysEqual(selected, correctAns)) {
            isCorrect = true;
          }
          allInput.forEach(input => {
            const label = input.closest('label');
            if (correctAns.includes(input.value) && input.checked) {
              label.classList.add('correct-answer');
            } else if (input.checked) {
              label.classList.add('incorrect-user-answer');
            }
          });
          if (!isCorrect) {
            const p = document.createElement('p');
            p.classList = "alarm-quizz";
            p.textContent = 'Thừa hoặc thiếu đáp án đúng';
            p.style.color = 'red';
            box.appendChild(p);
          }
        } else if (type === 'text') {
          const correctAns = quizz.answers.filter(a => a.istrue == 1).map(a => a.content.trim().toLowerCase());
          const input = box.querySelector('input[type="text"]');
          if (input && correctAns.some(ans => input.value.trim().toLowerCase() === ans)) {
            isCorrect = true;
            input.style.backgroundColor = "#d1fae5";
          } else {
            input.style.backgroundColor = "#fee2e2";
          }
        }
        if (isCorrect) score++;
      });
      if (quizScore && quizResult) {
        if (score >= Math.ceil((2 * totalQuestions) / 3)) {
          quizScore.textContent = `Kết quả: ${score} / ${totalQuestions} câu đúng. Đạt!`;
          finishQuizBtn.textContent = 'Hoàn thành bài học';
          finishQuizBtn.style.backgroundColor = '#22c55e'; // xanh lá
          finishQuizBtn.style.color = '#fff';
          finishQuizBtn.onclick = async function () {
            const activeItem = document.querySelector('.item.active');
            const params = new URLSearchParams(window.location.search);
            if (activeItem) {
              const id_course = params.get('id_course');
              const id_chapter = activeItem.getAttribute('data-id_chapter');
              const id_lesson = activeItem.getAttribute('data-id_lesson');
              const stt = parseInt(activeItem.getAttribute('data-stt'));
              try {
                const res = await fetch('/update-roadmap', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id_course, stt: stt + 1 })
                });
                const data = await res.json();
                if (data.success) {
                  if (data.updated) {
                    const nextItem = document.querySelector(`.item[data-stt='${stt + 1}']`);
                    if (nextItem) {
                      location.reload();
                      quizzPopup.style.display = 'none';
                    } else {
                      alert('Đã hoàn thành khoá học');
                      quizzPopup.style.display = 'none';
                    }
                  } else {
                    alert('Bạn đã hoàn thành bài học này trước đó!');
                    quizzPopup.style.display = 'none';
                  }
                } else {
                  alert(data.message || 'Lỗi cập nhật tiến trình!');
                }
              } catch (err) {
                alert('Lỗi cập nhật tiến trình!');
              }
            }
          };
        } else {
          quizScore.textContent = `Kết quả: ${score} / ${totalQuestions} câu đúng. Không đạt!`;
          finishQuizBtn.textContent = 'Học lại';
          finishQuizBtn.style.backgroundColor = '#ef4444'; // đỏ
          finishQuizBtn.style.color = '#fff';
          finishQuizBtn.onclick = function () {
            quizzPopup.style.display = 'none';
          };
        }
        quizResult.style.display = "block";
      }
    });
  }
  if (finishQuizBtn) {
    finishQuizBtn.addEventListener("click", () => {
      quizzPopup.style.display = "none";
    });
  }

  document.querySelectorAll('.item.locked').forEach(function (item) {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      alert('Bạn phải hoàn thành bài học trước');
    });
  });
  /**
   * Cập nhật nội dung bài học khi chuyển bài
   * @param {object} lessonData
   * @param {HTMLElement} item
   */
  function updateLessonContent(lessonData, item) {
    const contentSection = document.querySelector('.content');
    if (!contentSection) return;
    const videoWrapper = contentSection.querySelector('.video-wrapper');
    if (videoWrapper) {
      if (lessonData.url) {
        if (lessonData.url.startsWith('/')) {
          videoWrapper.innerHTML = `<img src="${lessonData.url}" alt="Đang tải" style="max-width:100%;height:auto;">`;
        } else if (lessonData.url.startsWith('<')) {
          videoWrapper.innerHTML = lessonData.url;
        } else {
          videoWrapper.innerHTML = '';
        }
      } else {
        videoWrapper.innerHTML = '';
      }
    }
    const h2 = contentSection.querySelector('h2');
    if (item) {
      lessonName = item.textContent;
    }
    if (h2 && lessonName) {
      h2.textContent = lessonName;
    }
    let reviewDiv = contentSection.querySelector('.lesson-review');
    if (!reviewDiv) {
      const highlightBox = contentSection.querySelector('.highlight-box');
      reviewDiv = document.createElement('div');
      reviewDiv.className = 'lesson-review';
      if (highlightBox && highlightBox.parentNode) {
        highlightBox.parentNode.insertBefore(reviewDiv, highlightBox.nextSibling);
      } else {
        contentSection.appendChild(reviewDiv);
      }
    }
    if (lessonData.review) {
      reviewDiv.innerHTML = lessonData.review;
    } else {
      reviewDiv.innerHTML = '';
    }
    const highlightBox = contentSection.querySelector('.highlight-box');
    if (highlightBox) {
      const h4 = highlightBox.querySelector('h4');
      if (h4) {
        let next = h4.nextSibling;
        while (next) {
          const toRemove = next;
          next = next.nextSibling;
          highlightBox.removeChild(toRemove);
        }
        if (lessonData.content) {
          const contentDiv = document.createElement('div');
          contentDiv.innerHTML = lessonData.content;
          highlightBox.appendChild(contentDiv);
        }
      }
    }
  }
  const activeItem = document.querySelector('.item.active');
  const params = new URLSearchParams(window.location.search)
  if (activeItem) {
    const id_course = params.get("id_course");
    const id_chapter = activeItem.getAttribute('data-id_chapter');
    const id_lesson = activeItem.getAttribute('data-id_lesson');
    const stt = activeItem.getAttribute('data-stt');
    fetch(`/lesson-content?id_course=${id_course}&id_chapter=${id_chapter}&id_lesson=${id_lesson}&stt=${stt}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log('Nội dung bài học đang học:', data.data);
          updateLessonContent(data.data, activeItem);
        } else {
          console.warn('Không lấy được nội dung bài học:', data.message, id_course, id_chapter, id_lesson, stt);
        }
      });
    loadLessonComments(id_course, id_chapter, id_lesson);
  }
  /**
   * Hiển thị danh sách bình luận
   * @param {Array} comments
   */
  function renderComments(comments) {
    commentList.innerHTML = '';
    if (Array.isArray(comments) && comments.length > 0) {
      comments.forEach(cmt => {
        const p = document.createElement('p');
        p.innerHTML = `<strong>${cmt.email}</strong> <span style="font-size:12px;color:#888">${cmt.time_cmt ? new Date(cmt.time_cmt).toLocaleString() : ''}</span><br>${cmt.cmt_content}`;
        commentList.appendChild(p);
      });
    }
    updateCommentCount();
  }
  /**
   * Tải bình luận cho bài học
   * @param {string} id_course
   * @param {string} id_chapter
   * @param {string} id_lesson
   */
  async function loadLessonComments(id_course, id_chapter, id_lesson) {
    try {
      const res = await fetch(`/lesson-comments?id_course=${id_course}&id_chapter=${id_chapter}&id_lesson=${id_lesson}`);
      const data = await res.json();
      if (data.success) {
        renderComments(data.data);
      } else {
        renderComments([]);
      }
    } catch (err) {
      renderComments([]);
    }
  }
  document.querySelectorAll('.item:not(.locked)').forEach(function (item) {
    item.addEventListener('click', function (e) {
      document.querySelectorAll('.item.active').forEach(function (i) {
        i.classList.remove('active');
      });
      item.classList.add('active');
      const params = new URLSearchParams(window.location.search);
      const id_course = params.get('id_course');
      const id_chapter = item.getAttribute('data-id_chapter');
      const id_lesson = item.getAttribute('data-id_lesson');
      const stt = item.getAttribute('data-stt');
      fetch(`/lesson-content?id_course=${id_course}&id_chapter=${id_chapter}&id_lesson=${id_lesson}&stt=${stt}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            console.log('Nội dung bài học:', data.data);
            updateLessonContent(data.data, item);
          } else {
            console.warn('Không lấy được nội dung bài học:', data.message, id_course, id_chapter, id_lesson, stt);
          }
        });
      loadLessonComments(id_course, id_chapter, id_lesson);
    });
  });

  const registerBtn = document.getElementById('registerCourseBtn');
  if (registerBtn) {
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
          fetch(`/lesson-content?id_course=${id_course}&stt=1`)
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                console.log('Nội dung bài học 1 sau khi đăng ký:', data.data);
              } else {
                console.warn('Không lấy được nội dung bài học 1:', data.message, id_course);
              }
            });
        } else {
          alert(data.message || 'Đăng ký thất bại!');
        }
      } catch (err) {
        alert('Có lỗi xảy ra khi đăng ký!');
      }
    });
  }
  /**
   * Cập nhật tiến độ học (progress bar)
   */
  function updateProgressBar() {
    const activeItem = document.querySelector('.item.active');
    const allItems = document.querySelectorAll('.item');
    const progressBar = document.querySelector('.progress-bar');
    const progress = progressBar ? progressBar.querySelector('.progress') : null;
    if (activeItem && allItems.length && progressBar && progress) {
      const stt = parseInt(activeItem.getAttribute('data-stt'));
      const total = allItems.length;
      const percent = Math.round((stt / total) * 100);
      progress.style.width = percent + '%';
      let ratioSpan = document.querySelector('.progress-ratio');
      ratioSpan.textContent = `${stt}/${total}`;
    }
  }

  // Gọi khi trang load
  updateProgressBar();


});

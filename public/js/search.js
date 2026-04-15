/**
 * Xử lý tìm kiếm nhanh trên sidebar và footer
 */
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.search-box input');
    const searchResults = document.createElement('div');
    searchResults.className = 'search-results';
    document.querySelector('.search-box').appendChild(searchResults);
    const sidebarLinks = Array.from(document.querySelectorAll('.side-bar-menu a'));
    const footerLinks = Array.from(document.querySelectorAll('.footer-box h3 a'));

    /**
     * Chuyển đổi chữ có dấu sang không dấu
     * @param {string} str
     * @returns {string}
     */
    function removeAccents(str) {
        return str.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }

    /**
     * Tìm kiếm từ khoá trong text
     * @param {string} wordToMatch
     * @param {Array} links
     * @returns {Array}
     */
    function findMatches(wordToMatch, links) {
        const searchTerm = removeAccents(wordToMatch);
        return links.filter(link => {
            const text = removeAccents(link.textContent);
            const href = link.getAttribute('href');
            return text.includes(searchTerm) && href;
        });
    }

    /**
     * Hiển thị kết quả tìm kiếm
     */
    function displayMatches() {
        const searchTerm = this.value;
        if (searchTerm.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        const sidebarMatches = findMatches(searchTerm, sidebarLinks);
        const footerMatches = findMatches(searchTerm, footerLinks);

        const allMatches = [...sidebarMatches, ...footerMatches].slice(0, 5);

        if (allMatches.length > 0) {
            const html = allMatches.map(match => {
                return `
                    <div class="search-result-item">
                        <a href="${match.getAttribute('href')}">${match.textContent}</a>
                    </div>
                `;
            }).join('');
            searchResults.innerHTML = html;
        } else {
            searchResults.innerHTML = `
                <div class="search-result-item no-results">
                    <i>Không có kết quả</i>
                </div>
            `;
        }
        searchResults.style.display = 'block';
    }
    searchInput.addEventListener('input', displayMatches);
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-box')) {
            searchResults.style.display = 'none';
        }
    });
}); 
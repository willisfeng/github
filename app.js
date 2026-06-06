/**
 * GitHub 热门仓库排行榜
 * 数据来源：fetch.js 定时抓取的 data.json
 * 近一周创建、星标 ≥ 5000、Top 21
 */

// ========== 配置 ==========
const CONFIG = {
    languageColors: {
        'JavaScript': '#f1e05a', 'TypeScript': '#3178c6', 'Python': '#3572A5',
        'Go': '#00ADD8', 'Rust': '#dea584', 'Java': '#b07219', 'C++': '#f34b7d',
        'C': '#555555', 'C#': '#178600', 'Ruby': '#701516', 'Swift': '#F05138',
        'Kotlin': '#A97BFF', 'Dart': '#00B4AB', 'PHP': '#4F5D95', 'Vue': '#41b883',
        'HTML': '#e34c26', 'CSS': '#563d7c', 'Shell': '#89e051',
        'Jupyter Notebook': '#DA5B0B', 'Zig': '#ec915c', 'Svelte': '#ff3e00',
        'Lua': '#000080', 'R': '#198CE7', 'Scala': '#c22d40',
    },
};

// ========== 全局状态 ==========
const STATE = {
    allRepos: [],
    currentPage: 1,
    pageSize: 21,
    dataMeta: null,
};

// ========== DOM 引用 ==========
const $ = (id) => document.getElementById(id);
const dom = {
    loading: $('loading'), errorBox: $('errorBox'), errorMsg: $('errorMsg'),
    statsBar: $('statsBar'), repoGrid: $('repoGrid'), lastUpdate: $('lastUpdate'),
    totalRepos: $('totalRepos'), totalStars: $('totalStars'),
    avgStars: $('avgStars'), topLanguage: $('topLanguage'),
    paginationTop: $('paginationTop'), paginationBottom: $('paginationBottom'),
};

// ========== 工具函数 ==========

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return String(num);
}

function formatFullNumber(num) {
    return num.toLocaleString('zh-CN');
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffH = Math.floor((now - d) / (1000 * 60 * 60));
    const diffD = Math.floor(diffH / 24);
    if (diffH < 1) return '刚刚';
    if (diffH < 24) return diffH + ' 小时前';
    if (diffD < 30) return diffD + ' 天前';
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function getLanguageColor(lang) {
    return CONFIG.languageColors[lang] || '#8b949e';
}

function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

// ========== 数据加载（从 data.js 全局变量） ==========

function loadData() {
    if (!window.__REPO_DATA__ || !window.__REPO_DATA__.repos) {
        throw new Error('数据未加载，请确保 data.js 文件存在且包含最新数据。运行 node fetch.js 生成数据。');
    }
    return window.__REPO_DATA__;
}

// ========== 渲染 ==========

function renderRepoCard(repo, globalRank) {
    const desc = repo.description || '暂无描述';
    const lang = repo.language || '未知';
    const langColor = getLanguageColor(lang);
    const topics = repo.topics || [];
    const rankClass = globalRank <= 3 ? ' rank-' + globalRank : '';

    return `
        <div class="repo-card${rankClass}">
            <div class="card-rank">#${globalRank}</div>
            <div class="card-header">
                <img class="avatar" src="${escapeHtml(repo.owner.avatar_url)}&s=48" alt="" width="24" height="24" loading="lazy">
                <div class="card-title">
                    <a class="repo-name" href="${escapeHtml(repo.html_url)}" target="_blank" rel="noopener" title="${escapeHtml(repo.full_name)}">
                        ${escapeHtml(repo.full_name)}
                    </a>
                </div>
            </div>
            <p class="card-desc" title="${escapeHtml(desc)}">${escapeHtml(desc)}</p>
            <div class="card-meta">
                <span class="meta-item star-item" title="${formatFullNumber(repo.stargazers_count)} 星标">
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/></svg>
                    ${formatNumber(repo.stargazers_count)}
                </span>
                <span class="meta-item" title="${formatFullNumber(repo.forks_count)} 复刻">
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75v-.878a2.25 2.25 0 111.5 0v.878a2.25 2.25 0 01-2.25 2.25h-1.5v2.128a2.251 2.251 0 11-1.5 0V8.5h-1.5A2.25 2.25 0 013.5 6.25v-.878a2.25 2.25 0 111.5 0z"/></svg>
                    ${formatNumber(repo.forks_count)}
                </span>
                <span class="meta-item" title="主要语言">
                    <span class="lang-dot" style="background:${langColor}"></span>
                    ${escapeHtml(lang)}
                </span>
            </div>
            ${topics.length > 0 ? `
            <div class="card-topics">
                ${topics.slice(0, 5).map(t => '<span class="topic-tag">' + escapeHtml(t) + '</span>').join('')}
            </div>` : ''}
            <div class="card-footer">
                <span class="meta-item" title="创建时间">
                    <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path fill-rule="evenodd" d="M1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0zM8 0a8 8 0 100 16A8 8 0 008 0zm.5 3.75a.75.75 0 00-1.5 0v4.5a.75.75 0 00.471.696l2.5 1a.75.75 0 00.558-1.392L8.5 7.742V3.75z"/></svg>
                    ${formatDate(repo.created_at)}
                </span>
                <span class="meta-item" title="议题数">
                    <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/><path fill-rule="evenodd" d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"/></svg>
                    ${formatNumber(repo.open_issues_count)} 议题
                </span>
                <a href="${escapeHtml(repo.html_url)}" target="_blank" rel="noopener" class="card-link">
                    <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 01-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 010 8c0-4.42 3.58-8 8-8z"/></svg>
                    查看源码
                </a>
            </div>
        </div>
    `;
}

function updateStats(allRepos) {
    const total = allRepos.reduce((s, r) => s + r.stargazers_count, 0);
    const avg = allRepos.length ? Math.round(total / allRepos.length) : 0;

    const langCount = {};
    allRepos.forEach(r => { if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1; });
    const topLang = Object.entries(langCount).sort((a, b) => b[1] - a[1])[0];

    dom.totalRepos.textContent = formatFullNumber(allRepos.length);
    dom.totalStars.textContent = formatNumber(total);
    dom.avgStars.textContent = formatNumber(avg);
    dom.topLanguage.textContent = topLang ? topLang[0] : '-';
    dom.statsBar.style.display = 'grid';
}

// ========== 分页 ==========

function getPageRepos() {
    const start = (STATE.currentPage - 1) * STATE.pageSize;
    return STATE.allRepos.slice(start, start + STATE.pageSize);
}

function getTotalPages() {
    return Math.ceil(STATE.allRepos.length / STATE.pageSize);
}

function renderPagination() {
    const totalPages = getTotalPages();
    const html = buildPaginationHtml(totalPages);
    dom.paginationTop.innerHTML = html;
    dom.paginationBottom.innerHTML = html;
    dom.paginationTop.style.display = totalPages > 1 ? 'flex' : 'none';
    dom.paginationBottom.style.display = totalPages > 1 ? 'flex' : 'none';
}

function buildPaginationHtml(totalPages) {
    const cp = STATE.currentPage;
    let html = '';

    html += '<button class="page-btn" ' + (cp <= 1 ? 'disabled' : 'onclick="goToPage(' + (cp - 1) + ')"') + '>上一页</button>';

    let startP = Math.max(1, cp - 2);
    let endP = Math.min(totalPages, cp + 2);
    if (endP - startP < 4) {
        if (startP === 1) endP = Math.min(totalPages, startP + 4);
        else startP = Math.max(1, endP - 4);
    }

    if (startP > 1) {
        html += '<button class="page-btn" onclick="goToPage(1)">1</button>';
        if (startP > 2) html += '<span class="page-ellipsis">…</span>';
    }

    for (let i = startP; i <= endP; i++) {
        html += '<button class="page-btn' + (i === cp ? ' active' : '') + '" onclick="goToPage(' + i + ')">' + i + '</button>';
    }

    if (endP < totalPages) {
        if (endP < totalPages - 1) html += '<span class="page-ellipsis">…</span>';
        html += '<button class="page-btn" onclick="goToPage(' + totalPages + ')">' + totalPages + '</button>';
    }

    html += '<button class="page-btn" ' + (cp >= totalPages ? 'disabled' : 'onclick="goToPage(' + (cp + 1) + ')"') + '>下一页</button>';

    html += '<span class="page-info">第 ' + cp + ' / ' + totalPages + ' 页，共 ' + formatFullNumber(STATE.allRepos.length) + ' 个项目</span>';

    return html;
}

function goToPage(page) {
    const totalPages = getTotalPages();
    if (page < 1 || page > totalPages || page === STATE.currentPage) return;
    STATE.currentPage = page;
    renderCurrentPage();
    renderPagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderCurrentPage() {
    const pageRepos = getPageRepos();
    const startRank = (STATE.currentPage - 1) * STATE.pageSize;
    dom.repoGrid.innerHTML = pageRepos.map((repo, i) => renderRepoCard(repo, startRank + i + 1)).join('');
}

// ========== UI 状态 ==========

function showLoading() {
    dom.loading.style.display = 'flex';
    dom.errorBox.style.display = 'none';
    dom.statsBar.style.display = 'none';
    dom.repoGrid.innerHTML = '';
    dom.paginationTop.style.display = 'none';
    dom.paginationBottom.style.display = 'none';
}

function hideLoading() { dom.loading.style.display = 'none'; }

function showError(msg) {
    hideLoading();
    dom.errorBox.style.display = 'flex';
    dom.errorMsg.textContent = msg;
    dom.statsBar.style.display = 'none';
    dom.repoGrid.innerHTML = '';
    dom.paginationTop.style.display = 'none';
    dom.paginationBottom.style.display = 'none';
}

// ========== 主流程 ==========

async function init() {
    showLoading();

    try {
        const data = await loadData();
        const repos = data.repos;

        if (repos.length === 0) {
            hideLoading();
            dom.repoGrid.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" width="56" height="56" fill="#3fb950"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                    <h3>暂未找到符合条件的项目</h3>
                    <p>近一周创建的仓库中暂没有星标超过 5000 的项目。</p>
                </div>
            `;
            return;
        }

        STATE.allRepos = repos;
        STATE.currentPage = 1;
        STATE.dataMeta = data;

        hideLoading();
        updateStats(repos);
        renderCurrentPage();
        renderPagination();

        // 显示数据更新时间
        const updateDate = new Date(data.updated_at);
        dom.lastUpdate.textContent = '数据更新：' + updateDate.toLocaleString('zh-CN');
    } catch (err) {
        showError('数据加载失败：' + err.message);
        console.error(err);
    }
}

// 保留手动刷新按钮（触发 fetch.js 需要服务端支持，这里改为重新加载 data.json）
function refreshData() { init(); }

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', init);

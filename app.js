/**
 * GitHub 热门仓库排行榜
 * 近一周创建、星标 > 1000、按星标降序、含 README 简介
 * 数据来源：fetch.js → data.js
 */

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
    PAGE_SIZE: 21,
};

const STATE = { allRepos: [], currentPage: 1 };

const $ = (id) => document.getElementById(id);
const dom = {
    loading: $('loading'), errorBox: $('errorBox'), errorMsg: $('errorMsg'),
    statsBar: $('statsBar'), repoGrid: $('repoGrid'), lastUpdate: $('lastUpdate'),
    totalRepos: $('totalRepos'), totalStars: $('totalStars'),
    avgStars: $('avgStars'), topLanguage: $('topLanguage'),
    paginationTop: $('paginationTop'), paginationBottom: $('paginationBottom'),
};

function formatNumber(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
    return String(n);
}
function formatFullNumber(n) { return n.toLocaleString('zh-CN'); }
function formatDate(s) {
    const d = new Date(s), now = new Date();
    const h = Math.floor((now - d) / 36e5), dd = Math.floor(h / 24);
    if (h < 1) return '刚刚';
    if (h < 24) return h + ' 小时前';
    if (dd < 30) return dd + ' 天前';
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}
function getLangColor(l) { return CONFIG.languageColors[l] || '#8b949e'; }
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// ========== 渲染 ==========

function renderRepoCard(repo, rank) {
    const desc = repo.description || '暂无描述';
    const lang = repo.language || '未知';
    const langColor = getLangColor(lang);
    const topics = repo.topics || [];
    const readme = repo.readme_snippet || '';
    const rankClass = rank <= 3 ? ' rank-' + rank : '';

    return `
        <div class="repo-card${rankClass}">
            <div class="card-rank">#${rank}</div>
            <div class="card-header">
                <img class="avatar" src="${esc(repo.owner.avatar_url)}&s=48" alt="" width="24" height="24" loading="lazy">
                <div class="card-title">
                    <a class="repo-name" href="${esc(repo.html_url)}" target="_blank" rel="noopener" title="${esc(repo.full_name)}">
                        ${esc(repo.full_name)}
                    </a>
                </div>
            </div>
            <p class="card-desc" title="${esc(desc)}">${esc(desc)}</p>

            ${readme ? `<div class="card-readme">
                <div class="readme-label">📖 README 简介</div>
                <p class="readme-text">${esc(readme)}</p>
            </div>` : ''}

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
                    ${esc(lang)}
                </span>
            </div>
            ${topics.length > 0 ? `
            <div class="card-topics">
                ${topics.slice(0, 5).map(t => '<span class="topic-tag">' + esc(t) + '</span>').join('')}
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
                <a href="${esc(repo.html_url)}" target="_blank" rel="noopener" class="card-link">
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
    const start = (STATE.currentPage - 1) * CONFIG.PAGE_SIZE;
    return STATE.allRepos.slice(start, start + CONFIG.PAGE_SIZE);
}
function getTotalPages() {
    return Math.ceil(STATE.allRepos.length / CONFIG.PAGE_SIZE);
}
function renderPagination() {
    const tp = getTotalPages();
    const h = buildPaginationHtml(tp);
    dom.paginationTop.innerHTML = dom.paginationBottom.innerHTML = h;
    dom.paginationTop.style.display = dom.paginationBottom.style.display = tp > 1 ? 'flex' : 'none';
}
function buildPaginationHtml(tp) {
    const cp = STATE.currentPage;
    let h = '<button class="page-btn" ' + (cp <= 1 ? 'disabled' : 'onclick="goToPage(' + (cp - 1) + ')"') + '>上一页</button>';
    let sp = Math.max(1, cp - 2), ep = Math.min(tp, cp + 2);
    if (ep - sp < 4) { sp = sp === 1 ? 1 : Math.max(1, ep - 4); ep = Math.min(tp, sp + 4); }
    if (sp > 1) { h += '<button class="page-btn" onclick="goToPage(1)">1</button>'; if (sp > 2) h += '<span class="page-ellipsis">…</span>'; }
    for (let i = sp; i <= ep; i++) h += '<button class="page-btn' + (i === cp ? ' active' : '') + '" onclick="goToPage(' + i + ')">' + i + '</button>';
    if (ep < tp) { if (ep < tp - 1) h += '<span class="page-ellipsis">…</span>'; h += '<button class="page-btn" onclick="goToPage(' + tp + ')">' + tp + '</button>'; }
    h += '<button class="page-btn" ' + (cp >= tp ? 'disabled' : 'onclick="goToPage(' + (cp + 1) + ')"') + '>下一页</button>';
    h += '<span class="page-info">第 ' + cp + ' / ' + tp + ' 页，共 ' + formatFullNumber(STATE.allRepos.length) + ' 个项目</span>';
    return h;
}
function goToPage(p) {
    const tp = getTotalPages();
    if (p < 1 || p > tp || p === STATE.currentPage) return;
    STATE.currentPage = p; renderCurrentPage(); renderPagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
function renderCurrentPage() {
    const pr = getPageRepos();
    const sr = (STATE.currentPage - 1) * CONFIG.PAGE_SIZE;
    dom.repoGrid.innerHTML = pr.map((r, i) => renderRepoCard(r, sr + i + 1)).join('');
}

// ========== UI 状态 ==========
function showLoading() {
    dom.loading.style.display = 'flex'; dom.errorBox.style.display = 'none';
    dom.statsBar.style.display = 'none'; dom.repoGrid.innerHTML = '';
    dom.paginationTop.style.display = dom.paginationBottom.style.display = 'none';
}
function hideLoading() { dom.loading.style.display = 'none'; }
function showError(msg) {
    hideLoading(); dom.errorBox.style.display = 'flex'; dom.errorMsg.textContent = msg;
    dom.statsBar.style.display = 'none'; dom.repoGrid.innerHTML = '';
    dom.paginationTop.style.display = dom.paginationBottom.style.display = 'none';
}

// ========== 主流程 ==========
function init() {
    showLoading();
    try {
        if (!window.__REPO_DATA__ || !window.__REPO_DATA__.repos) {
            throw new Error('数据未加载，请确保 data.js 存在。运行 node fetch.js 生成。');
        }
        const data = window.__REPO_DATA__;
        const repos = data.repos;

        if (repos.length === 0) {
            hideLoading();
            dom.repoGrid.innerHTML = `<div class="empty-state">
                <svg viewBox="0 0 24 24" width="56" height="56" fill="#3fb950"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                <h3>暂未找到符合条件的项目</h3>
                <p>近一周暂未发现热门项目，请稍后再来查看。</p>
            </div>`;
            return;
        }

        STATE.allRepos = repos;
        STATE.currentPage = 1;

        hideLoading();
        updateStats(repos);
        renderCurrentPage();
        renderPagination();

        dom.lastUpdate.textContent = '数据更新：' + new Date(data.updated_at).toLocaleString('zh-CN');
    } catch (err) {
        showError('数据加载失败：' + err.message);
        console.error(err);
    }
}

document.addEventListener('DOMContentLoaded', init);

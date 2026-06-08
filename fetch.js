/**
 * GitHub 热门仓库定时抓取脚本
 * 搜索近一周创建、按星标降序、取 Top 9 + 抓取 README 简介
 * 由 GitHub Actions 每日凌晨 2 点执行
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG = {
    TOP_N: 9,
    README_MAX_CHARS: 300,
    OUTPUT_JSON: path.join(__dirname, 'data.json'),
    OUTPUT_JS: path.join(__dirname, 'data.js'),
};

function getDateRange() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
        start: weekAgo.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
    };
}

// ========== API 请求 ==========

function githubApi(apiPath) {
    return new Promise((resolve, reject) => {
        const url = new URL(apiPath, 'https://api.github.com');
        const opts = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'github-trending-fetcher/1.0',
            },
        };
        if (process.env.GITHUB_TOKEN) {
            opts.headers['Authorization'] = 'token ' + process.env.GITHUB_TOKEN;
        }
        https.get(opts, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); }
                catch (e) { reject(new Error('JSON 解析失败: ' + e.message)); }
            });
        }).on('error', reject);
    });
}

async function searchRepos(query, page = 1) {
    const params = new URLSearchParams({
        q: query, sort: 'stars', order: 'desc',
        per_page: '100', page: String(page),
    });
    return githubApi('/search/repositories?' + params.toString());
}

// 获取 README（返回纯文本，截取前 N 字）
async function fetchReadme(fullName) {
    try {
        const data = await githubApi('/repos/' + fullName + '/readme');
        // data.content 是 base64 编码的
        const buf = Buffer.from(data.content, 'base64');
        let text = buf.toString('utf-8');
        // 去掉 Markdown 标记，尽量纯文本
        text = text
            .replace(/#{1,6}\s/g, '')
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/\[(.+?)\]\(.+?\)/g, '$1')
            .replace(/!\[.*?\]\(.+?\)/g, '')
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`(.+?)`/g, '$1')
            .replace(/<[^>]+>/g, '')
            .replace(/\n{2,}/g, '\n')
            .trim();
        return text.slice(0, CONFIG.README_MAX_CHARS);
    } catch (e) {
        console.log('[fetch] README 获取失败 ' + fullName + ': ' + e.message);
        return '';
    }
}

// ========== 主流程 ==========

async function main() {
    const { start } = getDateRange();
    const query = `created:>${start}`;
    console.log('[fetch] 搜索查询:', query);
    console.log('[fetch] 时间:', new Date().toISOString());

    let allItems = [];
    let totalCount = 0;
    const maxPages = 10;

    for (let page = 1; page <= maxPages; page++) {
        const data = await searchRepos(query, page);
        console.log(`[fetch] 第 ${page} 页: items=${data.items?.length}, total=${data.total_count}`);

        if (page === 1) {
            totalCount = data.total_count;
            if (totalCount === 0) { console.log('[fetch] 无符合条件的仓库'); break; }
        }
        if (!data.items || data.items.length === 0) break;
        allItems = allItems.concat(data.items);
        if (allItems.length >= totalCount || data.items.length < 100) break;
    }

    // 按星标降序，取 Top N
    allItems.sort((a, b) => b.stargazers_count - a.stargazers_count);
    const topItems = allItems.slice(0, CONFIG.TOP_N);

    console.log(`[fetch] 共 ${allItems.length} 个仓库，取 Top ${CONFIG.TOP_N}，开始抓取 README…`);

    // 逐个抓取 README
    const output = [];
    for (let i = 0; i < topItems.length; i++) {
        const repo = topItems[i];
        console.log(`[fetch] [${i + 1}/${topItems.length}] ${repo.full_name}`);
        const readme = await fetchReadme(repo.full_name);
        output.push({
            id: repo.id,
            full_name: repo.full_name,
            name: repo.name,
            owner: {
                login: repo.owner.login,
                avatar_url: repo.owner.avatar_url,
            },
            html_url: repo.html_url,
            description: repo.description,
            language: repo.language,
            stargazers_count: repo.stargazers_count,
            forks_count: repo.forks_count,
            open_issues_count: repo.open_issues_count,
            topics: repo.topics || [],
            created_at: repo.created_at,
            updated_at: repo.updated_at,
            license: repo.license ? { spdx_id: repo.license.spdx_id, key: repo.license.key } : null,
            readme_snippet: readme,
        });
    }

    const result = {
        updated_at: new Date().toISOString(),
        query_date_range: `${start} ~ ${new Date().toISOString().split('T')[0]}`,
        min_stars: CONFIG.MIN_STARS,
        total_found: totalCount,
        count: output.length,
        repos: output,
    };

    fs.writeFileSync(CONFIG.OUTPUT_JSON, JSON.stringify(result, null, 2), 'utf-8');
    fs.writeFileSync(CONFIG.OUTPUT_JS, 'window.__REPO_DATA__ = ' + JSON.stringify(result) + ';', 'utf-8');
    console.log(`[fetch] 完成！共 ${output.length} 个仓库`);
    console.log(`[fetch] JSON -> ${CONFIG.OUTPUT_JSON}`);
    console.log(`[fetch] JS   -> ${CONFIG.OUTPUT_JS}`);
}

main().catch(err => {
    console.error('[fetch] 错误:', err.message);
    process.exit(1);
});

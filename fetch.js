/**
 * GitHub 热门仓库定时抓取脚本
 * 用法：node fetch.js
 * 定时：每天凌晨 2 点执行（配合系统任务/cron）
 *
 * 搜索条件：近一周创建、星标 >= 5000，取 Top 21
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ========== 配置 ==========
const CONFIG = {
    MIN_STARS: 5000,
    TOP_N: 21,
    OUTPUT: path.join(__dirname, 'data.json'),
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

function githubApi(path) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, 'https://api.github.com');
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'github-trending-fetcher/1.0',
            },
        };
        // 如有 Token 可通过环境变量传入
        if (process.env.GITHUB_TOKEN) {
            options.headers['Authorization'] = 'token ' + process.env.GITHUB_TOKEN;
        }

        https.get(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error('JSON 解析失败: ' + e.message));
                }
            });
        }).on('error', reject);
    });
}

async function searchRepos(query, page = 1) {
    const params = new URLSearchParams({
        q: query,
        sort: 'stars',
        order: 'desc',
        per_page: '100',
        page: String(page),
    });
    return githubApi('/search/repositories?' + params.toString());
}

// ========== 主流程 ==========

async function main() {
    const { start } = getDateRange();
    const query = `created:>${start} stars:>${CONFIG.MIN_STARS}`;
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
            if (totalCount === 0) {
                console.log('[fetch] 无符合条件的仓库');
                break;
            }
        }

        if (!data.items || data.items.length === 0) break;
        allItems = allItems.concat(data.items);

        if (allItems.length >= totalCount || data.items.length < 100) break;
    }

    // 按星标降序，取 Top N
    allItems.sort((a, b) => b.stargazers_count - a.stargazers_count);
    const topItems = allItems.slice(0, CONFIG.TOP_N);

    // 精简数据，只保留前端需要的字段
    const output = topItems.map(repo => ({
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
    }));

    const result = {
        updated_at: new Date().toISOString(),
        query_date_range: `${start} ~ ${new Date().toISOString().split('T')[0]}`,
        min_stars: CONFIG.MIN_STARS,
        total_found: totalCount,
        count: output.length,
        repos: output,
    };

    fs.writeFileSync(CONFIG.OUTPUT, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`[fetch] 完成！共 ${output.length} 个仓库写入 ${CONFIG.OUTPUT}`);
    console.log(`[fetch] 更新时间: ${result.updated_at}`);
}

main().catch(err => {
    console.error('[fetch] 错误:', err.message);
    process.exit(1);
});

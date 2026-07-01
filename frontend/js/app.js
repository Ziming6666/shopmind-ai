// ═══════════════════════════════════════════════════════════
// ShopMind AI — 前端应用主逻辑
// ═══════════════════════════════════════════════════════════

var API_BASE = '/api';

// ── DOM Elements ────────────────────────────────────────────
var dom = {};
function cacheDOMElements() {
    dom.chatMessages = document.getElementById('chatMessages');
    dom.chatInput = document.getElementById('chatInput');
    dom.btnSend = document.getElementById('btnSend');
    dom.quickQuestions = document.getElementById('quickQuestions');
    dom.productsGrid = document.getElementById('productsGrid');
    dom.filterCategory = document.getElementById('filterCategory');
    dom.filterBrand = document.getElementById('filterBrand');
    dom.productSearch = document.getElementById('productSearch');
    dom.statsCards = document.getElementById('statsCards');
    dom.topSellers = document.getElementById('topSellers');
    dom.categoryChart = document.getElementById('categoryChart');
    dom.sidebarProduct = document.getElementById('sidebarProduct');
    dom.toast = document.getElementById('toast');
}

// ── Toast ────────────────────────────────────────────────────
function showToast(msg, type) {
    if (!type) type = '';
    dom.toast.textContent = msg;
    dom.toast.className = 'toast ' + type;
    dom.toast.classList.add('show');
    clearTimeout(dom.toast._timer);
    dom.toast._timer = setTimeout(function() {
        dom.toast.classList.remove('show');
    }, 3000);
}

// ── Tab Switching ───────────────────────────────────────────
document.querySelectorAll('.nav-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.nav-tab').forEach(function(t) { t.classList.remove('active'); });
        document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
});

// ═══════════════════════════════════════════════════════════
// 1. 智能助手 - Chat
// ═══════════════════════════════════════════════════════════

var conversationId = '';

function sendMessage(query) {
    if (!query.trim()) return;
    addMessage(query, 'user');
    dom.chatInput.value = '';

    // 创建 AI 消息框，用变量引用而不是 ID
    var aiMsgDiv = document.createElement('div');
    aiMsgDiv.className = 'message message-ai';
    var avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.textContent = '🤖';
    aiMsgDiv.appendChild(avatarDiv);
    var contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    aiMsgDiv.appendChild(contentDiv);
    dom.chatMessages.appendChild(aiMsgDiv);
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;

    var contentEl = contentDiv;
    var fullAnswer = '';

    fetch(API_BASE + '/agent/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query: query,
            user: 'shopmind-user',
            conversation_id: conversationId,
        }),
    })
    .then(function(resp) {
        if (!resp.ok) throw new Error('API不可达');
        var reader = resp.body.getReader();
        var decoder = new TextDecoder();
        var buffer = '';

        function readChunk() {
            reader.read().then(function(result) {
                if (result.done) {
                    contentEl.innerHTML = marked(fullAnswer);
                    return;
                }
                buffer += decoder.decode(result.value, { stream: true });
                var lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i].trim();
                    if (line.startsWith('data: ')) {
                        try {
                            var data = JSON.parse(line.slice(6));
                            if (data.type === 'answer') {
                                fullAnswer += data.content;
                                contentEl.innerHTML = marked(fullAnswer) + '<span class="cursor-blink">|</span>';
                                dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
                            } else if (data.type === 'end') {
                                conversationId = data.conversation_id || '';
                                contentEl.innerHTML = marked(fullAnswer);
                            } else if (data.type === 'error') {
                                contentEl.innerHTML = '❌ ' + data.content;
                            }
                        } catch(e) {}
                    }
                }
                readChunk();
            }).catch(function() {
                fallbackToLocal(query, aiMsgDiv);
            });
        }
        readChunk();
    })
    .catch(function() {
        fallbackToLocal(query, aiMsgDiv);
    });
}

function fallbackToLocal(query, aiMsgDiv) {
    aiMsgDiv.remove();
    removeTyping();
    handleLocalResponse(query);
}

function handleLocalResponse(query) {
    var q = query.toLowerCase();
    var answer = '';

    if (q.indexOf('笔记本') !== -1 || q.indexOf('电脑') !== -1 || q === '本') {
        if (q.indexOf('学生') !== -1 || q.indexOf('便宜') !== -1 || q.indexOf('性价比') !== -1 || q.indexOf('5000') !== -1) {
            answer = '根据你的需求，为你推荐两款高性价比笔记本：\n\n'
                + '**1\uFE0F\u20E3 联想小新Pro 14** \u2014 \uFFE54,999\n'
                + '\u2022 i5-13500H / 16GB / 512GB\n'
                + '\u2022 1.3kg超轻薄，2.8K高色域屏\n'
                + '\u2022 适合学生和办公人群\n\n'
                + '**2\uFE0F\u20E3 小米RedmiBook 16** \u2014 \uFFE53,999\n'
                + '\u2022 i5-12450H / 16GB / 512GB\n'
                + '\u2022 16英寸大屏，性价比之王\n\n'
                + '你是主要用来学习办公还是玩游戏呢？我帮你进一步筛选';
        } else if (q.indexOf('高端') !== -1 || q.indexOf('创作') !== -1 || q.indexOf('专业') !== -1) {
            answer = '为你推荐这款专业创作本：\n\n'
                + '**戴尔XPS 15** \u2014 \uFFE512,999\n'
                + '\u2022 i7-13700H / 32GB / 1TB SSD\n'
                + '\u2022 3.5K OLED触控屏\n'
                + '\u2022 适合专业创作者和开发者\n\n'
                + '目前有12期免息活动，需要了解更多吗？';
        } else {
            answer = '为你推荐以下热门笔记本：\n\n'
                + '**\u2460 联想小新Pro 14** \uFFE54,999 \u2014 轻薄高性能\n'
                + '**\u2461 华为MateBook 14** \uFFE55,699 \u2014 触控屏办公\n'
                + '**\u2462 MacBook Air M3** \uFFE58,999 \u2014 长续航创作\n\n'
                + '你的预算大概是多少？我帮你精准推荐';
        }
    } else if (q.indexOf('手机') !== -1) {
        answer = '目前热销手机推荐：\n\n'
            + '**iPhone 15 Pro Max** \uFFE59,999\n'
            + '   A17 Pro芯片 \u00B7 4800万三摄 \u00B7 钛金属\n\n'
            + '**华为P60 Pro** \uFFE56,988\n'
            + '   XMAGE影像 \u00B7 北斗卫星消息\n\n'
            + '**小米14 Ultra** \uFFE55,999\n'
            + '   骁龙8 Gen3 \u00B7 徕卡四摄\n\n'
            + '你对哪个感兴趣？我帮你详细对比';
    } else if (q.indexOf('退货') !== -1 || q.indexOf('退款') !== -1 || q.indexOf('售后') !== -1) {
        answer = '关于退换货政策：\n\n'
            + '**退货流程**\n'
            + '\u2460 登录账号 \u2192 我的订单 \u2192 申请售后\n'
            + '\u2461 选择退货原因，上传凭证\n'
            + '\u2462 审核通过后，上门取件\n'
            + '\u2463 验收通过后，退款原路返回\n\n'
            + '**时效说明**\n'
            + '\u2022 支持7天无理由退货\n'
            + '\u2022 退款到账时间：1-3个工作日\n\n'
            + '还有什么需要了解的吗？';
    } else if (q.indexOf('耳机') !== -1) {
        answer = '耳机推荐：\n\n'
            + '**Sony WH-1000XM5** \u2014 \uFFE52,499\n'
            + '\u2022 顶级降噪 \u00B7 30小时续航\n\n'
            + '**AirPods Pro 2** \u2014 \uFFE51,899\n'
            + '\u2022 H2芯片 \u00B7 空间音频\n\n'
            + '你更看重降噪效果还是便携性？';
    } else if (q.indexOf('订单') !== -1 || q.indexOf('物流') !== -1 || q.indexOf('快递') !== -1) {
        answer = '订单查询功能需要连接电商系统后使用。\n\n'
            + '目前你可以：\n'
            + '\u2022 提供订单号，我帮你查询状态\n'
            + '\u2022 咨询一般物流政策\n\n'
            + '请问你的订单号是多少？';
    } else if (q.indexOf('你好') !== -1 || q.indexOf('hi') !== -1 || q.indexOf('在吗') !== -1) {
        answer = '你好！我是 ShopMind AI 智能助手，7\u00D724小时在线。\n\n'
            + '我可以帮你：\n'
            + '  \uD83D\uDD0D 推荐商品\n'
            + '  \uD83D\uDCAC 咨询商品详情\n'
            + '  \uD83D\uDCE6 查询订单状态\n'
            + '  \uD83D\uDD04 了解售后政策\n\n'
            + '今天有什么可以帮你的？';
    } else {
        answer = '感谢你的提问！\n\n'
            + '我目前可以帮你：\n'
            + '  \uD83D\uDED2 商品推荐 - 告诉我预算和用途\n'
            + '  \uD83D\uDCCB 商品咨询 - 规格、价格、库存\n'
            + '  \uD83D\uDD04 售后政策 - 退换货、退款\n'
            + '  \uD83D\uDCE6 订单查询 - 物流状态\n\n'
            + '试试说"推荐一款笔记本"或"怎么退货"？';
    }

    addMessage(answer, 'ai');
}

function addMessage(content, role) {
    var div = document.createElement('div');
    div.className = 'message message-' + role;
    var avatar = role === 'ai' ? '\uD83E\uDD16' : '\uD83D\uDC64';
    div.innerHTML = '<div class="message-avatar">' + avatar + '</div>'
        + '<div class="message-content">' + marked(content) + '</div>';
    dom.chatMessages.appendChild(div);
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
}

function showTyping() {
    var div = document.createElement('div');
    div.className = 'message message-ai';
    div.id = 'typingIndicator';
    div.innerHTML = '<div class="message-avatar">\uD83E\uDD16</div>'
        + '<div class="message-content"><div class="typing-indicator">'
        + '<span></span><span></span><span></span></div></div>';
    dom.chatMessages.appendChild(div);
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
}

function removeTyping() {
    var el = document.getElementById('typingIndicator');
    if (el) el.remove();
}

function marked(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}

// ── Chat Events ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    cacheDOMElements();

    dom.btnSend.addEventListener('click', function() { sendMessage(dom.chatInput.value); });
    dom.chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(dom.chatInput.value);
        }
    });
    dom.quickQuestions.addEventListener('click', function(e) {
        var btn = e.target.closest('.quick-btn');
        if (btn) sendMessage(btn.dataset.query);
    });

    dom.filterCategory.addEventListener('change', filterProducts);
    dom.filterBrand.addEventListener('change', filterProducts);
    dom.productSearch.addEventListener('input', filterProducts);

    // 评论分析按钮事件
    var btnAnalyze = document.getElementById('btnAnalyze');
    var btnSample = document.getElementById('btnSampleReviews');
    var textarea = document.getElementById('reviewInput');
    if (btnAnalyze) {
        btnAnalyze.addEventListener('click', runReviewAnalysis);
    }
    if (btnSample) {
        btnSample.addEventListener('click', function() {
            textarea.value = JSON.stringify(getSampleReviews(), null, 2);
            showToast('已加载示例数据，点击"开始分析"运行', 'success');
        });
    }

    // 加载数据
    loadProducts();
    loadAnalytics();
    showToast('欢迎使用 ShopMind AI 智能助手！', 'success');
});

// ═══════════════════════════════════════════════════════════
// 2. 商品浏览
// ═══════════════════════════════════════════════════════════

var allProducts = [];

function loadProducts() {
    dom.productsGrid.innerHTML = '<div class="loading-spinner">加载商品中...</div>';
    fetch(API_BASE + '/analytics/products')
    .then(function(resp) {
        if (!resp.ok) throw new Error('API不可达');
        return resp.json();
    })
    .then(function(data) {
        allProducts = data.data || [];
        renderProducts(allProducts);
        populateBrandFilter();
        updateSidebarProduct();
    })
    .catch(function() {
        allProducts = getEmbeddedProducts();
        renderProducts(allProducts);
        populateBrandFilter();
        updateSidebarProduct();
    });
}

function renderProducts(products) {
    if (!products.length) {
        dom.productsGrid.innerHTML = '<div class="loading-spinner">暂无商品数据</div>';
        return;
    }
    var html = '';
    for (var i = 0; i < products.length; i++) {
        var p = products[i];
        var stars = '';
        for (var s = 0; s < Math.floor(p.rating); s++) stars += '\u2605';
        if (p.rating % 1 >= 0.5) stars += '\u00BD';
        var tags = '';
        for (var t = 0; t < (p.tags || []).length; t++) {
            tags += '<span class="product-card-tag">' + p.tags[t] + '</span>';
        }
        html += '<div class="product-card">'
            + '<div class="product-card-header"><div class="product-card-name">' + p.name + '</div>'
            + '<span class="product-card-brand">' + p.brand + '</span></div>'
            + '<div class="product-card-price"><span class="price-symbol">\uFFE5</span>' + p.price.toLocaleString() + '</div>'
            + '<div class="product-card-rating">' + stars + '<span style="color:var(--gray-400);margin-left:4px">' + p.rating + '</span></div>'
            + '<div class="product-card-sales">已售 ' + p.sales.toLocaleString() + '</div>'
            + '<div class="product-card-tags">' + tags + '</div>'
            + '<div class="product-card-desc">' + (p.description || '') + '</div>'
            + '</div>';
    }
    dom.productsGrid.innerHTML = html;
}

function populateBrandFilter() {
    var brands = [];
    for (var i = 0; i < allProducts.length; i++) {
        if (brands.indexOf(allProducts[i].brand) === -1) brands.push(allProducts[i].brand);
    }
    var opts = '<option value="">全部品牌</option>';
    for (var b = 0; b < brands.length; b++) {
        opts += '<option value="' + brands[b] + '">' + brands[b] + '</option>';
    }
    dom.filterBrand.innerHTML = opts;
}

function filterProducts() {
    var cat = dom.filterCategory.value;
    var brand = dom.filterBrand.value;
    var search = dom.productSearch.value.toLowerCase();
    var filtered = [];
    for (var i = 0; i < allProducts.length; i++) {
        var p = allProducts[i];
        if (cat && p.category !== cat) continue;
        if (brand && p.brand !== brand) continue;
        if (search && p.name.toLowerCase().indexOf(search) === -1) continue;
        filtered.push(p);
    }
    renderProducts(filtered);
}

function updateSidebarProduct() {
    if (!allProducts.length) {
        dom.sidebarProduct.innerHTML = '<p class="loading-text">暂无推荐</p>';
        return;
    }
    var sorted = allProducts.slice().sort(function(a, b) { return b.sales - a.sales; });
    var top = sorted[0];
    dom.sidebarProduct.innerHTML = '<div class="product-mini-card">'
        + '<div class="product-mini-img">\uD83D\uDCE6</div>'
        + '<div class="product-mini-info"><div class="product-mini-name">' + top.name + '</div>'
        + '<div class="product-mini-price">\uFFE5' + top.price.toLocaleString() + '</div></div></div>'
        + '<p style="font-size:12px;color:var(--gray-400);margin-top:8px">'
        + '\u2B50 ' + top.rating + ' \u00B7 已售 ' + top.sales.toLocaleString() + '</p>';
}

// ═══════════════════════════════════════════════════════════
// 3. 运营看板
// ═══════════════════════════════════════════════════════════

function loadAnalytics() {
    fetch(API_BASE + '/analytics/stats')
    .then(function(resp) {
        if (!resp.ok) throw new Error('API不可达');
        return resp.json();
    })
    .then(function(data) {
        renderStats(data.data);
    })
    .catch(function() {
        var products = allProducts.length ? allProducts : getEmbeddedProducts();
        renderLocalStats(products);
    });
}

function renderStats(stats) {
    if (!stats) return;
    var brandCount = 0;
    for (var k in stats.brand_distribution) brandCount++;

    var statCards = document.querySelectorAll('.stat-card');
    statCards[0].querySelector('.stat-value').textContent = stats.total_products || 0;
    statCards[1].querySelector('.stat-value').textContent = (stats.total_sales || 0).toLocaleString();
    statCards[2].querySelector('.stat-value').textContent = stats.avg_rating || 0;
    statCards[3].querySelector('.stat-value').textContent = brandCount;

    if (stats.top_sellers) {
        var html = '';
        for (var i = 0; i < stats.top_sellers.length; i++) {
            var rc = i === 0 ? 'top-rank-1' : i === 1 ? 'top-rank-2' : i === 2 ? 'top-rank-3' : '';
            html += '<div class="top-item">'
                + '<div class="top-rank ' + rc + '">' + (i + 1) + '</div>'
                + '<span class="top-item-name">' + stats.top_sellers[i].name + '</span>'
                + '<span class="top-item-sales">已售 ' + stats.top_sellers[i].sales.toLocaleString() + '</span>'
                + '</div>';
        }
        dom.topSellers.innerHTML = html;
    }

    if (stats.category_distribution) {
        renderCategoryChart(stats.category_distribution);
    }
}

function renderLocalStats(products) {
    var totalSales = 0, totalRating = 0, brandSet = {}, catDist = {};
    for (var i = 0; i < products.length; i++) {
        totalSales += products[i].sales;
        totalRating += products[i].rating;
        brandSet[products[i].brand] = true;
        catDist[products[i].category] = (catDist[products[i].category] || 0) + 1;
    }
    var avgRating = (totalRating / products.length).toFixed(1);
    var brandCount = 0;
    for (var b in brandSet) brandCount++;

    var statCards = document.querySelectorAll('.stat-card');
    statCards[0].querySelector('.stat-value').textContent = products.length;
    statCards[1].querySelector('.stat-value').textContent = totalSales.toLocaleString();
    statCards[2].querySelector('.stat-value').textContent = avgRating;
    statCards[3].querySelector('.stat-value').textContent = brandCount;

    var sorted = products.slice().sort(function(a, b) { return b.sales - a.sales; });
    var top5 = sorted.slice(0, 5);
    var html = '';
    for (var i = 0; i < top5.length; i++) {
        var rc = i === 0 ? 'top-rank-1' : i === 1 ? 'top-rank-2' : i === 2 ? 'top-rank-3' : '';
        html += '<div class="top-item">'
            + '<div class="top-rank ' + rc + '">' + (i + 1) + '</div>'
            + '<span class="top-item-name">' + top5[i].name + '</span>'
            + '<span class="top-item-sales">已售 ' + top5[i].sales.toLocaleString() + '</span>'
            + '</div>';
    }
    dom.topSellers.innerHTML = html;
    renderCategoryChart(catDist);
}

function renderCategoryChart(dist) {
    var entries = [];
    for (var k in dist) entries.push([k, dist[k]]);
    entries.sort(function(a, b) { return b[1] - a[1]; });
    var maxVal = 0;
    for (var i = 0; i < entries.length; i++) if (entries[i][1] > maxVal) maxVal = entries[i][1];
    var html = '';
    for (var i = 0; i < entries.length; i++) {
        var pct = maxVal > 0 ? (entries[i][1] / maxVal) * 100 : 0;
        html += '<div class="chart-bar-wrapper">'
            + '<div class="chart-bar" style="height: ' + pct + '%"></div>'
            + '<span class="chart-bar-label">' + entries[i][0] + '</span></div>';
    }
    dom.categoryChart.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════
// 4. 评论分析（运营工具）
// ═══════════════════════════════════════════════════════════

function getSampleReviews() {
    return [
        {"id":"R001","product_id":"P001","content":"笔记本质量很好，运行速度快，物流也很快！好评","rating":5,"date":"2024-01-15"},
        {"id":"R002","product_id":"P001","content":"包装有破损，但产品本身没问题，物流太慢了","rating":3,"date":"2024-01-14"},
        {"id":"R003","product_id":"P002","content":"非常不满意，收到就坏了，客服态度差","rating":1,"date":"2024-01-13"}
    ];
}

function runReviewAnalysis() {
    var textarea = document.getElementById('reviewInput');
    var statusEl = document.getElementById('analyzeStatus');
    var resultEl = document.getElementById('reviewResult');
    var statusText = textarea.value.trim();

    if (!statusText) {
        showToast('请先输入评论数据', 'error');
        return;
    }

    var reviews;
    try {
        reviews = JSON.parse(statusText);
        if (!Array.isArray(reviews)) throw new Error('必须是数组');
    } catch (e) {
        showToast('JSON格式错误，请检查输入', 'error');
        return;
    }

    statusEl.textContent = '⏳ 正在分析...';
    resultEl.style.display = 'none';

    fetch(API_BASE + '/workflow/analyze-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews: reviews }),
    })
    .then(function(resp) {
        if (!resp.ok) throw new Error('API不可达');
        return resp.json();
    })
    .then(function(data) {
        statusEl.textContent = '✅ 分析完成';
        displayReviewResult(data);
    })
    .catch(function(err) {
        statusEl.textContent = '❌ 分析失败：' + err.message;
        showToast('评论分析失败：' + err.message, 'error');
    });
}

function displayReviewResult(data) {
    var resultEl = document.getElementById('reviewResult');
    var summaryEl = document.getElementById('reviewSummary');
    var keywordsEl = document.getElementById('reviewKeywords');
    var reportEl = document.getElementById('reviewReport');

    var result = data.result || data.data || {};

    // Extract report text - try different possible response formats
    var reportText = result.result || result.report || result.text || result.output || '';
    var reportDate = result.report_date || '';
    var status = data.status || result.status || '';

    // Display summary
    var summaryHtml = '';
    if (result.summary) {
        summaryHtml += '<div><strong>总评论数：</strong>' + (result.summary.total_reviews || '-') + '</div>';
        if (result.summary.sentiment_distribution) {
            var sd = typeof result.summary.sentiment_distribution === 'string'
                ? result.summary.sentiment_distribution
                : JSON.stringify(result.summary.sentiment_distribution);
            summaryHtml += '<div><strong>情感分布：</strong>' + sd + '</div>';
        }
    }
    if (reportDate) {
        summaryHtml += '<div><strong>分析时间：</strong>' + reportDate + '</div>';
    }
    if (status) {
        summaryHtml += '<div><strong>状态：</strong>' + status + '</div>';
    }
    summaryEl.innerHTML = summaryHtml || '<div>暂无摘要数据</div>';

    // Display keywords
    var kwHtml = '';
    if (result.summary && result.summary.keywords) {
        var kw = result.summary.keywords;
        if (kw.positive_keywords && kw.positive_keywords.length) {
            kwHtml += '<div style="color:var(--success);"><strong>👍 好评关键词：</strong><br>';
            kw.positive_keywords.forEach(function(k) {
                kwHtml += '  <span style="background:#d1fae5;padding:2px 10px;border-radius:10px;margin:2px;display:inline-block;">' + k.word + ' (' + k.count + '次)</span>';
            });
            kwHtml += '</div>';
        }
        if (kw.negative_keywords && kw.negative_keywords.length) {
            kwHtml += '<div style="color:var(--danger);margin-top:8px;"><strong>👎 负面关键词：</strong><br>';
            kw.negative_keywords.forEach(function(k) {
                kwHtml += '  <span style="background:#fee2e2;padding:2px 10px;border-radius:10px;margin:2px;display:inline-block;">' + k.word + ' (' + k.count + '次)</span>';
            });
            kwHtml += '</div>';
        }
    }
    keywordsEl.innerHTML = kwHtml || '<div>暂无关键词数据</div>';

    // Display report
    if (reportText) {
        reportEl.textContent = reportText;
    } else {
        // Fallback: try to render the whole result
        reportEl.textContent = JSON.stringify(result, null, 2);
    }

    resultEl.style.display = 'block';
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ═══════════════════════════════════════════════════════════
// 5. 内置示例数据
// ═══════════════════════════════════════════════════════════

function getEmbeddedProducts() {
    return [
        {id:"P001", name:"联想小新Pro 14", category:"笔记本电脑", price:4999, brand:"联想", rating:4.7, sales:15200, tags:["轻薄本","学生","办公"], description:"联想小新Pro 14，1.3kg超轻薄，2.8K屏。"},
        {id:"P002", name:"华为MateBook 14", category:"笔记本电脑", price:5699, brand:"华为", rating:4.8, sales:9800, tags:["轻薄本","商务","触控屏"], description:"华为MateBook 14，2K触控全面屏。"},
        {id:"P003", name:"MacBook Air M3", category:"笔记本电脑", price:8999, brand:"Apple", rating:4.9, sales:23100, tags:["轻薄本","长续航","创作"], description:"MacBook Air M3，18小时续航。"},
        {id:"P004", name:"小米RedmiBook 16", category:"笔记本电脑", price:3999, brand:"小米", rating:4.5, sales:32100, tags:["性价比","大屏","学生"], description:"RedmiBook 16，性价比之王。"},
        {id:"P005", name:"iPhone 15 Pro Max", category:"手机", price:9999, brand:"Apple", rating:4.8, sales:45200, tags:["旗舰","拍照","苹果"], description:"iPhone 15 Pro Max，A17 Pro芯片。"},
        {id:"P006", name:"华为P60 Pro", category:"手机", price:6988, brand:"华为", rating:4.7, sales:18700, tags:["旗舰","拍照","长续航"], description:"华为P60 Pro，XMAGE影像。"},
        {id:"P007", name:"小米14 Ultra", category:"手机", price:5999, brand:"小米", rating:4.6, sales:26500, tags:["旗舰","拍照","性价比"], description:"小米14 Ultra，骁龙8 Gen3。"},
        {id:"P008", name:"Sony WH-1000XM5", category:"耳机", price:2499, brand:"Sony", rating:4.9, sales:38500, tags:["降噪","头戴式"], description:"Sony 顶级降噪耳机，30小时续航。"},
        {id:"P009", name:"AirPods Pro 2", category:"耳机", price:1899, brand:"Apple", rating:4.8, sales:52100, tags:["降噪","便携","TWS"], description:"AirPods Pro 2，H2芯片。"},
        {id:"P010", name:"戴尔XPS 15", category:"笔记本电脑", price:12999, brand:"戴尔", rating:4.6, sales:6700, tags:["高端","创作"], description:"戴尔XPS 15，3.5K OLED触控屏。"}
    ];
}


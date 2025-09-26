// 基础交互脚本（无框架 SPA 风格）
const SIMPLE_MODE = false; // 简洁模式：隐藏高级筛选/分页/详情路由，仅展示精选内容

// 工具函数
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// 头部滚动背景变化
const siteHeader = $('#siteHeader');
const onScrollHeader = () => {
  if (window.scrollY > 10) siteHeader.classList.add('scrolled');
  else siteHeader.classList.remove('scrolled');
};
window.addEventListener('scroll', onScrollHeader);
onScrollHeader();

// 简洁模式：在 <body> 上标记样式钩子
if (SIMPLE_MODE) document.body.classList.add('simple');

// 页面滚动进度条
const scrollBar = document.getElementById('scrollProgress');
let ticking = false;
const onScrollProgress = () => {
  if (!scrollBar) return;
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop || 0;
    const scrollHeight = (document.documentElement.scrollHeight || document.body.scrollHeight) - window.innerHeight;
    const ratio = scrollHeight > 0 ? Math.min(1, Math.max(0, scrollTop / scrollHeight)) : 0;
    scrollBar.style.width = (ratio * 100).toFixed(2) + '%';
    ticking = false;
  });
};
window.addEventListener('scroll', onScrollProgress, { passive: true });
onScrollProgress();

// 平滑滚动和激活导航
const isDetailVisible = () => detailView && !detailView.hidden;

$$('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href') || '';
    if (!href.startsWith('#')) return; // 非锚点，交给默认
    // 若在详情视图，先切回首页
    if (isDetailVisible()) {
      e.preventDefault();
      location.hash = (href === '#home' || href === '#') ? '#' : href;
      if (!SIMPLE_MODE) router();
      // 切回首页后再平滑滚动目标
      setTimeout(() => { const t = $(href); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 0);
      return;
    }
    const target = $(href);
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    // 兜底：特殊锚点如 #ai 打开聊天
    if (href === '#ai') {
      e.preventDefault();
      if (typeof openChat === 'function') openChat();
      return;
    }
    // 找不到目标则不阻止默认，交由浏览器处理 hash（避免“无反应”）
  });
});

// 为页脚与移动端内的锚点也提供平滑滚动
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const href = a.getAttribute('href') || '';
  if (isDetailVisible()) {
    e.preventDefault();
    location.hash = (href === '#home' || href === '#') ? '#' : href;
    if (!SIMPLE_MODE) router();
    setTimeout(() => { const t = $(href); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 0);
    return;
  }
  if (href === '#ai') { e.preventDefault(); if (typeof openChat === 'function') openChat(); return; }
  // 页脚 A-Z 索引跳转到对应字母
  if (a.closest('.az-links')) {
    e.preventDefault();
    const letter = (a.textContent || '').trim().toUpperCase();
    if (letter) {
      currentAlpha = letter === 'ALL' ? 'ALL' : letter;
      currentPage = 1;
      updateOverview();
      const overview = $('#overview');
      if (overview) overview.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
  }
  // 移动端 A-Z（.az-mobile）点击字母筛选并滚动
  if (a.closest('.az-mobile')) {
    e.preventDefault();
    const letter = (a.textContent || '').trim().toUpperCase();
    if (letter) {
      currentAlpha = letter === 'ALL' ? 'ALL' : letter;
      currentPage = 1;
      updateOverview();
      const overview = '#overview';
      const targetEl = $(overview);
      if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // 若在移动导航中，关闭抽屉
      if (mobileNav && mobileNav.classList.contains('open')) {
        mobileNav.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
      return;
    }
  }
  const target = $(href);
  if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
});

// 语言切换（占位行为）
// 语言切换已移除

// 移动端汉堡菜单
const hamburger = $('#hamburger');
const mobileNav = $('#mobileNav');
hamburger.addEventListener('click', () => {
  const open = mobileNav.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', String(open));
});
mobileNav.addEventListener('click', e => {
  const a = e.target.closest('a');
  if (a && a.getAttribute('href')?.startsWith('#')) {
    mobileNav.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  }
});

// Banner 轮播（淡入淡出 + 自动播放 + 手动控制）
const slides = $$('#bannerSlides .slide');
const prevBtn = $('#bannerPrev');
const nextBtn = $('#bannerNext');
let currentIndex = 0;
let autoTimer = null;

function showSlide(index) {
  slides.forEach((s, i) => s.classList.toggle('active', i === index));
}
function nextSlide() { currentIndex = (currentIndex + 1) % slides.length; showSlide(currentIndex); }
function prevSlide() { currentIndex = (currentIndex - 1 + slides.length) % slides.length; showSlide(currentIndex); }
function startAuto() { autoTimer = setInterval(nextSlide, 5000); }
function stopAuto() { if (autoTimer) clearInterval(autoTimer); }

nextBtn.addEventListener('click', () => { stopAuto(); nextSlide(); startAuto(); });
prevBtn.addEventListener('click', () => { stopAuto(); prevSlide(); startAuto(); });
// 让横幅 CTA 跳转到与图片对应的民族详情
function resolveSlugFromSlide(slideEl) {
  // 优先 data-slug
  const ds = (slideEl.getAttribute('data-slug') || '').toLowerCase();
  if (ds) return ds;
  // 尝试从标题提取民族名称（如“傣族…”，“蒙古族…”，“苗族…”）
  const titleEl = $('.slide-title', slideEl);
  const title = titleEl ? (titleEl.textContent || '') : '';
  const m = title.match(/([\u4e00-\u9fa5]{1,6}族)/);
  const name = m ? m[1] : '';
  if (!name) return '';
  const match = ETHNIC_LIST.find(e => e.name === name);
  if (!match) return '';
  return String(match.pinyin || '').toLowerCase();
}


showSlide(0); startAuto();

// 视差：随滚动轻微位移当前横幅图片
const banner = document.querySelector('.banner');
let rafParallax = false;
const parallax = () => {
  if (!banner) return;
  if (rafParallax) return;
  rafParallax = true;
  requestAnimationFrame(() => {
    const active = banner.querySelector('.slide.active img');
    if (active) {
      const rect = banner.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const viewportCenter = window.innerHeight / 2;
      const delta = Math.max(-1, Math.min(1, (center - viewportCenter) / rect.height));
      const translateY = delta * 24;
      active.classList.add('parallaxing');
      active.style.transform = `translateY(${translateY}px) scale(1.1)`;
    }
    rafParallax = false;
  });
};
window.addEventListener('scroll', parallax, { passive: true });
window.addEventListener('resize', parallax);
parallax();

// 民族速览滚动渐入
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

$$('.section, .ethnic-card, .story, .ibox').forEach(el => {
  el.classList.add('reveal');
  revealObserver.observe(el);
});

// 卡片交互改为：背景图跟随鼠标 + 阴影增强（无倾斜）
function attachParallaxBG(card) {
  let rect; let moving = false;
  const img = $('.card-img', card);
  if (!img) return;
  const onEnter = () => { rect = card.getBoundingClientRect(); card.classList.add('hovered'); };
  const onMove = (e) => {
    if (!rect) rect = card.getBoundingClientRect();
    if (moving) return; moving = true;
    requestAnimationFrame(() => {
      const nx = (e.clientX - rect.left) / rect.width; // 0~1
      const ny = (e.clientY - rect.top) / rect.height; // 0~1
      const px = 40 + nx * 20; // 背景位置在 40%~60%
      const py = 40 + ny * 20;
      img.style.backgroundPosition = `${px}% ${py}%`;
      moving = false;
    });
  };
  const onLeave = () => { card.classList.remove('hovered'); img.style.backgroundPosition = '50% 50%'; };
  card.addEventListener('mouseenter', onEnter);
  card.addEventListener('mousemove', onMove);
  card.addEventListener('mouseleave', onLeave);
}

const attachCardInteraction = () => {
  if (window.matchMedia && !window.matchMedia('(pointer: fine)').matches) return; // 触屏设备不挂载
  $$('.ethnic-card', overviewGrid).forEach(attachParallaxBG);
};
const _renderGrid = renderGrid;
renderGrid = function(list) { // 覆写以在渲染后挂载交互
  _renderGrid(list);
  attachCardInteraction();
  // 为新渲染的卡片添加随机入场延迟
  const cards = $$('.ethnic-card', overviewGrid);
  cards.forEach((c, i) => {
    const delay = (i % 12) * 35 + Math.random() * 80; // 批次错峰
    c.style.transitionDelay = delay + 'ms';
    c.classList.add('reveal');
    requestAnimationFrame(() => c.classList.add('visible'));
  });
};

// 影像库：瀑布流 + 弹窗 + 分页
const masonry = $('#masonry');
const galleryPager = $('#galleryPager');
let page = 1; // 分页从 1 开始
let loading = false;

// 使用从总民族文件夹复制的真实图片数据
function buildGalleryData() {
  // 使用GALLERY_IMAGES数据，转换为文化影像库需要的格式
  if (typeof GALLERY_IMAGES !== 'undefined' && GALLERY_IMAGES.length > 0) {
    return GALLERY_IMAGES.map((img, index) => ({
      url: img.src,
      cat: img.category,
      title: img.alt,
      place: '民族文化',
      desc: '展现各民族文化的精彩瞬间'
    }));
  }
  
  // 如果没有GALLERY_IMAGES数据，使用默认数据
const mockPhotos = [
  { url: 'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?q=80&w=1600&auto=format&fit=crop', cat: 'festival', title: '节日欢腾', place: '示意地点', desc: '庆典中的欢腾时刻。' },
  { url: 'https://images.unsplash.com/photo-1519681390565-c2fc5436bc35?q=80&w=1600&auto=format&fit=crop', cat: 'heritage', title: '非遗银饰', place: '贵州', desc: '苗族银饰手工艺。' },
  { url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop', cat: 'daily', title: '草原日常', place: '内蒙古', desc: '辽阔草原上的生活。' },
  { url: 'https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?q=80&w=1600&auto=format&fit=crop', cat: 'architecture', title: '木构建筑', place: '西南', desc: '民族特色建筑风貌。' },
  { url: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1600&auto=format&fit=crop', cat: 'attire', title: '服饰之美', place: '西南', desc: '传统服饰的花纹与色彩。' },
];

  const data = [];
  for (let i = 0; i < 60; i++) {
    const src = mockPhotos[i % mockPhotos.length];
    data.push({ ...src });
  }
  return data;
}

const GALLERY_ALL = buildGalleryData();

function getGalleryFiltered() {
  return GALLERY_ALL; // 不再筛选，显示所有图片
}

function renderGalleryPage() {
  const keepY = window.pageYOffset;
  const list = getGalleryFiltered();
  
  // 智能分页：基于视口高度和图片大小自动分配
  const totalImages = list.length;
  const viewportHeight = window.innerHeight;
  const galleryHeight = viewportHeight * 0.8; // 假设画廊区域占视口高度的80%
  
  // 根据屏幕大小动态调整每页图片数量
  let imagesPerPage;
  if (window.innerWidth < 700) {
    // 手机端：1列，每页约12-15张图片
    imagesPerPage = Math.floor(galleryHeight / 250) || 12;
  } else if (window.innerWidth < 1100) {
    // 平板端：2列，每页约18-24张图片
    imagesPerPage = Math.floor(galleryHeight / 200) * 2 || 18;
  } else {
    // 桌面端：3列，每页约24-36张图片
    imagesPerPage = Math.floor(galleryHeight / 180) * 3 || 24;
  }
  
  // 确保每页至少有6张图片，最多不超过45张
  const minImagesPerPage = 6;
  const maxImagesPerPage = 45;
  const actualImagesPerPage = Math.max(minImagesPerPage, Math.min(maxImagesPerPage, imagesPerPage));
  
  const totalPages = Math.ceil(totalImages / actualImagesPerPage);
  
  page = Math.min(page, totalPages);
  page = Math.max(1, page);
  
  // 加载器已删除
  
  masonry.innerHTML = '';
  const start = (page - 1) * actualImagesPerPage;
  const end = Math.min(start + actualImagesPerPage, totalImages);
  
  // 确保每页都充满图片
  const pageImages = list.slice(start, end);
  pageImages.forEach(addPhotoItem);
  
  renderGalleryPager(totalPages);
  window.scrollTo({ top: keepY, behavior: 'auto' });
}

function renderGalleryPager(totalPages) {
  let html = '';
  
  // 智能分页显示：显示当前页前后几页，以及首页和末页
  const showPages = 5; // 显示5个页码按钮
  let startPage = Math.max(1, page - Math.floor(showPages / 2));
  let endPage = Math.min(totalPages, startPage + showPages - 1);
  
  // 调整起始页，确保显示足够的页码
  if (endPage - startPage < showPages - 1) {
    startPage = Math.max(1, endPage - showPages + 1);
  }
  
  // 添加首页按钮
  if (startPage > 1) {
    html += `<button data-page="1" class="${1===page?'active':''}">1</button>`;
    if (startPage > 2) {
      html += `<span class="pager-ellipsis">...</span>`;
    }
  }
  
  // 添加中间页码
  for (let i = startPage; i <= endPage; i++) {
    html += `<button data-page="${i}" class="${i===page?'active':''}">${i}</button>`;
  }
  
  // 添加末页按钮
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span class="pager-ellipsis">...</span>`;
    }
    html += `<button data-page="${totalPages}" class="${totalPages===page?'active':''}">${totalPages}</button>`;
  }
  
  // 添加上一页和下一页按钮
  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);
  
  html = `<button data-page="${prevPage}" class="pager-nav" ${page === 1 ? 'disabled' : ''}>上一页</button>` + html;
  html += `<button data-page="${nextPage}" class="pager-nav" ${page === totalPages ? 'disabled' : ''}>下一页</button>`;
  
  // 确保分页器容器有正确的CSS类名
  galleryPager.className = 'pagination';
  galleryPager.innerHTML = html;
  $$('button', galleryPager).forEach(btn => btn.addEventListener('click', e => {
    e.preventDefault();
    if (btn.disabled) return;
    const next = Number(btn.dataset.page||'1');
    if (next === page) return;
    // 点击动效
    btn.classList.add('pulse');
    setTimeout(() => btn.classList.remove('pulse'), 360);
    page = next;
    renderGalleryPage();
  }));
}

function addPhotoItem(photo) {
  const wrap = document.createElement('div');
  wrap.className = 'masonry-item reveal';
  wrap.innerHTML = `<img src="${photo.url}" alt="${photo.title}" loading="lazy"><div class="sr-only" hidden>${photo.title}</div>`;
  const img = $('img', wrap);
  if (img) {
    if (img.complete) {
      img.classList.add('loaded');
      // 图片加载完成后，优化布局
      setTimeout(() => optimizeMasonryLayout(), 100);
    } else {
      img.addEventListener('load', () => {
        img.classList.add('loaded');
        // 图片加载完成后，优化布局
        setTimeout(() => optimizeMasonryLayout(), 100);
      }, { once: true });
      img.addEventListener('error', () => {
        img.classList.add('loaded');
        setTimeout(() => optimizeMasonryLayout(), 100);
      }, { once: true });
    }
  }
  wrap.addEventListener('click', () => openPhotoModal(photo));
  masonry.appendChild(wrap);
  revealObserver.observe(wrap);
}

// 优化瀑布流布局
function optimizeMasonryLayout() {
  // 使用CSS的column-fill属性来优化布局
  masonry.style.columnFill = 'balance';
  // 强制重新计算布局
  masonry.style.display = 'none';
  masonry.offsetHeight; // 触发重排
  masonry.style.display = '';
}

function refreshMasonry() {
  page = 1;
  renderGalleryPage();
}

// 标签筛选功能已移除

// 加载器已删除

refreshMasonry();

// 窗口大小变化时重新计算分页
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    page = 1; // 重置到第一页
    renderGalleryPage();
  }, 300); // 防抖处理
});

// 取消无限滚动

// 照片详情弹窗
function openPhotoModal(photo) {
  const modal = document.createElement('div');
  modal.className = 'photo-modal';
  modal.innerHTML = `
    <div class="photo-box">
      <img src="${photo.url}" alt="图片预览" loading="lazy">
    </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

// 通用：按钮/链接添加点击涟漪
function addRipple(e) {
  const target = e.currentTarget;
  const rect = target.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  target.appendChild(ripple);
  setTimeout(() => ripple.remove(), 650);
}

function enhanceRipple(selector) {
  $$(selector).forEach(el => {
    if (!el.classList.contains('ripple-wrap')) el.classList.add('ripple-wrap');
    el.addEventListener('click', addRipple);
  });
}

enhanceRipple('.btn, .filter, .pagination button, .chat-send, .hamburger, .banner-prev, .banner-next, #overviewAZ button');

// 搜索（增强：实时联想 + 跳转到速览对应卡片）
const searchInput = $('#searchInput');
const searchBtn = $('#searchBtn');
const searchSuggest = $('#searchSuggest');

function normalize(str) { return (str || '').toLowerCase(); }

function buildSuggestList(query) {
  const q = normalize(query);
  if (!q) return [];
  // 从 ETHNIC_LIST 中取 name 与 pinyin 命中
  const base = ETHNIC_LIST.map(e => ({
    name: e.name,
    pinyin: e.pinyin,
    alpha: e.alpha,
  }));
  const matched = base.filter(e => normalize(e.name).includes(q) || normalize(e.pinyin).includes(q));
  // 最多 8 条
  return matched.slice(0, 8);
}

function updateSuggest() {
  const items = buildSuggestList(searchInput.value.trim());
  if (items.length === 0) { searchSuggest.hidden = true; searchSuggest.innerHTML = ''; return; }
  searchSuggest.innerHTML = items.map(e => `<li role="option" data-name="${e.name}" data-pinyin="${(e.pinyin||'').toLowerCase()}" data-alpha="${e.alpha}">${e.name} <span style="color:#999;font-size:12px;">${e.pinyin}</span></li>`).join('');
  searchSuggest.hidden = false;
}

function jumpToEthnicByPinyin(pinyinLower) {
  const e = ETHNIC_LIST.find(x => normalize(x.pinyin) === normalize(pinyinLower));
  if (!e) return;
  // 切换到概览与对应字母
  currentAlpha = e.alpha || 'ALL';
  // 计算该民族在过滤列表中的索引，定位所在页
  const list = getFiltered();
  const idx = list.findIndex(x => normalize(x.pinyin) === normalize(pinyinLower));
  if (idx >= 0 && !SIMPLE_MODE) {
    currentPage = Math.floor(idx / PAGE_SIZE) + 1;
  } else {
    currentPage = 1;
  }
  // 渲染
  updateOverview();
  // 滚到概览区
  const overview = $('#overview');
  if (overview) overview.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // 等待下一帧后在卡片内定位
  setTimeout(() => {
    const cards = $$('.ethnic-card', overviewGrid);
    const cardIdxInPage = idx - (currentPage - 1) * PAGE_SIZE;
    const targetCard = cards[cardIdxInPage];
    if (targetCard) targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 50);
}

searchInput.addEventListener('input', updateSuggest);
searchSuggest.addEventListener('click', e => {
  const li = e.target.closest('li'); if (!li) return;
  const pinyin = li.getAttribute('data-pinyin') || '';
  searchInput.value = li.getAttribute('data-name') || '';
  searchSuggest.hidden = true;
  // 执行跳转
  jumpToEthnicByPinyin(pinyin);
});
document.addEventListener('click', e => { if (!e.target.closest('.search')) searchSuggest.hidden = true; });

function handleSearchSubmit() {
  const q = searchInput.value.trim(); if (!q) return;
  // 尝试按名称完全或部分匹配，若多条命中取第一条
  const candidates = ETHNIC_LIST.filter(e => normalize(e.name).includes(normalize(q)) || normalize(e.pinyin).includes(normalize(q)));
  if (candidates.length === 0) { updateSuggest(); return; }
  const target = candidates[0];
  jumpToEthnicByPinyin((target.pinyin || '').toLowerCase());
}

searchBtn.addEventListener('click', handleSearchSubmit);
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); handleSearchSubmit(); }
});

// 聊天助手悬浮与弹窗
const chatFab = $('#chatFab');
const chatModal = $('#chatModal');
const chatMin = $('#chatMin');
const chatClear = $('#chatClear');
const chatHelp = $('#chatHelp');
const chatClose = $('#chatClose');
const chatBody = $('#chatBody');
const chatInput = $('#chatInput');
const chatSend = $('#chatSend');

function openChat() { chatModal.hidden = false; chatInput.focus(); }
function closeChat() { chatModal.hidden = true; }
chatFab.addEventListener('click', openChat);
chatClose.addEventListener('click', closeChat);
chatMin.addEventListener('click', () => { closeChat(); });
$$('[data-open-chat]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); openChat(); }));

// =================== 56 民族速览：数据渲染 + A-Z + 分页 ===================
const overviewGrid = $('#overviewGrid');
const overviewPager = $('#overviewPager');
const overviewAZ = $('#overviewAZ');

// 简化示例：完整 56 民族数据（名称、拼音、代表色、标签、图片占位）
// 备注：图片使用占位或公共图库示意，可后续替换为版权可用图。
let ETHNIC_LIST = [
  { name: '汉族', pinyin: 'Hanzu', alpha: 'H', tags: ['分布广泛','汉语'], img: 'images/han_cover.jpg',
    population: '约12.86亿人（占全国总人口的91.11%）',
    distribution: '汉族分布最广，遍布全国，主要集中在东部和中部地区',
    language: '汉语是汉族的共同语言，也是中国的官方语言之一',
    history: '汉族的远古先民大体以西起陇山、东至泰山的黄河中、下游为活动地区',
    culture: {
      attire: { title: '汉族服饰', desc: '汉族的传统民族服饰是汉服，其以交领右衽、宽衣博带为主要特征，承载着中华礼仪文化和传统工艺体系', img: 'images/汉族_服饰.jpg' },
      architecture: { title: '汉族建筑', desc: '布局的特点一般是平而向纵深发展，分上房下房、正房侧房、内院外院，往往形成左右严格对称，庭院与建筑物融为一体，封闭独立的住宅建筑群', img: 'images/汉族_建筑.jpg' },
      festival: { title: '传统节日', desc: '汉族的主要传统节日包括春节（农历正月初一）、元宵节（正月十五）、清明节（公历4月5日前后）、端午节（五月初五）、七夕节（七月初七）、中秋节（八月十五）、重阳节（九月初九）等，各节日均有独特的习俗和文化内涵', img: 'images/汉族_节日.jpg' },
      food: { title: '汉族饮食', desc: '汉族的饮食以稻米和小麦为主食，搭配蔬菜、肉类及豆制品，形成一日三餐制，并发展出鲁菜、徽菜等八大菜系，强调精细烹饪、营养平衡与文化寓意', img: 'images/汉族_饮食.jpg' }
    },
    gallery: ['images/han_cover.jpg', 'images/han_1.jpg', 'images/han_2.jpg', 'images/han_3.jpg']
  },
  { name: '蒙古族', pinyin: 'Mengguzu', alpha: 'M', tags: ['那达慕','草原'], img: 'images/menggu_cover.jpg',
    population: '约629万人',
    distribution: '主要聚居在内蒙古自治区，其次分布在新疆、辽宁、吉林、黑龙江、甘肃、青海、河北等省区的蒙古族自治州、县，少数散居在宁夏、河南、北京等地区',
    language: '使用蒙古语，传统文字为蒙古文',
    history: '蒙古族族源与东胡系诸族（如鲜卑、室韦）相关，"蒙古"一词最早见于唐代"蒙兀室韦"。12世纪，蒙古诸部散居于鄂嫩河、克鲁伦河一带；13世纪初，成吉思汗统一蒙古各部，建立大蒙古国，"蒙古"从部落名正式成为民族名',
    culture: {
      attire: { title: '蒙古族服饰', desc: '袍身肥大袖长，下摆不开衩，冬装多用光板皮衣，夏装以布类为主，高筒皮靴可防沙御寒。领口、袖口镶花边，红绿绸缎腰带搭配火镰、鼻烟盒等饰物，男女均佩戴玛瑙珊瑚首饰。主色选用红、黄、深蓝色', img: 'images/蒙古族_服饰.jpg' },
      architecture: { title: '蒙古包', desc: '蒙古包以木制框架（哈那、乌尼、陶脑）和毛毡覆盖构成，哈那为可伸缩的菱形网片墙，陶脑为圆形天窗，乌尼为连接天窗与墙的椽条。其圆形结构符合黄金比例（0.615），抗风性能优越', img: 'images/蒙古族_建筑.jpg' },
      festival: { title: '传统节日', desc: '蒙古族的主要传统节日包括那达慕大会、白节（春节）、马奶节和祭敖包等，集中展现了游牧文化的庆典特色和民族精神', img: 'images/蒙古族_节日.jpg' },
      food: { title: '蒙古族饮食', desc: '蒙古族饮食以游牧生活为基础，核心特点是以肉食（红食）和奶制品（白食）为主，辅以茶饮和面食，体现草原文化的实用性与礼仪性', img: 'images/蒙古族_饮食.jpg' }
    },
    gallery: ['images/menggu_cover.jpg', 'images/menggu_1.jpg', 'images/menggu_2.jpg', 'images/menggu_3.jpg']
  },
  { name: '回族', pinyin: 'Huizu', alpha: 'H', tags: ['清真','礼拜'], img: 'images/hui_cover.webp',
    population: '约1137.79万人',
    distribution: '呈现"大分散、小聚居"特点。主要聚居区为宁夏回族自治区，此外在甘肃、青海、河南、河北、山东、云南等省份分布较为集中，全国绝大多数县级行政区都有回族居住',
    language: '回族通用汉语，这是长期与汉族等民族交流融合的结果。在日常交流和宗教活动中，会夹杂少量阿拉伯语、波斯语词汇（如"安拉""清真""朵斯提"等）',
    history: '回族的形成是多民族融合的结果，核心渊源可概括为三个阶段：唐代至元代，元代，明清时期',
    culture: {
      attire: { title: '回族服饰', desc: '回族服饰是指流行于回族人民的服饰文化，其主要标志在头部。男子们都喜爱戴白色的圆帽。回族妇女常戴盖头。回族老年妇女冬季戴黑色或褐色头巾，夏季则戴白纱巾，并有扎裤腿的习惯。青年妇女冬季戴红、绿色或兰色头巾，夏季戴红、绿、黄等色的薄纱巾。讨论山区回族妇女爱穿绣花鞋，并有扎耳孔戴耳环的习惯', img: 'images/回族_服饰.jpg' },
      architecture: { title: '回族建筑', desc: '回族建筑以清真寺为代表，融合了中国传统建筑风格与伊斯兰文化特色，主要分为阿拉伯式、中国传统古典式及两者结合的建筑类型，同时民居也具有独特的窑洞、箍窑等形式', img: 'images/回族_建筑.jpg' },
      festival: { title: '传统节日', desc: '回族的传统节日主要包括开斋节、古尔邦节和圣纪节三大宗教节日，以及法图麦节、阿舒拉节等区域性节日，这些节日源于伊斯兰教历，承载着宗教、文化和社区凝聚功能', img: 'images/回族_节日.jpg' },
      food: { title: '回族饮食', desc: '回族的饮食遵循伊斯兰教教义，以清真饮食体系为核心，强调食材纯净、烹饪卫生，主食以面食为主，肉类以牛羊肉为特色，严格禁食猪肉、血液、自死物及非穆斯林宰杀的动物，并形成丰富的地域性菜肴和节日食俗', img: 'images/回族_饮食.jpg' }
    }
  },
  { name: '藏族', pinyin: 'Zangzu', alpha: 'Z', tags: ['青藏高原','酥油茶'], img: 'images/zang_cover.jpg',
    population: '约706.07万人',
    distribution: '主要分布在西藏自治区、青海省、四川省、甘肃省、云南省等省区',
    language: '使用藏语，属于汉藏语系藏缅语族藏语支，分为卫藏、康、安多三大方言',
    history: '藏族是青藏高原的古老民族，其先民可追溯到古代羌人，在长期的历史发展中形成了独特的文化',
    culture: {
      attire: { title: '藏族服饰', desc: '藏族传统服饰以长袍为主，男女都穿长袍，男子多穿黑色、白色，女子多穿彩色。服饰上多有金银饰品，体现了高原民族的特色', img: 'images/藏族_服饰.jpg' },
      architecture: { title: '藏族建筑', desc: '藏族传统建筑以石木结构为主，适应高原环境。布达拉宫是藏族建筑的典型代表，体现了藏传佛教建筑的艺术特色', img: 'images/藏族_建筑.jpg' },
      festival: { title: '传统节日', desc: '藏族的主要传统节日包括藏历新年、雪顿节、望果节等，这些节日承载着深厚的宗教文化内涵', img: 'images/藏族_节日.jpg' },
      food: { title: '藏族饮食', desc: '藏族饮食以青稞、酥油茶为主食，特色食品有糌粑、青稞酒、风干肉等，适应高原环境的特点', img: 'images/藏族_饮食.jpg' }
    }
  },
  { name: '维吾尔族', pinyin: 'Weiwuerzu', alpha: 'W', tags: ['木卡姆','艾德莱斯'], img: 'images/weiwuer_cover.jpg',
    population: '约1177.45万人',
    distribution: '主要分布在新疆维吾尔自治区，是新疆的主体民族',
    language: '使用维吾尔语，属于阿尔泰语系突厥语族，使用阿拉伯字母文字',
    history: '维吾尔族是新疆的古老民族，其先民可追溯到古代回鹘人，在长期的历史发展中形成了独特的文化',
    culture: {
      attire: { title: '维吾尔族服饰', desc: '维吾尔族传统服饰以艾德莱斯绸为特色，色彩丰富，图案精美。男子多穿长袍，女子多穿连衣裙，体现了新疆文化的特色', img: 'images/维吾尔族_服饰.jpg' },
      architecture: { title: '维吾尔族建筑', desc: '维吾尔族传统建筑融合了伊斯兰和当地建筑风格，以清真寺为代表，体现了独特的建筑艺术', img: 'images/维吾尔族_建筑.jpg' },
      festival: { title: '传统节日', desc: '维吾尔族的主要传统节日包括古尔邦节、开斋节等伊斯兰传统节日，以及诺鲁孜节等民族节日', img: 'images/维吾尔族_节日.jpg' },
      food: { title: '维吾尔族饮食', desc: '维吾尔族饮食以面食为主，特色食品有抓饭、烤包子、拉条子、馕等，体现了新疆饮食文化的特色', img: 'images/维吾尔族_饮食.jpg' }
    }
  },
  { name: '苗族', pinyin: 'Miaozu', alpha: 'M', tags: ['银饰','刺绣'], img: 'images/miao_cover.jpg',
    population: '约1106.79万人',
    distribution: '其分布呈现"大散居、小聚居"特点',
    language: '苗族有自己的语言，属于汉藏语系苗瑶语族苗语支，分为三大方言——黔东方言、湘西方言和川黔滇方言，各方言内部还有不同土语，方言间差异较大，通话困难',
    history: '苗族是中国历史悠久的民族之一，其先民可追溯到上古时期的"九黎"部落，首领为蚩尤',
    culture: {
      attire: { title: '苗族服饰', desc: '苗语叫"呕欠"，主要由童装、便装、盛装组成，"盛装"苗语叫"呕欠嘎给希"，即"升底衣服"，" 呕欠涛"苗语称谓即"银衣"，下穿百褶裙，前后有围腰。湘西方言苗区和黔东方言苗区喜好银饰，黔南某些地区喜好贝饰，而西部方言区苗族服饰则少银饰。苗族服饰样式繁多，据不完全统计多达200多种样式，年代跨度大。银饰、苗绣、蜡染是苗族服饰的主要特色', img: 'images/苗族_服饰.jpg' },
      architecture: { title: '苗族建筑', desc: '苗族吊脚楼是苗族传统干栏式民居建筑，主要分布于贵州、云南、湖南等山区。其以穿斗式木构架为核心，采用榫卯连接工艺，依山势建于30-70度斜坡，形成底层悬空的"天平地不平"结构，具有防潮、节地、稳固特性。建筑通常分三层：底层圈养牲畜，中层居住并设堂屋、火塘及"美人靠"休憩区，上层储粮', img: 'images/苗族_建筑.jpg' },
      festival: { title: '传统节日', desc: '苗族民间的传统节日较多，有苗年、四月八、龙舟节、吃新节、赶秋节等，其中以过苗年最为隆重。苗年相当于汉族的春节，一般在秋后举行', img: 'images/苗族_节日.jpg' },
      food: { title: '苗族饮食', desc: '苗族的食俗，亦称之为苗族的食俗文化。大部分地区的苗族一日三餐，均以大米为主食。油炸食品以油炸粑粑最为常见。肉食多来自家畜、家禽饲养。以辣椒为主要调味品，有的地区甚至有"无辣不成菜"之说。各地苗族普遍喜食酸味菜肴，酸汤家家必备。食物保存，普遍采用腌制法。典型食品主要有：血灌汤、辣椒骨、苗乡龟凤汤、绵菜粑、虫茶、万花茶、捣鱼、酸汤鱼等。苗族人普遍喜欢喝酒，"无酒不成礼"已是他们遵守的礼仪，酒是待客议事、婚丧嫁娶、起房建屋、逢年过节的必备品', img: 'images/苗族_饮食.jpg' }
    }
  },
  { name: '彝族', pinyin: 'Yizu', alpha: 'Y', tags: ['火把节','毕摩'], img: 'images/yi_cover.jpg',
    population: '约983.03万人',
    distribution: '主要分布在四川、云南、贵州、广西等省区，是西南地区的重要民族',
    language: '使用彝语，属于汉藏语系藏缅语族彝语支，有传统彝文',
    history: '彝族是西南地区的古老民族，其先民可追溯到古代羌人，在长期的历史发展中形成了独特的文化',
    culture: {
      attire: { title: '彝族服饰', desc: '彝族传统服饰以黑色为基调，配以彩色装饰，体现了山地民族特色。服饰上多有银饰，图案丰富', img: 'images/彝族_服饰.jpg' },
      architecture: { title: '彝族建筑', desc: '彝族传统建筑以土掌房为主，适应山地环境。建筑结构简单实用，体现了山地民族的生活智慧', img: 'images/彝族_建筑.jpg' },
      festival: { title: '传统节日', desc: '彝族的主要传统节日包括火把节、彝族年等，其中火把节是最重要的节日，体现了彝族的文化特色', img: 'images/彝族_节日.jpg' },
      food: { title: '彝族饮食', desc: '彝族饮食以玉米、土豆为主食，特色食品有坨坨肉、酸菜等，体现了山地民族的饮食特色', img: 'images/彝族_饮食.jpg' }
    }
  },
  { name: '壮族', pinyin: 'Zhuangzu', alpha: 'Z', tags: ['三月三','铜鼓'], img: 'images/zhuang_cover.jpg',
    population: '约1956.85万人',
    distribution: '其分布以"大聚居、小散居"为特点',
    language: '壮族有本民族语言，属于汉藏语系壮侗语族壮傣语支，分为南部方言和北部方言，方言间差异较小，基本可互通，日常交流中也普遍使用汉语西南官话',
    history: '壮族是华南地区的土著民族，其先民可追溯到上古时期的"西瓯""骆越"部落，是古代岭南地区（今华南一带）的主要居民',
    culture: {
      attire: { title: '壮族服饰', desc: '壮族妇女擅长纺织和刺绣，所织的壮布和壮锦，均以图案精美和色彩艳丽著称，还有风格别致的"蜡染"也为人们所称道。在服饰上男子比较素，女子则多姿多彩，特别喜欢在鞋、帽、胸兜上用五色丝线绣上花纹，人物、鸟兽、花卉，五花八门，色彩斑斓', img: 'images/壮族_服饰.jpg' },
      architecture: { title: '壮族建筑', desc: '壮族民居 壮族民居是壮族传统居住建筑统称，以干栏式建筑为核心形式，包含全栏、半栏及平房三种类型。干栏式建筑主体多为木结构，分为三层：上层储物、中层居住、下层圈畜，具有防潮、防兽功能。村落多建于山脚向阳、通风处，注重依山傍水，村前常植榕树，房屋布局讲究间隔，形成"村前一曲水，村后万重山"的景观', img: 'images/壮族_建筑.jpg' },
      festival: { title: '传统节日', desc: '壮族节日主要包括三月三、牛魂节、药王节等传统节日，以及陇端节、吃立节等地区性节日', img: 'images/壮族_节日.webp' },
      food: { title: '壮族饮食', desc: '壮族多居住临水地区，主食大米。其中，广南八宝米曾为贡品。壮族善于制作糯米食品，节日食品有五色糯米饭、米花糖、大粽子等。除主食外，壮族有许多菜肴和小吃。壮族的年节食礼甚为讲究，菜点与吃法各有章程。如遇家中办喜事，则打鱼、杀鸡、蒸馍、备酒，宴请亲朋。壮族自酿米酒、红薯酒和木薯酒，度数都不太高。米酒是壮族人家待客及节日自奉的主要饮料', img: 'images/壮族_饮食.jpg' }
    }
  },
  { name: '布依族', pinyin: 'Buyizu', alpha: 'B', tags: ['蜡染','稻作'], img: 'images/buyi_cover.jpg',
    population: '约357.68万人',
    distribution: '主要分布在贵州省，是贵州的重要民族之一',
    language: '使用布依语，属于汉藏语系壮侗语族壮傣语支，有传统布依文',
    history: '布依族是贵州的古老民族，其先民可追溯到古代百越人，在长期的历史发展中形成了独特的文化',
    culture: {
      attire: { title: '布依族服饰', desc: '布依族传统服饰以蜡染为特色，色彩丰富，图案精美，体现了稻作民族的特色', img: 'images/buyi_cover.jpg' },
      architecture: { title: '布依族建筑', desc: '布依族传统建筑以干栏式建筑为主，适应湿热环境，体现了南方民族的建筑特色', img: 'images/布依族.jpg' },
      festival: { title: '传统节日', desc: '布依族的主要传统节日包括六月六、三月三、四月八等，这些节日体现了布依族的文化特色', img: 'images/布依族_节日.webp' },
      food: { title: '布依族饮食', desc: '布依族饮食以大米为主食，特色食品有花米饭、酸汤鱼等，体现了稻作民族的饮食特色', img: 'images/布依族_饮食.jpg' }
    }
  },
  { name: '朝鲜族', pinyin: 'Chaoxianzu', alpha: 'C', tags: ['打糕','伽倻琴'], img: 'images/chaoxian_cover.jpg',
    population: '约192.38万人',
    distribution: '主要分布在吉林、黑龙江、辽宁等省，是东北地区的重要民族',
    language: '使用朝鲜语，属于阿尔泰语系，使用朝鲜文',
    history: '朝鲜族是东北地区的民族，其先民可追溯到古代朝鲜人，在长期的历史发展中形成了独特的文化',
    culture: {
      attire: { title: '朝鲜族服饰', desc: '朝鲜族传统服饰以白色为主，男子多穿长袍，女子多穿短衣长裙，体现了朝鲜族的文化特色', img: 'images/chaoxian_cover.jpg' },
      architecture: { title: '朝鲜族建筑', desc: '朝鲜族传统建筑以木结构为主，适应温带环境，体现了朝鲜族的建筑特色', img: 'images/朝鲜族.jpg' },
      festival: { title: '传统节日', desc: '朝鲜族的主要传统节日包括春节、中秋节、端午节等，这些节日体现了朝鲜族的文化特色', img: 'images/朝鲜族_节日.jpg' },
      food: { title: '朝鲜族饮食', desc: '朝鲜族饮食以大米为主食，特色食品有打糕、泡菜、冷面等，体现了朝鲜族的饮食特色', img: 'images/朝鲜族_饮食.jpg' }
    }
  },
  { name: '满族', pinyin: 'Manzu', alpha: 'M', tags: ['八旗','满绣'], img: 'images/man_cover.png',
    population: '约1042.33万人',
    distribution: '主要分布在辽宁、河北、黑龙江、吉林、内蒙古等省区',
    language: '使用满语，属于阿尔泰语系满-通古斯语族，有传统满文',
    history: '满族是东北地区的古老民族，其先民可追溯到古代女真人，在长期的历史发展中形成了独特的文化',
    culture: {
      attire: { title: '满族服饰', desc: '满族传统服饰以旗袍为特色，体现了满族的文化特色。旗袍后来发展成为中华民族的传统服饰', img: 'images/man_cover.png' },
      architecture: { title: '满族建筑', desc: '满族传统建筑以四合院为主，适应温带环境，体现了满族的建筑特色', img: 'images/满族.jpg' },
      festival: { title: '传统节日', desc: '满族的主要传统节日包括春节、中秋节、端午节等，这些节日体现了满族的文化特色', img: 'images/满族.webp' },
      food: { title: '满族饮食', desc: '满族饮食以面食为主，特色食品有萨其马、白肉血肠等，体现了满族的饮食特色', img: 'images/满族.png' }
    }
  },
  { name: '侗族', pinyin: 'Dongzu', alpha: 'D', tags: ['鼓楼','大歌','侗不离酸'], img: 'images/dong_cover.jpg', 
    population: '约349.59万人', 
    distribution: '主要分布在贵州、湖南、广西等地',
    language: '侗语（汉藏语系壮侗语族侗水语支）',
    history: '侗族先民可追溯到上古时期的"百越"族群中的"骆越"支系，与壮族、布依族等民族有同源关系',
    culture: {
      attire: { title: '侗族服饰', desc: '侗族传统服饰以青蓝色为主，男子多穿对襟短衣，女子多穿短衣长裙，服饰上多有银饰', img: 'images/侗族_服饰.jpg' },
      architecture: { title: '侗族建筑', desc: '侗族传统建筑以鼓楼、风雨桥为特色，体现了侗族的建筑艺术', img: 'images/侗族_建筑.jpg' },
      festival: { title: '传统节日', desc: '侗族的主要传统节日包括侗年、三月三、六月六等，这些节日体现了侗族的文化特色', img: 'images/侗族_节日.jpg' },
      food: { title: '侗族饮食', desc: '侗族饮食以大米为主食，特色食品有酸汤鱼、油茶等，体现了侗族的饮食特色', img: 'images/侗族_饮食.jpg' }
    },
    gallery: ['images/dong_0.png', 'images/dong_1.png', 'images/dong_2.png', 'images/dong_1.png', 'images/dong_2.png', 'images/dong_3.png']
  },
  { name: '瑶族', pinyin: 'Yaozu', alpha: 'Y', tags: ['盘王节','刺绣'], img: 'images/yao_cover.jpg',
    population: '约330.93万人',
    distribution: '主要分布在广西、湖南、云南、广东、贵州等省区',
    language: '瑶语（汉藏语系苗瑶语族瑶语支）',
    history: '瑶族是华南地区的古老民族，其先民可追溯到古代"蛮"族，在长期的历史发展中形成了独特的文化',
    culture: {
      attire: { title: '瑶族服饰', desc: '瑶族传统服饰以刺绣为特色，色彩丰富，体现了山地民族特色', img: 'images/瑶族_服饰.jpg' },
      architecture: { title: '瑶族建筑', desc: '瑶族传统建筑以吊脚楼为主，适应山地环境', img: 'images/瑶族_建筑.jpg' },
      festival: { title: '传统节日', desc: '瑶族的主要传统节日包括盘王节、达努节等，这些节日体现了瑶族的文化特色', img: 'images/瑶族_节日.jpg' },
      food: { title: '瑶族饮食', desc: '瑶族饮食以玉米、红薯为主食，特色食品有油茶等，体现了瑶族的饮食特色', img: 'images/瑶族_饮食.jpg' }
    }
  },
  { name: '白族', pinyin: 'Baizu', alpha: 'B', tags: ['三道茶','扎染'], img: 'images/bai_cover.jpg',
    population: '约209.15万人',
    distribution: '主要分布在云南省，是云南的重要民族之一',
    language: '白语（汉藏语系藏缅语族彝语支）',
    history: '白族是云南的古老民族，其先民可追溯到古代"白蛮"，在长期的历史发展中形成了独特的文化',
    culture: {
      attire: { title: '白族服饰', desc: '白族传统服饰以白色为主，配以彩色装饰，体现了白族的文化特色', img: 'images/白族_服饰.jpg' },
      architecture: { title: '白族建筑', desc: '白族传统建筑以三坊一照壁为主，适应高原环境，体现了白族的建筑艺术', img: 'images/白族_建筑.jpg' },
      festival: { title: '传统节日', desc: '白族的主要传统节日包括三月街、火把节等，这些节日体现了白族的文化特色', img: 'images/白族_节日.jpg' },
      food: { title: '白族饮食', desc: '白族饮食以大米为主食，特色食品有三道茶、乳扇等，体现了白族的饮食特色', img: 'images/白族_饮食.jpg' }
    }
  },
  { name: '土家族', pinyin: 'Tujiazu', alpha: 'T', tags: ['摆手舞','吊脚楼'], img: 'images/tujia_cover.jpg',
    population: '约958.77万人',
    distribution: '土家族总人口约958.77万，是中国人口较多的少数民族之一，也是西南地区的主要民族之一。其分布以"聚居为主、杂居为辅"',
    language: '土家族有本民族语言，属于汉藏语系藏缅语族彝语支（一说为独立语支），称为"土家语"，主要分为北部方言（以湖北恩施、重庆黔江为中心）和南部方言（以湖南湘西为中心），方言间差异较小，基本可互通。由于长期与汉族杂居，多数土家族群众已转用汉语（西南官话）',
    history: '土家族的先民可追溯到上古时期生活在长江中游的"巴人"族群，与古代巴国有着直接的历史渊源',
    culture: {
      attire: { title: '土家族服饰', desc: '土家族服饰，是土家族人民特有的一种服装，由于土家族历史上汉化较早，传统土家族服饰已经基本消失。由于表演的需要，现代的土家族服饰大多各自研制不同款式，种类非常繁多', img: 'images/土家族_服饰.jpg' },
      architecture: { title: '土家族建筑', desc: '土家族吊脚楼——吊脚楼为土家族人居住生活的场所，吊脚楼半为陆地，半为水。多依山就势而建，呈虎坐形，以"左青龙，右白虎"中间为堂屋，左右两边称为饶间，作居住、做饭之用。饶间以中柱为界分为两半，前面作火炕，后面作卧室。吊脚楼上有绕楼的曲廊，曲廊还配有栏杆', img: 'images/土家族_建筑.jpg' },
      festival: { title: '传统节日', desc: '土家族拥有丰富多样的传统节日，其中最具代表性的是过赶年（农历腊月二十八或二十九）、女儿会（农历七月十二）、土家六月六（六月初六）和摆手节（秋收后或正月十五前），这些节日承载着土家族的历史记忆、农耕文化和民族信仰', img: 'images/土家族_节日.jpg' },
      food: { title: '土家族饮食', desc: '土家族饮食以酸辣风味为主，主食包括糯米、玉米等，特色食物有腊肉、合渣、油茶汤等，兼具山野风味与独特工艺', img: 'images/土家族_饮食.jpg' }
    }
  },
  { name: '哈尼族', pinyin: 'Hanizu', alpha: 'H', tags: ['梯田','哈巴'], img: 'images/hani_cover.jpg',
    population: '约173.3万人',
    distribution: '主要分布在云南省，集中于滇南的红河哈尼族彝族自治州、普洱市、西双版纳傣族自治州、玉溪市等地区，其中红河州的元阳、红河、绿春等县是核心聚居区，部分零星分布在云南其他州市及四川省、贵州省',
    language: '哈尼族有本民族语言"哈尼语"，属于汉藏语系藏缅语族彝语支，内部可分为哈雅、碧卡、豪白3个方言，方言间存在一定差异，但基本可沟通。1957年，国家以哈尼族"哈雅方言"中的"绿春话"为基础，创制了以拉丁字母为基础的哈尼文拼音方案',
    history: '哈尼族是中国西南地区的古老民族之一，其族源与古代"氐羌"族群密切相关',
    culture: {
      attire: { title: '哈尼族服饰', desc: '传统服饰以黑色为基调，配以彩色装饰，体现了山地民族特色', img: 'images/hani_cover.jpg' },
      architecture: { title: '哈尼族建筑', desc: '传统建筑以蘑菇房为主，适应山地环境', img: 'images/哈尼族.jpg' },
      festival: { title: '传统节日', desc: '包括十月年等传统节日', img: 'images/哈尼族.webp' },
      food: { title: '哈尼族饮食', desc: '以大米为主食，特色食品有长街宴等', img: 'images/哈尼族.png' }
    }
  },
  { name: '哈萨克族', pinyin: 'Hasakezu', alpha: 'H', tags: ['冬不拉','转场'], img: 'images/hasake_cover.jpg',
    population: '约156.2万人',
    distribution: '主要分布在新疆维吾尔自治区，核心聚居区为伊犁哈萨克自治州（含塔城、阿勒泰地区），此外在木垒哈萨克自治县、巴里坤哈萨克自治县及乌鲁木齐市、昌吉回族自治州等地也有集中分布，少量分布在甘肃省、青海省',
    language: '哈萨克族有本民族语言"哈萨克语"，属于阿尔泰语系突厥语族克普恰克语支，与柯尔克孜语、乌兹别克语等突厥语族语言有亲缘关系，内部方言差异较小，沟通无障碍。中国哈萨克族历史上曾使用以阿拉伯字母为基础的"哈萨克老文字"，1959年创制了以拉丁字母为基础的新文字方案，1982年后恢复老文字使用并进行规范',
    history: '哈萨克族是由古代多个游牧族群融合形成的民族，族源可追溯至公元前的"塞种""月氏"，以及后来的"乌孙""康居""突厥""葛逻禄"等',
    culture: {
      attire: { title: '哈萨克族服饰', desc: '哈萨克族是以草原游牧文化为特征的民族，服装便于骑乘，其民族服装多用羊皮、狐狸皮、鹿皮、狼皮等制作，反映着山地草原民族的生活特点', img: 'images/哈萨克族_服饰.jpg' },
      architecture: { title: '哈萨克族建筑', desc: '哈萨克族建筑以适应游牧生活为核心，最具代表性的是毡房（哈萨克语称"宇"），其历史可追溯至汉代，至今仍保留传统手工工艺', img: 'images/哈萨克族_建筑.jpg' },
      festival: { title: '传统节日', desc: '哈萨克族的主要传统节日包括纳吾热孜节（新春庆典）、肉孜节（开斋节）和古尔邦节（宰牲节），融合了游牧文化与伊斯兰教信仰', img: 'images/哈萨克族_节日.jpg' },
      food: { title: '哈萨克族饮食', desc: '哈萨克族饮食以游牧生活为基础，以肉类、奶制品和面食为核心，具有鲜明的草原特色，代表食物包括手抓羊肉、奶茶和包尔萨克，并遵循严格的饮食礼仪', img: 'images/哈萨克族_饮食.jpg' }
    }
  },
  { name: '傣族', pinyin: 'Daizu', alpha: 'D', tags: ['泼水节','竹楼'], img: 'images/dai_cover.jpg',
    population: '约133万人',
    distribution: '主要分布于云南省西双版纳傣族自治州、德宏傣族景颇族自治州以及耿马和孟连两个自治县，其余散居在景东、景谷、普洱等30多个县，边疆傣族地区与缅甸、老挝、越南接壤',
    language: '傣语属汉藏语系壮侗语族壮傣语支，主要有德宏、西双版纳和金平三种方言。傣族有自己的拼音文字，分傣那文、傣泐文、傣绷文、金平傣文和新平傣文5种，较为通用的是傣泐文和傣那文',
    history: '傣族与壮族、侗族、水族等一同来源于古代百越，汉晋时称"滇越""掸"或"擅""僚"或"鸠僚"。唐宋时期傣族地区先后隶属于南诏蒙氏政权和大理段氏政权，傣族被称为"黑齿蛮""银齿蛮"等。元明时期，中央政府先后设置军民总管府、车里军民宣慰使司等机构。清代沿袭明代行政管理制度的基础上实行"改土归流"政策。新中国成立后，在傣族聚居地成立了多个民族自治区域',
    culture: {
      attire: { title: '傣族服饰', desc: '傣族服饰是云南特有少数民族傣族的传统服饰，以淡雅美观、实用性与装饰性兼具为特点，体现了热带河谷地区的气候适应性与民族审美。其设计多采用透气面料，款式注重简洁修身，男性以无领对襟短衫配长管裤为主，女性则以紧身短衫、筒裙为核心，通过银腰带、织锦挎包等佩饰强化装饰性', img: 'images/傣族_服饰.jpg' },
      architecture: { title: '傣族建筑', desc: '傣族建筑独具特色，充分展现了傣族人民的生活智慧和文化传统。建筑受气候、海拔、地形、建筑材料等自然环境和人口、经济、宗教、政治、科技、思想意识等社会环境的影响，主要有以西双版纳傣族民居为代表的优美灵巧的干栏式建筑，以元江、红河一线傣族民居为代表的厚重结实的平顶土掌房，以及典雅富丽的佛寺建筑', img: 'images/傣族_建筑.jpg' },
      festival: { title: '传统节日', desc: '傣族普遍信仰南传上座部佛教。主要节日有关门节、开门节、泼水节等。傣族泼水节是傣族最重要的传统节日，时间为农历清明前后十天左右（傣历6月中旬），庆祝活动包括泼水狂欢、赶摆、赛龙舟、浴佛、诵经、文艺表演等', img: 'images/傣族_节日.jpg' },
      food: { title: '傣族饮食', desc: '傣族饮食以酸辣风味为核心，主食糯米，特色菜品包括竹筒饭、酸笋煮鸡、香茅草烤鱼等，体现了热带雨林地域特色和民族文化智慧。傣家菜以生、鲜、酸、辣、野为特点，常食昆虫、花等', img: 'images/傣族_饮食.jpg' }
    }
  },
  { name: '黎族', pinyin: 'Lizu', alpha: 'L', tags: ['纺染','船型屋'], img: 'images/li_cover.jpg',
    population: '约160.2万人',
    distribution: '约85%的黎族人口聚居在海南省，核心分布区为陵水黎族自治县、保亭黎族苗族自治县、三亚市、乐东黎族自治县等；其余少量散居在广东省、贵州省等地',
    language: '黎语属于汉藏语系壮侗语族黎语支，内部可分为哈、杞、润、赛、美孚5个方言，不同方言间存在一定差异。历史上黎族无通用文字，1957年国家以黎语"哈方言"为基础，创制了以拉丁字母为基础的黎文拼音方案，现用于民族教育、文化传承等领域',
    history: '黎族的族源与古代"百越"族群中的"骆越"一支密切相关',
    culture: {
      attire: { title: '黎族服饰', desc: '黎族服饰是流传于海南省的以黎族传统的纺、染、织、绣四大工艺为基础，利用海岛棉、麻、木棉、树皮纤维和蚕丝等织造缝合而成的民族服饰，其演变历史达数千年之久。在传统黎族服饰中，黎族妇女常穿直领、无领、无纽对襟上衣，有的地方穿贯头式上衣，下穿长短不同的筒裙，束发脑后，插以骨簪或银簪，披绣花头巾，戴耳环、项圈和手镯。男子传统装束一般结发于额前或脑后，上衣无领、对胸开襟，下着腰布（吊襜）', img: 'images/黎族_服饰.jpg' },
      architecture: { title: '黎族建筑', desc: '黎族民居是海南岛黎族特有的传统建筑形式，具有千年以上的历史，广泛分布于五指山、滨海平原等地区，村寨选址遵循"三靠一爽二干净"原则，强调近耕地、水源且环境洁净。传统住宅以船形屋和金字形茅屋为主，船形屋采用竹木藤条构架、茅草覆顶，外形如倒扣船篷，兼具防潮、防兽功能，是黎族文化的标志性建筑；金字形茅屋则形成于20世纪50年代后，受汉族建筑影响，采用人字形屋顶和竹木泥墙结构', img: 'images/黎族_建筑.jpg' },
      festival: { title: '传统节日', desc: '黎族的主要传统节日是三月三节（农历三月初三），又称爱情节或谈爱日，是国家级非物质文化遗产，用于悼念祖先和表达对爱情的向往；此外，保亭地区的七仙温泉嬉水节也是重要节庆活动，源于黎族苗族传统"祭水节"，以嬉水狂欢和民俗表演为特色', img: 'images/黎族_节日.jpg' },
      food: { title: '黎族饮食', desc: '黎族饮食以山兰米制品、竹筒烹饪和发酵类食物为核心特色，融合自然崇拜与社群文化，形成独具民族特色的饮食体系', img: 'images/黎族_饮食.jpg' }
    }
  },
  { name: '傈僳族', pinyin: 'Lisu', alpha: 'L', tags: ['手鼓','上刀山'], img: 'images/lisu_cover.jpg',
    population: '约76.2万人',
    distribution: '主要聚居在云南省，核心区域为怒江傈僳族自治州、迪庆藏族自治州',
    language: '傈僳语属于汉藏语系藏缅语族彝语支',
    history: '傈僳族源于古代氐羌族群，早期活动于青藏高原东部',
    culture: {
      attire: { title: '傈僳族服饰', desc: '典雅、美观、大方，不同地区的傈僳族妇女因服饰颜色的差异而被称为白傈僳、黑傈僳、花傈僳', img: 'images/傈僳族_服饰.jpg' },
      architecture: { title: '傈僳族民居', desc: '主要分布于高山、坡地或河谷地区，传统类型包括竹篾房、木楞房及土墙房', img: 'images/傈僳族_建筑.jpg' },
      festival: { title: '传统节日', desc: '最核心的是阔时节（相当于汉族的春节），此外还包括吃新节、刀杆节、澡塘会、收获节等', img: 'images/傈僳族_节日.jpg' },
      food: { title: '傈僳族食俗', desc: '以山地作物为主食，主要种植玉米、荞麦及少量水稻，特色食物阴玉米饭需经沸煮阴干后配猪排炖煮', img: 'images/傈僳族_饮食.jpg' }
    },
    gallery: ['images/lisu_cover.png']
  },
  { name: '佤族', pinyin: 'Wazu', alpha: 'W', tags: ['木鼓','新米节'], img: 'images/wa_cover.webp',
    population: '约43.0万人',
    distribution: '核心聚居区为云南省，集中在临沧市和普洱市',
    language: '佤语属于南亚语系孟高棉语族佤德昂语支',
    history: '佤族的先民可追溯至古代"百濮"族群，是云南高原最早的居民之一',
    culture: {
      attire: { title: '佤族服饰', desc: '以黑色为基底搭配红色装饰，延续山地民族特色并存在地域差异', img: 'images/佤族_服饰.jpg' },
      architecture: { title: '佤族建筑', desc: '传统住宅中，牛头骨装饰具有特殊文化内涵，展示家庭经济实力', img: 'images/佤族_建筑.jpg' },
      festival: { title: '传统节日', desc: '包括便克节、新米节、木鼓节、摸你黑狂欢节和贡象节', img: 'images/佤族_节日.jpg' },
      food: { title: '佤族食俗', desc: '以稻米为主食，佤族饮食以烂饭为特色，将米、菜、肉混合烹煮', img: 'images/佤族_饮食.jpg' }
    },
    gallery: ['images/wa_cover.png']
  },
  { name: '纳西族', pinyin: 'Naxizu', alpha: 'N', tags: ['东巴','古乐'], img: 'images/naxi_cover.jfif',
    population: '约32.6万人',
    distribution: '主要聚居在云南丽江纳西族自治县，占该族总人口的68%以上；其余分布在云南迪庆、怒江、大理及四川盐源、木里，西藏芒康等地，多与汉、白、藏等民族交错杂居，形成大杂居、小聚居的分布格局',
    language: '纳西族有本民族语言纳西语，属汉藏语系藏缅语族彝语支，分东、西两个方言，方言间差异较大。文字方面，有独特的东巴文和哥巴文，东巴文是迄今世界上仍在使用的最古老象形文字之一，多用于记录东巴教经典；哥巴文为音节文字，使用范围较东巴文小',
    history: '纳西族历史悠久，其先民最早可追溯到先秦时期的"牦牛羌"，隋唐时称"磨些蛮"，曾在滇西北建立"越析诏"政权，为"六诏"之一。元代后受中央王朝直接管辖，明清时期丽江木氏土司势力鼎盛，统辖滇西北大片区域，推动了纳西族与周边民族的文化交融',
    culture: {
      attire: { title: '纳西族服饰', desc: '纳西族服饰兼具实用性与民族特色，女性传统服饰最具代表性，上身着宽腰大袖短袄，外搭青布坎肩，下装为多褶围裙，腰间系绣花腰带，头戴"七星羊皮披肩"，披肩缀有刺绣日月纹与七个圆形布扣，象征"披星戴月"的勤劳。男性服饰相对简洁，多穿对襟短衫、长裤，外罩麻布或棉布长衫，戴毡帽，体现质朴风格', img: 'images/纳西族_服饰.jpg' },
      architecture: { title: '纳西族建筑', desc: '纳西族传统建筑以"三坊一照壁""四合五天井"为典型格局，多为土木结构，屋顶覆盖青瓦，墙面绘有山水、花鸟等图案。丽江古城是其建筑精华，房屋沿水而建，街道用青石板铺就，巷道交错，融合了汉、藏、白等民族建筑元素，既适应滇西北气候，又彰显"人与自然和谐共生"的理念，被列入世界文化遗产', img: 'images/纳西族_建筑.jpg' },
      festival: { title: '传统节日', desc: '纳西族重要节日有三朵节与火把节。三朵节是本民族最隆重的节日，每年农历二月初八举行，纪念纳西族保护神"三朵"，人们会祭祖、赛马、跳纳西舞，祈求平安丰收。火把节在农历六月二十四日，夜幕降临时，人们点燃火把巡游村寨，驱邪祈福，还会举办摔跤、对歌等活动，氛围热烈欢快', img: 'images/纳西族_节日.jpg' },
      food: { title: '纳西族饮食', desc: '纳西族饮食以稻、麦、玉米为主，口味偏酸辣、鲜香。特色美食"丽江粑粑"以面粉为原料，分咸甜两种，外酥内软，是当地标志性小吃；"腊排骨火锅"用腌制排骨搭配时蔬炖煮，汤鲜味浓；此外，还有酥油茶、鸡豆凉粉等，既保留了高原饮食的醇厚，又融入了本土食材的独特风味，体现民族饮食文化特色', img: 'images/纳西族_饮食.jpg' }
    }
  },
  { name: '景颇族', pinyin: 'Jingpozu', alpha: 'J', tags: ['目瑙纵歌','刀舞'], img: 'images/jingpo_cover.jfif',
    population: '约16.1万人',
    distribution: '主要聚居在云南德宏傣族景颇族自治州，占该族总人口的80%以上；少量分布在云南怒江、临沧及西藏察隅等地，多与傣、汉、阿昌等民族杂居。其聚居区多为山区丘陵，形成"大分散、小聚居"格局',
    language: '景颇族有景颇语和载瓦语两种主要语言，均属汉藏语系藏缅语族景颇语支，前者为景颇支系使用，后者为载瓦支系使用。文字方面，有19世纪末创制的景颇文（以拉丁字母为基础）和20世纪50年代改进的载瓦文，两种文字并行使用，多用于出版书籍、教材及日常交流',
    history: '景颇族先民最早居住在青藏高原东南部，唐代称"寻传蛮"，元代后逐渐南迁至滇西山区。明清时期，其社会形成"山官制度"，保持相对独立的部落管理模式。近代以来，景颇族积极参与抗英、抗日斗争，新中国成立后实行民族区域自治，逐步融入现代社会，同时保留了独特的民族文化传统',
    culture: {
      attire: { title: '景颇族服饰', desc: '男子穿白或黑色对襟上衣，戴缀花边和绒珠的包头，佩筒帕和腰刀。女子穿黑色对襟上衣，下着红黑相间织锦筒裙，腿带裹腿，喜戴大量银饰，银饰越多被认为越能干、富有', img: 'images/景颇族_服饰.jpg' },
      architecture: { title: '景颇族建筑', desc: '多为竹楼，建于斜坡上，分全楼式、半楼式等。以竹、木为主要材料，屋顶呈倒梯形，草顶，开门于一端，屋内设火塘，楼下通风，可饲养牲畜或堆放杂物，具有浓厚的地方特色和民族特色', img: 'images/景颇族_建筑.jpg' },
      festival: { title: '传统节日', desc: '目瑙纵歌节是最盛大的节日，于农历正月十五后择双日举行，人们身着盛装，欢聚歌舞。能仙节是青年男女聚会、唱歌跳舞的节日，在农历二月十日举行。此外还有新米节等，庆祝丰收，祈求来年风调雨顺', img: 'images/景颇族_节日.jpg' },
      food: { title: '景颇族饮食', desc: '主食为大米，常煮成浓粥或蒸成干饭，也吃苞谷、荞麦等。特色美食有舂干巴、酸笋煮鱼、竹筒饭等，菜肴口味偏好辣酸，喜用舂制的方式制作食物，还爱饮酒、嚼槟榔，饮食具有浓郁的边疆农耕渔猎民族气息和亚热带山林特色', img: 'images/景颇族_饮食.jpg' }
    }
  },
  { name: '柯尔克孜族', pinyin: 'Kezikezizu', alpha: 'K', tags: ['毡房','鹰猎'], img: 'images/keerkezi_cover.jfif',
    population: '约20.4万人',
    distribution: '主要聚居在新疆克孜勒苏柯尔克孜自治州，占该族总人口的70%以上；少量分布在新疆伊犁、阿克苏及黑龙江富裕县等地，与汉、维吾尔、哈萨克等民族杂居。其聚居区多为山区草原，部分保留游牧或半游牧生活模式',
    language: '柯尔克孜族通用柯尔克孜语，属阿尔泰语系突厥语族东匈语支，分南、北两个方言区，日常交流以北部方言为主。文字使用以阿拉伯字母为基础的柯尔克孜文，1954年经改进后更贴合口语习惯，多用于出版书籍、报刊及官方文书，同时部分地区也通用汉语、维吾尔语',
    history: '柯尔克孜族先民古称"坚昆""黠戛斯"，最早活动于叶尼塞河流域，唐代曾建立黠戛斯汗国，与唐朝往来密切。10世纪后逐渐西迁至天山地区，明清时期隶属叶尔羌汗国、清朝伊犁将军管辖。近代以来抵御外侮、维护边疆统一，新中国成立后实行民族区域自治，传统游牧文化与现代社会逐步融合',
    culture: {
      attire: { title: '柯尔克孜族服饰', desc: '男子常戴白毡帽"喀勒帕克"，穿驼毛长衣"且克麦恰袢"，脚蹬皮靴"乔勒克"。女子多穿裙装，未婚女子戴红色丝绒圆顶小花帽，已婚妇女戴缠布帽子"开来克"，服饰刺绣精美，喜用红色装饰', img: 'images/柯尔克孜族_服饰.jpg' },
      architecture: { title: '柯尔克孜族建筑', desc: '牧民多住圆形毡房，下半部为圆形，上半部为塔形，由柳木、桦木等制作框架，外覆毛毡，顶部有天窗，冬暖夏凉，拆装方便。定居者多住方形平顶土房，室内用挂毯、地毯等装饰，风格温馨', img: 'images/柯尔克孜族_建筑.jpg' },
      festival: { title: '传统节日', desc: '主要有诺鲁孜节，类似春节，人们用七种以上粮食做"克缺"庆祝。马奶节在农历小满后第二天，标志着开始食用马奶。喀尔戛托依节是妇女的节日，在阳历五月初一，妇女们唱歌跳舞，男人们准备食物', img: 'images/柯尔克孜族_节日.jpg' },
      food: { title: '柯尔克孜族饮食', desc: '以奶制品和肉类为主，如马奶、奶皮、奶油、手抓羊肉等，辅以面食，如馕、面条、油饼等。特色食品有"乌麻什""库依马克"等，还喜用青稞等发酵制成牙尔玛饮料，爱喝茯茶', img: 'images/柯尔克孜族_饮食.jpg' }
    }
  },
  { name: '土族', pinyin: 'Tuzu', alpha: 'T', tags: ['唐卡','婚俗'], img: 'images/tu_cover.webp',
    population: '约28.1万人',
    distribution: '核心聚居区在青海互助土族自治县，占全国土族人口的40%以上；此外在青海民和、大通及甘肃天祝、永登等地也有集中分布，多与汉、藏、回等民族杂居。聚居区多为河谷与山地过渡地带，适配农业与半农半牧的生产模式',
    language: '土族通用土族语，属阿尔泰语系蒙古语族，分互助、民和、同仁三个方言区，日常交流以互助方言为主。历史上无本民族文字，长期使用汉文；1979年创制了以拉丁字母为基础的土族文，现用于教材出版、文化传承，同时汉文仍是社会通用文字',
    history: '土族源于古代鲜卑族的一支，元代时与当地藏族、汉族等融合形成稳定民族共同体，明清时期属西宁卫、河州卫管辖，受中央王朝册封。近代参与西北反侵略、反压迫斗争，新中国成立后建立自治地方，传统"土司制度"逐渐退出，民族文化在保护中融入现代社会',
    culture: {
      attire: { title: '土族服饰', desc: '男子穿小领斜襟长衫，外套坎肩，腰系花头腰带，戴织锦镶边白毡帽等。女子穿七彩袖衫，由红、黄、绿等七色布拼成，外套坎肩，下穿褶裙或裤子，膝下套"帖弯"，头饰"扭达"样式多样', img: 'images/土族_服饰_new.jpg' },
      architecture: { title: '土族建筑', desc: '以庄廓院落为主，多为一户一庭院，筑方形高墙，墙头四角置白卵石。院内建土木结构房屋，一般3间正房和2间角房为一组，正房为堂屋、卧室或佛堂，厢房为晚辈住所，南房作仓库，大门开于一角，避免风沙和视线干扰', img: 'images/土族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '有正月十四佑宁寺官经会、二月二威远镇擂台会、三月三及四月八庙会等，六月十一丹麻戏会、六月十三和二十九"少年"会，七月廿三至九月民和三川地区的"纳顿"庆丰收会等，还有农历十二月十九日的于菟节，以驱邪祛病', img: 'images/土族_节日_new.jpg' },
      food: { title: '土族饮食', desc: '面食有油馃子、烧锅、哈力海等，哈力海是将荨麻与青稞面混合制成。肉食以牛、羊、猪肉为主，有面肠、油肠、血肠等特色做法。饮料首推酩醯子酒，由青稞酿造，还常喝黑砖茶熬成的酽茶，以及麦茶、油茶等', img: 'images/土族_饮食_new.jpg' }
    }
  },
  { name: '达斡尔族', pinyin: 'Dawoerzu', alpha: 'D', tags: ['曲棍','民歌'], img: 'images/dawoer_cover.webp',
    population: '约13.2万人',
    distribution: '主要分布在内蒙古莫力达瓦达斡尔族自治旗、鄂温克族自治旗，黑龙江齐齐哈尔及新疆塔城地区。其中莫力达瓦旗是核心聚居区，占全国该族人口的40%以上，多与汉、蒙古、鄂温克等民族杂居，适应东北平原、内蒙古草原及西北边疆的不同地理环境',
    language: '达斡尔族通用达斡尔语，属阿尔泰语系蒙古语族，分布特哈、齐齐哈尔、新疆三种方言，日常以布特哈方言为主。历史上无本民族文字，长期使用满文、汉文；1956年曾创制以拉丁字母为基础的文字，现多用于文化传承，社会通用中汉文，部分老人仍懂满文',
    history: '达斡尔族先民可追溯至古代"契丹"后裔，元代后聚居黑龙江流域，以渔猎、农耕为生。17世纪后因抵御沙俄迁徙至嫩江流域，清代被编入"布特哈八旗"，参与戍边。近代积极投身抗俄、抗日斗争，新中国成立后建立自治地方，传统渔猎文化与现代农业、工业逐步融合',
    culture: {
      attire: { title: '达斡尔族服饰', desc: '达斡尔族服饰兼具实用性与民族特色，男子常穿立领右衽长袍"奇卡米"，外套短坎肩，腰系宽布带，脚蹬皮靴"奇卡"，冬季戴狐皮或貉皮帽。女子穿连襟长袍"特日格"，下摆开衩，饰有绣花镶边，未婚女子梳双辫、戴刺绣头帕，已婚妇女盘发髻、插银簪，服饰色彩多以蓝、黑、灰为主，点缀红、绿等亮色', img: 'images/达斡尔族_服饰_new.jpg' },
      architecture: { title: '达斡尔族建筑', desc: '达斡尔族传统建筑分"介"（草房）和"木刻楞"两类。草房以土坯为墙，屋顶覆茅草，室内设"火炕"取暖；木刻楞用圆木搭建，榫卯连接，墙缝填苔藓防潮，适合寒冷气候。院落多为方形，设"绰克格"（仓房）存放粮食，院门朝东南，避免北风直吹，院内常种果树、蔬菜，兼具生活与生产功能', img: 'images/达斡尔族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '达斡尔族重要节日有"阿涅"（春节），除夕吃手把肉、喝黄酒，初一拜年祭祖；"库木勒"（柳蒿芽）节在五月，人们采柳蒿芽做菜，祭天地、庆丰收；"抹黑节"在正月十六，晚辈给长辈额头抹黑，寓意驱邪祈福。此外，还会过端午节、中秋节，习俗融合汉族文化，又保留本民族特色', img: 'images/达斡尔族_节日_new.jpg' },
      food: { title: '达斡尔族饮食', desc: '达斡尔族饮食以米面、肉、蔬菜为主，特色美食"库木勒"（柳蒿芽炖肉）是待客佳品；"手把肉"用羊肉或猪肉煮制，蘸蒜泥食用；面食有"稷子米干饭""荞麦面条"，还有油炸面食"油饼子"。饮品喜好"黄酒"，用稷子米发酵制成，度数低、口感醇，冬季常喝奶茶、油茶驱寒，饮食贴合北方寒冷气候特点', img: 'images/达斡尔族_饮食_new.jpg' }
    }
  },
  { name: '仫佬族', pinyin: 'Mulaozu', alpha: 'M', tags: ['盘王','纺织'], img: 'images/mulao_cover.jpeg',
    population: '约21.66万人',
    distribution: '主要分布在广西壮族自治区，是广西的重要民族之一',
    language: '仫佬语（汉藏语系壮侗语族侗水语支）',
    history: '仫佬族是广西的古老民族，其先民可追溯到古代"僚"人，在长期的历史发展中形成了独特的文化',
    culture: {
      attire: { title: '仫佬族服饰', desc: '仫佬族传统服饰以青蓝色为主，男子多穿对襟短衣，女子多穿短衣长裙，服饰上多有刺绣，体现了纺织文化的特色', img: 'images/仫佬族_服饰_new.jpg' },
      architecture: { title: '仫佬族建筑', desc: '仫佬族传统建筑以木结构为主，适应山地环境，体现了仫佬族的建筑特色', img: 'images/仫佬族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '仫佬族的主要传统节日包括依饭节、走坡节等，这些节日体现了仫佬族的文化特色', img: 'images/仫佬族_节日_new.jpg' },
      food: { title: '仫佬族饮食', desc: '仫佬族饮食以大米为主食，特色食品有白切鸡、酸菜等，体现了仫佬族的饮食特色', img: 'images/仫佬族_饮食_new.png' }
    }
  },
  { name: '羌族', pinyin: 'Qiangzu', alpha: 'Q', tags: ['碉楼','羊皮鼓'], img: 'images/qiang_cover.jpg',
    population: '约31.2万人',
    distribution: '主要聚居在四川阿坝州的汶川、茂县、理县、松潘及绵阳北川羌族自治县，少量分布在甘肃文县等地。聚居区多为川西北高山峡谷地带，海拔较高、气候寒凉，长期与汉、藏、回等民族杂居，形成了适应山地环境的生产生活模式',
    language: '羌族通用羌语，属汉藏语系藏缅语族羌语支，分北部、南部两大方言，方言间差异较大，部分地区需借助汉语沟通。历史上无本民族文字，长期靠口传心授传承文化；1989年创制以拉丁字母为基础的"羌文"，现多用于学校教学与文化保护，社会通用汉文',
    history: '羌族是中国最古老的民族之一，先民为商周时期的"西羌"，曾在西北高原活动，后逐步南迁。秦汉时纳入中央管辖，唐代后聚居川西北，以农耕、畜牧为生，创造了灿烂的"羌文化"。近代历经战乱仍保留民族特色，新中国成立后建立自治地方，碉楼、羌绣等文化遗产被重点保护',
    culture: {
      attire: { title: '羌族服饰', desc: '羌族服饰以麻布和羊皮为主要原料，色彩鲜明且兼具实用性。男子常穿青色或白色右衽长袍，外套羊皮褂，腰系绣花腰带，脚蹬云云鞋。女子服饰更精致，穿蓝色或绿色大襟衫，袖口、衣襟绣有花鸟纹，围绣花围裙，头戴绣帕或"瓦式"头帕，未婚女子梳双辫，已婚妇女盘发髻并插银簪，整体展现出浓郁的山地民族风格', img: 'images/羌族_服饰_new.jpg' },
      architecture: { title: '羌族建筑', desc: '羌族传统建筑以碉楼和石砌房最具特色。碉楼用石块垒砌，高达数层至十几层，呈方形或六角形，墙体坚固，用于防御和储物。石砌房依山而建，以石块、黄泥为原料，屋顶覆木板或石板，室内设火塘，是家庭活动中心。村寨多建在半山或河谷，房屋错落有致，还会修建引水渠，既方便生活又能灌溉农田', img: 'images/羌族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '羌族最重要的节日是羌年（农历十月初一），人们宰羊、酿酒，祭祀山神和祖先，跳"莎朗舞""锅庄舞"庆祝。此外，"祭山会"在春季举行，村民聚集在神山脚下，由"释比"（巫师）主持仪式，祈求风调雨顺、五谷丰登。还有"端午节""中秋节"等，习俗融合汉族元素，但仍保留祭祀、歌舞等民族特色', img: 'images/羌族_节日_new.jpg' },
      food: { title: '羌族饮食', desc: '羌族饮食贴合山地生活，主食以玉米、土豆、荞麦为主，常做玉米馍、土豆糍粑。特色菜肴有"咂酒"（青稞或玉米发酵制成，用竹管吸吮）、"手抓羊肉"（煮制后蘸椒盐）、"酸菜面块"（酸菜与面块同煮，酸辣开胃）。冬季喜食腊肉、香肠，多通过熏制保存，饮品除咂酒外，还有奶茶、蜂蜜酒，口感醇厚', img: 'images/羌族_饮食_new.jpg' }
    }
  },
  { name: '布朗族', pinyin: 'Bulangzu', alpha: 'B', tags: ['茶文化','刀舞'], img: 'images/bulang_cover.webp',
    population: '约12.7万人',
    distribution: '主要聚居在云南西双版纳傣族自治州勐海县、临沧市双江拉祜族佤族布朗族傣族自治县，少量分布在普洱、保山等地。聚居区多为亚热带山区，气候湿热，以山地农业为主，长期与傣、哈尼、拉祜等民族杂居，生活习俗受周边民族文化影响，又保留自身特色',
    language: '布朗族通用布朗语，属南亚语系孟高棉语族佤德昂语支，分西双版纳、临沧两个方言，方言间沟通有一定障碍。历史上无本民族文字，部分地区曾借用傣文记录事务；现虽有学者创制以拉丁字母为基础的拼音文字，但未普及，日常交流用布朗语，社会事务多使用汉文或傣文',
    history: '布朗族源于古代"百濮"族群，先秦时期已在云南西南部活动，唐代文献中称"朴子蛮"，元明清时期属傣族土司管辖，以种植水稻、茶叶为生，是最早人工栽培茶树的民族之一。新中国成立后，逐步实行民族区域自治，传统茶农经济与现代产业结合，茶文化成为民族文化核心符号',
    culture: {
      attire: { title: '布朗族服饰', desc: '布朗族服饰以黑、青为基调，兼具实用性与民族特色。男子穿对襟短衫、黑色长裤，缠黑色或白色头帕，肩挎绣花挂包。女子服饰更精致，穿窄袖大襟短衣，衣襟、袖口绣彩色花纹，下着筒裙，裙身多为黑色或深蓝色，腰间系绣花腰带，头戴绣花头帕或银饰，部分地区女子还会在小腿缠绑腿，适应山地行走', img: 'images/布朗族_服饰_new.jpg' },
      architecture: { title: '布朗族建筑', desc: '布朗族传统民居为干栏式建筑，多依山而建。房屋以木为架，底层架空，用于圈养牲畜、堆放杂物；上层住人，铺木板为floor，设火塘作为家庭活动中心。屋顶呈"人"字形，覆盖茅草或瓦片，通风防潮，适配湿热气候。村寨多建在山腰，房屋密集排列，还会设寨心桩、缅寺，体现宗教与生活的融合', img: 'images/布朗族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '布朗族最隆重的节日是开门节和关门节，与傣族习俗相近，时间在傣历九月至十二月。关门节期间，民众停止婚丧嫁娶，专注农事与宗教活动；开门节则解除禁忌，举行歌舞、赕佛仪式。此外，"年节"（春节前后）会宰猪杀鸡、酿酒，走亲访友；"祭茶祖"仪式则体现对茶树的崇拜，祈求茶叶丰收', img: 'images/布朗族_节日_new.jpg' },
      food: { title: '布朗族饮食', desc: '布朗族以稻米为主食，喜食糯米饭，擅长制作竹筒饭、粑粑。特色菜肴有"舂鸡脚"（酸辣口味）、"烤肉"（用香茅草包裹烤制），日常爱吃野菜、竹笋。因善种茶，饮茶是生活重要部分，还会酿制"水酒"（以稻谷、玉米发酵制成，口感清甜），待客时必敬茶、敬酒，体现热情好客的习俗', img: 'images/布朗族_饮食_new.jpg' }
    }
  },
  { name: '撒拉族', pinyin: 'Salazu', alpha: 'S', tags: ['伊斯兰','歌舞'], img: 'images/sala_cover.webp',
    population: '约16.5万人',
    distribution: '主要聚居在青海循化撒拉族自治县、化隆县甘都乡及甘肃积石山保安族东乡族撒拉族自治县，少量散居青海西宁、新疆伊宁等地，多生活在青藏高原边缘，与汉、藏等民族杂居',
    language: '撒拉语属阿尔泰语系突厥语族，分街子、孟达方言，有8个元音、29个辅音，借词多来自汉语等。无本民族文字，曾用阿拉伯-波斯字母拼写的"土尔克文"，现通用汉文，部分人兼通汉、藏等语言',
    history: '撒拉族源于突厥乌古斯部撒鲁尔，先民元代从中亚撒马尔罕迁青海循化。通过与藏族通婚延续族群，长期与多民族交融，除清代反清起义外多归顺中央，1954年正式确认为单一民族',
    culture: {
      attire: { title: '撒拉族服饰', desc: '男子头戴黑、白色圆顶帽，穿白汗衫、黑坎肩，系布绸带，下着大裆裤。妇女多穿长衣，戴盖头，年轻姑娘和新婚妇女盖头为绿色，中年妇女为黑色，老年妇女为白色，喜戴首饰，节庆时披花边披风', img: 'images/撒拉族_服饰_new.jpg' },
      architecture: { title: '撒拉族建筑', desc: '撒拉族建筑主要包括清真寺建筑和民居建筑。传统清真寺建筑一般由照壁、大门、唤礼楼、礼拜殿，南北配房及围墙组成。民居建筑布局为中国北方四合院式、土木结构的平顶房，庄廊墙是用封闭的黄土夯实的方形，墙体横切面呈底厚顶薄梯形，围墙四角顶放置白石头', img: 'images/撒拉族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '主要有开斋节、古尔邦节、圣纪节等。此外，还有转"拜拉特夜"节、"法蒂玛"节、"盖德尔"节等，其中转"拜拉特夜"节在斋月前第15天夜举行，各家各户邀请阿訇到家诵经', img: 'images/撒拉族_节日_new.jpg' },
      food: { title: '撒拉族饮食', desc: '以小麦为主食，辅以青稞、荞麦等，常做花卷、焜锅馍等。节日或招待客人时，会炸油香、搓馓子、做手抓羊肉等。奶茶和麦茶是喜爱的饮料，肉食主要食用牛肉、羊肉和鸡肉，忌食驴、骡、猪、狗等肉类', img: 'images/撒拉族_饮食_new.jpg' }
    }
  },
  { name: '毛南族', pinyin: 'Maonanzu', alpha: 'M', tags: ['独弦琴','石山'], img: 'images/maonan_cover.jfif',
    population: '约12.4万人',
    distribution: '聚居区集中在广西壮族自治区河池市环江毛南族自治县，这是全国唯一的毛南族自治县，少量分布在河池南丹、宜州及贵州平塘、独山等地，多生活在喀斯特山区，与壮、汉、苗等民族杂居',
    language: '毛南族有本民族语言毛南语，属汉藏语系壮侗语族侗水语支，分环江、南丹两个方言，日常交流用毛南语，多数人兼通汉语和壮语。历史上毛南族无本民族文字，长期借用汉文记录事务，现虽有学者设计以拉丁字母为基础的拼音文字方案，但未普及，社会生活中仍以汉文为主',
    history: '毛南族源于古代"百越"族群中的"骆越"支系，宋代文献中始见"茅滩""茆滩"等族称记载，明清时期被称为"毛难"，世代聚居在桂北山区，以农耕和手工业为生，擅长编织竹器、制作木雕。1956年被识别为单一民族，1986年经国务院批准，正式将族称"毛难族"改为"毛南族"',
    culture: {
      attire: { title: '毛南族服饰', desc: '毛南族服饰以青、蓝、黑为主要色调，兼具实用性与民族特色。男子穿对襟上衣、宽腿长裤，系布腰带，头戴青色或黑色头巾。女子服饰更精致，穿右衽立领短衫，袖口、衣襟绣有花鸟纹样，下着滚边宽脚裤，系绣花围裙，梳发髻并插银簪，戴耳环、手镯等银饰，节庆时还会披绣花披肩，凸显温婉风格', img: 'images/毛南族_服饰_new.jpg' },
      architecture: { title: '毛南族建筑', desc: '毛南族传统民居为干栏式木楼，适配喀斯特山区潮湿环境。房屋以木为架，底层架空，用于堆放杂物、圈养牲畜；上层住人，分堂屋、卧室、厨房，堂屋设神龛，厨房置火塘。屋顶覆盖瓦片或茅草，呈"人"字形，墙体多为木板或夯土，部分人家会在屋檐下挂玉米、辣椒，既实用又具生活气息，村寨多沿山脚或溪流分布', img: 'images/毛南族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '毛南族最隆重的节日是分龙节，每年农历五月间举行，是祭祀神灵、祈求风调雨顺的传统节日，会举办祭龙、对歌、抛绣球、打陀螺等活动。此外，春节时会贴春联、吃团圆饭，清明祭祖扫墓，中秋赏月，部分节日习俗与汉族相近，但会融入本民族特色，比如分龙节的"椎牛"仪式（现多以象征性活动替代）', img: 'images/毛南族_节日_new.jpg' },
      food: { title: '毛南族饮食', desc: '毛南族以稻米为主食，擅长制作五色糯米饭、米粉、糍粑等。特色菜肴有"酸肉""酸鸭"（用糯米腌制，风味独特）、"毛南三酸"（酸笋、酸豆角、酸辣椒），日常喜食野菜、竹笋和鱼。饮酒习俗普遍，多饮自酿的米酒，待客时会摆"八仙桌"，上齐荤素菜肴，体现热情好客，饮食口味偏酸辣，适配山区气候', img: 'images/毛南族_饮食_new.jpg' }
    }
  },
  { name: '塔吉克族', pinyin: 'Tajikezu', alpha: 'T', tags: ['鹰舞','高原'], img: 'images/tajike_cover.jpeg',
    population: '约5.1万人',
    distribution: '主要聚居在新疆塔什库尔干塔吉克自治县，少量分布在莎车、泽普等周边县域，生活在帕米尔高原海拔3000米以上区域，世代以游牧和高原农耕为生，是守卫边疆的重要民族，与柯尔克孜、维吾尔等民族和睦共处',
    language: '塔吉克语属印欧语系伊朗语族东伊朗语支，分色勒库尔和瓦罕两个方言，色勒库尔方言为主要交际语言。历史上曾使用波斯文，现通用以阿拉伯字母为基础的塔吉克文，同时因交流需求，多数人兼通维吾尔语和汉语，日常文书、教育教学中，塔吉克文与汉文、维吾尔文并行使用',
    history: '塔吉克族是古代"揭盘陀国"居民的后裔，西汉时已在帕米尔高原活动，唐代属安西都护府管辖，长期承担边疆守卫职责。历史上与周边民族及中亚、南亚文化交流频繁，形成独特的高原文化，1954年塔什库尔干塔吉克自治县成立，其传统游牧文化、鹰舞艺术等成为民族历史的重要印记',
    culture: {
      attire: { title: '塔吉克族服饰', desc: '男子戴黑绒圆高统"吐马克"帽，穿黑色袷袢。妇女戴"库勒塔"帽，穿连衣裙，已婚妇女系彩色围裙。男女都着毡袜、长筒羊皮软靴。妇女盛装时戴银链、耳环、项链等首饰，色彩艳丽，极具民族特色', img: 'images/塔吉克族_服饰_new.jpg' },
      architecture: { title: '塔吉克族建筑', desc: '多为正方平顶、木石结构的房屋，墙壁用石块、草皮砌成，厚而结实。顶部架树枝，抹泥土，开天窗。室内较低矮，四周筑土炕，长辈、客人和晚辈分侧而居，还有牲畜棚圈、厨房等附属建筑', img: 'images/塔吉克族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '最隆重的是"肖贡巴哈尔节"，在每年春分前后举行，有"新年""迎春"之意。届时有破冰引水、开犁播种等农事仪式，还有鹰舞、赛马、民歌等非遗展演，人们共同祈愿风调雨顺，热闹非凡', img: 'images/塔吉克族_节日_new.jpg' },
      food: { title: '塔吉克族饮食', desc: '牧民以奶类、肉类和面食为主，农民以面食为主。善于制作酥油、酸奶等奶品，食物多煮食，"抓肉""牛奶煮米饭"等为上好食品，爱饮加牛奶的奶茶，还喜食馕、烤包子等，肉食以羊、牛、骆驼为主，忌食猪、马等动物', img: 'images/塔吉克族_饮食_new.jpg' }
    }
  },
  { name: '锡伯族', pinyin: 'Xibozu', alpha: 'X', tags: ['射艺','西迁'], img: 'images/xibo_cover.jfif',
    population: '约19.1万人',
    distribution: '主要聚居在新疆伊犁哈萨克自治州察布查尔锡伯自治县，这是全国唯一的锡伯族自治县，此外在辽宁、吉林、黑龙江等东北省份及内蒙古也有分布，新疆的锡伯族多保留传统习俗，东北的锡伯族则与汉族等民族深度融合',
    language: '锡伯族有本民族的锡伯语和锡伯文，锡伯语属阿尔泰语系满-通古斯语族满语支，与满语相近。锡伯文是1947年在满文基础上改革而成的拼音文字，保留满文基本字母，调整部分拼写规则。目前新疆锡伯族聚居区仍在使用锡伯语和锡伯文，学校设相关课程，东北锡伯族则多使用汉语，少数老人会说锡伯语',
    history: '锡伯族源于古代鲜卑族，历史上曾在东北大兴安岭一带活动，元代后被称为"锡伯"，明清时期隶属满洲八旗，以狩猎、农耕为生。1764年，部分锡伯族官兵及家眷奉命从东北西迁新疆戍边，形成如今"东锡伯"与"西锡伯"的分布格局，西迁历史也成为锡伯族文化的重要精神符号，1953年被正式确认为单一民族',
    culture: {
      attire: { title: '锡伯族服饰', desc: '锡伯族服饰兼具游牧与农耕特色，色彩鲜明。男子穿左右开襟的蓝、青色长袍"查布萨"，系红、绿腰带，戴圆顶帽；女子穿长及脚面的旗袍式连衣裙"塔克西"，领口、袖口绣花卉纹样，下摆开叉，配绣花围裙，未婚女子梳长辫、戴耳环，已婚女子盘发髻。节庆时还会穿绣有吉祥图案的马甲，部分服饰细节保留满语支民族风格', img: 'images/锡伯族_服饰_new.jpg' },
      architecture: { title: '锡伯族建筑', desc: '锡伯族传统民居为"人"字形屋顶的土木结构平房，称"海青房"，墙体用泥土夯筑或土坯砌筑，屋顶覆盖茅草或瓦片，保暖性强。屋内分卧室、客厅、厨房，客厅设火炕，是家庭活动核心，部分人家会搭建小院，院内种果树、蔬菜。新疆锡伯族聚居区的房屋还会设"廊房"，用于晾晒作物，适配当地气候与生活需求', img: 'images/锡伯族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '锡伯族最隆重的节日是西迁节，每年农历四月十八举行，纪念1764年西迁戍边的历史，会举办射箭、摔跤、歌舞表演等活动。此外，春节时会贴春联、吃团圆饭，正月十五"元宵节"挂灯笼、猜灯谜，还有"抹黑节"（农历正月十六），人们互相抹黑脸祈福，节日习俗既保留民族特色，也融入部分汉族元素', img: 'images/锡伯族_节日_new.jpg' },
      food: { title: '锡伯族饮食', desc: '锡伯族以米面为主食，擅长制作"查布萨"（一种油饼）、"萨其玛"、手擀面。特色菜肴有"花花菜"（腌白菜炒肉丝）、"血肠""烤全羊"，尤其喜爱"查尔森"（一种用牛肉、羊肉熬制的浓汤）。饮酒习俗普遍，多饮自酿的米酒和"锡伯族白酒"，待客时会摆"全羊宴"，体现热情好客，饮食口味偏咸鲜，注重食材本味', img: 'images/锡伯族_饮食_new.jpg' }
    }
  },
  { name: '阿昌族', pinyin: 'Achangzu', alpha: 'A', tags: ['刀具','腾冲'], img: 'images/achang_cover.jfif',
    population: '约4.3万人',
    distribution: '其分布集中在滇西地区，核心聚居区为德宏傣族景颇族自治州的陇川、梁河两县，少量分布在保山腾冲及大理云龙等地，多与傣、汉、景颇等民族杂居，生活区域以山地、河谷为主，部分村落保留传统聚居形态',
    language: '阿昌语属汉藏语系藏缅语族缅语支，分陇川、梁河、潞西三个方言，方言间可基本通话，多数人兼通汉语和傣语。阿昌族历史上无本民族文字，曾长期借用汉文和傣文记录事务。20世纪80年代，学者以梁河方言为基础，设计了以拉丁字母为基础的拼音文字方案，但尚未广泛普及，日常交流仍以口语为主',
    history: '阿昌族历史可追溯至古代"寻传蛮"，唐代文献已有记载，宋元时期称"峨昌"，明清时逐步形成现代民族形态。历史上阿昌族以农耕为主，擅长种植水稻和打铁，"阿昌刀"制作技艺享誉滇西。长期与周边民族交流融合，部分习俗受傣族、汉族影响，1953年被正式识别为单一民族，其打铁、制陶等传统技艺成为民族文化标志',
    culture: {
      attire: { title: '阿昌族服饰', desc: '男子以帕包头，穿对襟短衣、大档长裤，小腿系花边腿套。年轻姑娘梳辫盘头，插鲜花，穿圆领大襟衣、筒裙，腰系花边围腰；已婚妇女拢发为髻，戴黑色高筒包头，着蓝土布哨脚衣与筒裙', img: 'images/阿昌族_服饰_new.jpg' },
      architecture: { title: '阿昌族建筑', desc: '多为土木或砖木结构的"四合院"，由正房加两纵厢房、一堵照壁组成。正房中间为堂屋，设神龛、火塘，是活动中心。建房习俗繁琐，搬迁新居需选吉日，举行祭祀仪式', img: 'images/阿昌族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '最隆重的是"阿露窝罗节"，于每年公历3月19-20日举行，由"窝罗节"与"会街节"统一而来，纪念人类始祖遮帕麻与遮米麻，届时有祭祀、歌舞等活动，还会举办射箭、摔跤等传统体育比赛', img: 'images/阿昌族_节日_new.jpg' },
      food: { title: '阿昌族饮食', desc: '以大米为主食，喜酸辣，有酸笋煮鸡、酸笋煮排骨等菜品，特色美食有"过手米线""黄花粑粑"等。喜欢自酿米酒，以酒待客，有贵宾来访，还会在村口请喝"进寨酒"', img: 'images/阿昌族_饮食_new.jpg' }
    }
  },
  { name: '普米族', pinyin: 'Pumizu', alpha: 'P', tags: ['宗教','民居'], img: 'images/pumi_cover.jfif',
    population: '约4.5万人',
    distribution: '国内主要聚居在云南西北部的兰坪、宁蒗、丽江、维西等地，以及四川西南部的木里、盐源两县，多分布在海拔2000-3500米的山区，常与纳西、彝、白等民族杂居，部分村落保留传统聚居形态，生活环境与山地农耕、畜牧经济相适配',
    language: '普米语属汉藏语系藏缅语族羌语支，分南部（云南）和北部（四川）两个方言，方言间差异较小。普米族历史上无本民族文字，曾长期借用汉文和藏文记录事务，日常交流以口语为主。20世纪80年代，学者以南部方言为基础，设计了以拉丁字母为基础的拼音文字方案，但仅在部分研究和教学中使用，未广泛普及',
    history: '普米族源于古代羌人，早期生活在青藏高原东部，后逐渐南迁，唐宋时期被称为"西番"，元明清时期逐步定居滇川边境山区，以农耕和畜牧为生。历史上曾受藏族、纳西族土司管辖，部分习俗受藏传佛教和东巴文化影响。1960年被正式确认为单一民族，其"韩规"宗教文化、传统历法等，是民族历史的重要文化载体',
    culture: {
      attire: { title: '普米族服饰', desc: '男子穿对襟麻布衣、宽大长裤，披羊皮领褂，富者穿氆氇大衣；女子穿麻布大襟衣、毛线长裙，背羊皮，戴银饰，用彩带束腰，喜将牦牛尾编入发辫，以发辫粗大为美', img: 'images/普米族_服饰_new.jpg' },
      architecture: { title: '普米族建筑', desc: '多为"人"字形屋顶的土木结构平房，称"海青房"，墙体用泥土夯筑或土坯砌筑，屋顶覆盖茅草或瓦片，保暖性强。屋内分卧室、客厅、厨房，客厅设火炕，是家庭活动核心，部分人家会搭建小院，院内种果树、蔬菜', img: 'images/普米族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '主要有"吾昔节"，在农历腊月初六至初八举行，类似新年，有祭神、祭祖、"成丁礼"等仪式，还会开展赛跑、摔跤、"搓蹉"舞等活动；"转山节"源于对山川的敬畏，祭山祈福，强化村落间的情感纽带', img: 'images/普米族_节日_new.jpg' },
      food: { title: '普米族饮食', desc: '以玉米为主食，兼食大米、青稞等。喜食猪、羊、牛肉，猪膘肉是特色食品，形似琵琶，可长期保存。爱喝酥油茶、水酒，有石头烤粑粑、羊胃煮肉等传统吃法，"尝新节"会先给狗吃新米饭，以表尊敬', img: 'images/普米族_饮食_new.jpg' }
    }
  },
  { name: '塔塔尔族', pinyin: 'Tataerzu', alpha: 'T', tags: ['饮食','乐舞'], img: 'images/tataer_cover.jfif',
    population: '约3544人',
    distribution: '主要分布在新疆维吾尔自治区，以乌鲁木齐市、昌吉回族自治州、伊犁哈萨克自治州等地较为集中，少量居住在塔城、阿勒泰地区。他们多与哈萨克、维吾尔、汉等民族杂居，形成小聚居、大分散的居住格局，适应了新疆多民族共居的社会环境',
    language: '塔塔尔族语言属阿尔泰语系突厥语族西匈奴语支，与哈萨克语、维吾尔语相近，日常交流以本民族语言为主，多数人兼通汉语、哈萨克语或维吾尔语。塔塔尔族有本民族文字，以阿拉伯字母为基础创制，曾用于书写书籍、报刊，但现日常文书、教育多通用汉文或哈萨克文，民族文字主要在文化传承中保留',
    history: '塔塔尔族源于蒙古草原的"鞑靼"部落，19世纪起，部分塔塔尔人从沙俄统治下的伏尔加河下游地区，陆续迁入中国新疆，从事商业、手工业和农业。迁入后，他们与当地各民族交流融合，逐渐形成中国境内的塔塔尔族。其民族文化融合了突厥传统与中亚特色，1953年正式确定"塔塔尔族"为民族名称，商贸传统是其重要文化标识',
    culture: {
      attire: { title: '塔塔尔族服饰', desc: '男子穿绣花白衬衫，配黑背心或长衫，戴丝绒帽或皮帽。女子穿宽腿裤、带皱边长裙，戴镶珠小花帽，披丝头巾，饰以珠宝。服饰色彩鲜艳，刺绣精美，牧区与城市略有差异', img: 'images/塔塔尔族_服饰_new.jpg' },
      architecture: { title: '塔塔尔族建筑', desc: '城市住房多为土木或砖木结构，庭院布局精巧，有果园、花池等，房屋墙壁厚，屋顶有铁皮或草泥，窗户双层。牧区住毡房，与哈萨克族类似，便于游牧', img: 'images/塔塔尔族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '主要有肉孜节、古尔邦节等宗教节日，也过撒班节，这是其特有的节日，类似汉族春节，在6月中旬到下旬举行，人们载歌载舞，还会举行赛马、摔跤等活动', img: 'images/塔塔尔族_节日_new.jpg' },
      food: { title: '塔塔尔族饮食', desc: '主食有烤面饼、抓饭等，喜食牛羊肉，特色食品有"古拜底埃""伊特白里西"，前者用大米、奶油等烤制，后者以南瓜为主料，还喜欢喝"克尔西曼""克赛勒"等特色饮料', img: 'images/塔塔尔族_饮食_new.jpg' }
    }
  },
  { name: '鄂温克族', pinyin: 'Ewenkezu', alpha: 'E', tags: ['驯鹿','桦皮'], img: 'images/ewenke_cover.jfif',
    population: '约3.4万人',
    distribution: '国内主要聚居在内蒙古呼伦贝尔的鄂温克族自治旗、陈巴尔虎旗等地，少量分布在黑龙江讷河及新疆塔城。因生产方式不同，聚居区分为牧区、农区和林区，部分仍保留传统游牧或狩猎习俗，与蒙古、汉、达斡尔等民族杂居共生',
    language: '鄂温克语属阿尔泰语系满-通古斯语族通古斯语支，分海拉尔、陈巴尔虎、敖鲁古雅三个方言，对应不同聚居区的生产生活场景。该民族无本民族文字，历史上长期靠口耳相传传承文化，现通用汉文和蒙古文，部分学校会开设鄂温克语课程，通过语言教材、民间故事收集等方式保护民族语言',
    history: '鄂温克族历史可追溯到先秦时期的"肃慎""挹娄"族群，古代称"通古斯""雅库特"等。历史上以狩猎、游牧为生，17世纪后逐步南迁，部分受清政府管辖并参与边防。近代经历生产方式转型，部分从狩猎转向畜牧业或农业。1949年后，其传统驯鹿文化、狩猎习俗被保护，成为中国北方民族文化的重要组成部分',
    culture: {
      attire: { title: '鄂温克族服饰', desc: '猎区鄂温克族多穿兽皮衣服，冬季用厚狍皮，夏季用光板没毛的兽皮，下身穿狍皮或犴皮裤子。牧区则常用羊皮制作衣物，如羊皮大衣、羊羔皮袄等，帽子以狍头皮帽最具特色', img: 'images/鄂温克族_服饰_new.jpg' },
      architecture: { title: '鄂温克族建筑', desc: '猎区传统住"仙人柱"，是用木杆搭成的圆锥形窝棚，上部用桦树皮苫盖，下部夏秋用布围，冬季用犴皮围。牧区多住蒙古包，农区则是草房或砖房', img: 'images/鄂温克族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '主要有敖包会，每年四、五月间举行，宰杀牲畜祭祀，祈求人畜兴旺，还会开展赛马、摔跤等活动；"米阔勒"节在五月，庆祝牧业丰收，人们给牲畜去势、烙印，之后聚餐庆祝', img: 'images/鄂温克族_节日_new.jpg' },
      food: { title: '鄂温克族饮食', desc: '猎区以兽肉为主，喜欢喝驯鹿奶做的奶茶，吃"列巴"。牧区主要食品是牛羊肉和奶制品，奶茶必备。农区以米面为主食，搭配蔬菜和野菜', img: 'images/鄂温克族_饮食_new.jpg' }
    }
  },
  { name: '鄂伦春族', pinyin: 'Elunchunzu', alpha: 'E', tags: ['狩猎','桦皮船'], img: 'images/elunchun_cover.jfif',
    population: '约9168人',
    distribution: '主要分布在黑龙江省和内蒙古自治区，核心聚居区为黑龙江的塔河、呼玛、逊克，以及内蒙古的鄂伦春自治旗、莫力达瓦达斡尔族自治旗等地。过去以游猎为生，随兽群迁徙，现多定居在政府规划的新村，仍保留部分与山林相关的文化印记',
    language: '鄂伦春族语言属阿尔泰语系满-通古斯语族通古斯语支，与鄂温克语、赫哲语相近，日常交流以本民族语言为主，多数人兼通汉语。该民族无传统文字，历史上靠口述传承文化，1957年语言工作者曾为其创制拉丁字母拼音文字方案，但未普及。现通用汉文，民族语言主要通过民歌、传说等口头文学形式保留',
    history: '鄂伦春族源于古代"肃慎""挹娄"族群，历史上被称为"使鹿部""索伦部"等，长期以狩猎、捕鱼为生，逐水草和兽群迁徙。明清时期受中央政权管辖，清末民初因森林开发和政策变化，逐渐从游猎向定居过渡。1951年成立鄂伦春自治旗，正式确定"鄂伦春族"为民族名称，现逐步融入现代社会，同时注重保护狩猎文化遗产',
    culture: {
      attire: { title: '鄂伦春族服饰', desc: '过去以兽皮为主，狍皮居多，有长皮袄"苏恩"、短皮袄"卡里那"等，手套、鞋、帽也用狍皮制作，且多绣花纹。定居后服饰趋于汉化，节庆日才着民族服饰', img: 'images/鄂伦春族_服饰_new.jpg' },
      architecture: { title: '鄂伦春族建筑', desc: '游猎时主要住"斜仁柱"，呈圆锥形，用树干搭骨架，覆盖狍皮、桦树皮等。还有高脚仓库"奥伦"，用于存放物品。定居后也有木刻楞房等，但部分地区仍保留传统"斜仁柱"', img: 'images/鄂伦春族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '主要节日是篝火节，由传统祭祀火神活动演变而来，1991年确定为每年6月18日。节日期间有祈福、文艺演出、非遗展示、竞技比赛等活动，人们围着篝火载歌载舞，2009年入选内蒙古自治区级非物质文化遗产保护名录', img: 'images/鄂伦春族_节日_new.jpg' },
      food: { title: '鄂伦春族饮食', desc: '定居前以肉为主，如狍子肉、鹿肉等，吃法有煮肉、烧肉、烤肉等，还食用野菜、面食，特色菜肴有"漆油鸡"。喜欢吸烟和饮酒，现饮食种类更丰富，但仍保留部分传统特色', img: 'images/鄂伦春族_饮食_new.jpg' }
    }
  },
  { name: '赫哲族', pinyin: 'Hezhezu', alpha: 'H', tags: ['鱼皮','桦树皮'], img: 'images/hezhe_cover.png',
    population: '约5354人',
    distribution: '核心聚居区集中在黑龙江、松花江和乌苏里江流域，主要分布在黑龙江省的同江市、饶河县、抚远市，以及佳木斯市郊区等地，少数散居在吉林省和内蒙古自治区。他们世代依江而居，生活与渔业生产紧密相连，现部分人仍以捕鱼为业，保留着渔猎文化特征',
    language: '赫哲族语言属阿尔泰语系满-通古斯语族满语支，与鄂伦春语、鄂温克语有亲属关系，日常交流中多数人兼通汉语，纯用本民族语言者较少。历史上无传统文字，曾用满文记录少量文献，1930年语言学者创制过以拉丁字母为基础的文字方案，未普及。现通用汉文，民族语言主要通过民间故事、歌谣、渔歌等口头形式传承',
    history: '赫哲族源于古代"肃慎""挹娄""勿吉"族群，唐代称"黑水靺鞨"，明清时期被称为"黑斤""赫哲"等，世代以渔猎为生，擅长捕鱼和制作鱼制品。历史上受中央政权管辖，清末民初因流域开发，生产生活方式逐渐变化。1949年后，通过民族识别正式定名为"赫哲族"，现虽逐步定居并发展多元产业，但渔猎文化仍是民族身份的重要标志',
    culture: {
      attire: { title: '赫哲族服饰', desc: '早年多以鱼兽皮制衣，男人穿狗皮大衣"卡什刻"等，女人穿鱼皮上衣"乌提楚"，样式似旗袍，领边等有花纹。男女都穿鱼皮套裤，鞋有靰鞡"温塔"等，帽子种类丰富，现多被布制衣物替代', img: 'images/赫哲族_服饰_new.jpg' },
      architecture: { title: '赫哲族建筑', desc: '早年住处为临时性的"撮罗安口"，即尖顶窝棚，用长杆支撑、茅草苫盖；还有固定性的"希日免克"（地窨子）等。受满、汉族影响，多住土草房，一般在正房旁搭"塔克吐"（鱼楼子）存放物品', img: 'images/赫哲族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '主要有"鹿神"节，在农历三月初三、九月初九举行，求神驱鬼消灾求福；农历五月十五的"乌日贡"节，有河灯活动，祈求"河神"保佑丰收、全家太平，节日期间还会有歌舞等庆祝活动', img: 'images/赫哲族_节日_new.jpg' },
      food: { title: '赫哲族饮食', desc: '以鱼、兽肉为主食，有刹生鱼"塔拉卡"、炒鱼毛"它斯恨"、烤鱼"塌拉哈"等特色吃法，还会用小米做"拉拉饭"等，喜食"三花五罗"等鱼类，常采柳蒿菜等野菜，吸烟饮酒较为普遍', img: 'images/赫哲族_饮食_new.jpg' }
    }
  },
  { name: '高山族', pinyin: 'Gaoshanzu', alpha: 'G', tags: ['原住民','编织'], img: 'images/gaoshan_cover.jpg',
    population: '约3479人（大陆地区）',
    distribution: '主体聚居在台湾省，其中阿美族多分布于东部沿海平原，泰雅、布农、邹等族群多居住在中部山区，达悟族则聚居在台湾岛东南的兰屿岛；大陆地区的高山族主要散居在福建、浙江、广东、北京、上海等省市，多为婚嫁、工作等原因迁移定居',
    language: '高山族各族群语言不同，均属于南岛语系印度尼西亚语族，可分为泰雅、邹、排湾、达悟等多个语群，族群间语言差异较大，多数族群无通用语，部分族群内部还存在方言差异；目前，汉语（普通话、闽南语）在台湾高山族地区广泛通用，是日常交流的主要语言之一',
    history: '高山族的祖先为古代"百越"族群的一支，后与太平洋南岛语系族群逐渐融合，是台湾岛最早的居民，其定居历史可追溯至数千年前的新石器时代。历史上高山族各族群均无本民族创制的通用文字，长期以口耳相传的方式传承文化',
    culture: {
      attire: { title: '高山族服饰', desc: '台湾高山族传统服饰色彩鲜艳，以红、黄、黑三种颜色为主，其中男子的服装有腰裙、套裙、挑绣羽冠、长袍等，女子有短衣长裙、围裙、膝裤等，除服装外，还有许多饰物，如冠饰、臂饰、脚饰等，以鲜花制成花环，在盛装舞蹈时，直接戴在头上', img: 'images/高山族_服饰_new.jpg' },
      architecture: { title: '高山族建筑', desc: '高山族建筑是台湾原住民（高山族）在长期适应自然环境中形成的独特居住形式，传统建筑以木结构为主，适应山地环境，体现了原住民与自然和谐共生的智慧', img: 'images/高山族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '高山族最盛大的传统节日是丰年祭，此外还有收获祭、播种祭、矮灵祭等具有鲜明农耕文化特色的节日，这些节日体现了高山族与自然、农业的密切关系', img: 'images/高山族_节日_new.jpg' },
      food: { title: '高山族饮食', desc: '高山族饮食以粟、稻、薯芋为主粮，兼具传统狩猎采集特色，形成独特的饮食文化体系，体现了原住民在台湾岛独特自然环境下的生存智慧', img: 'images/高山族_饮食_new.jpg' }
    }
  },
  { name: '拉祜族', pinyin: 'Lahuzu', alpha: 'L', tags: ['葫芦','摆舞'], img: 'images/lahu_cover.jpg',
    population: '约49.9万人',
    distribution: '主要聚居在云南省，核心分布区为普洱市、临沧市、西双版纳傣族自治州、红河哈尼族彝族自治州等；少量分布在四川省甘孜藏族自治州、凉山彝族自治州，以及缅甸、老挝等周边国家，整体呈"大分散、小聚居"的山地分布特点',
    language: '拉祜语属于汉藏语系藏缅语族彝语支，内部可分为拉祜纳（黑拉祜）、拉祜西（黄拉祜）两个主要方言，方言间差异较小，沟通基本顺畅，部分地区通用汉语、傣语等。1957年，国家以拉祜纳方言为基础、澜沧县语音为标准，创制了以拉丁字母为基础的新拉祜文',
    history: '拉祜族源于古代氐羌族群，早期活动于青藏高原东南部。历史上曾有传教士创制的拉丁字母变体文字（旧拉祜文），现新拉祜文用于民族教育、书籍报刊出版及文化传承，有效保护了语言文化',
    culture: {
      attire: { title: '拉祜族服饰', desc: '拉祜族服饰是云南拉祜族的传统民族服饰，主要分布于澜沧、孟连等县，保留古代氐羌民族特征，以黑色为主色调，辅以银饰、彩色布条与几何纹样。男性常穿右衽交领长袍、长裤，佩刀缠头巾；女性服饰分为长衫与短衫两类，长衫多配银泡与红白花边，下穿长裤或筒裙，部分地区保留剃发裹包头习俗，服饰兼具实用性与装饰性', img: 'images/拉祜族_服饰_new.jpg' },
      architecture: { title: '拉祜族建筑', desc: '拉祜族传统建筑以木掌楼和干栏式结构为核心，兼具实用性与文化象征意义，适应热带山地环境，体现了拉祜族与自然和谐共生的居住智慧', img: 'images/拉祜族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '拉祜族的主要传统节日包括扩塔节（春节）、葫芦节、火把节、八月月圆节和库扎节，其中扩塔节和葫芦节最为隆重，这些节日体现了拉祜族的农耕文化和民族特色', img: 'images/拉祜族_节日_new.jpg' },
      food: { title: '拉祜族饮食', desc: '拉祜族饮食以腌制品、烤茶、葫芦宴等特色饮食为主，兼具狩猎文化与农耕文化的融合特点，体现了拉祜族在云南山地环境下的饮食智慧', img: 'images/拉祜族_饮食_new.jpg' }
    }
  },
  { name: '水族', pinyin: 'Shuizu', alpha: 'S', tags: ['水书','马尾绣'], img: 'images/shui_cover.jpg',
    population: '约49.6万人',
    distribution: '水族主要分布在黔桂交界的龙江、都柳江的上游地带，贵州省的三都水族自治县、荔波、独山、都匀等县（市）是其主要居住区，此外在广西北部的河池、南丹、环江、融水等县市以及云南省富源县也有水族村落分布',
    language: '水族的民族语言是水语，属汉藏语系壮侗语族侗水语支，分三洞、阳安、潘洞等土语。水族有自己的文字，即水书。水书是水族古文字及其著编典籍的汉译通称，它保留着图画文字、象形文字、抽象文字兼容的特色，2500多个单字中，大部分为异体字。2006年，水书被列为首批国家级非物质文化遗产名录',
    history: '水族可追溯于殷商时期，水族先民从中原南迁，逐步融入百越族群。秦王朝时，统治者向岭南发兵，水族先民从百越族群中迁徙出来，来到龙江、都柳江上游地带生活。唐代开元时期，统治者在黔桂交界环江一带设置羁縻抚水州，管辖统治当地的水族先民',
    culture: {
      attire: { title: '水族服饰', desc: '水族在建国前处于封建地主经济发展阶段，以农业经济为主，主产水稻，兼事手工业，善于纺织、染布，崇尚黑色和藏青色。这个特点，在水族的服饰上有鲜明的表现。水族男子穿大襟无领蓝布衫，戴瓜皮小帽，老年人着长衫，头缠里布包头，脚裹绑腿。妇女穿青黑蓝色圆领历襟宽袖短衣，下着长裤，结布围腰，穿绣青布鞋', img: 'images/水族_服饰_new.jpg' },
      architecture: { title: '水族建筑', desc: '水族建筑分为传统与现代两类：传统水族民居以干栏式木结构为主，底层养畜、中层居住、顶层储粮，适应山地环境；现代水族馆如上海海洋水族馆、青岛水族馆等，采用先进技术展示海洋生物，兼具科普与观赏功能', img: 'images/水族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '水族节日是水族依照传统水历形成的特色节庆体系，以端节、卯节、苏宁喜节和敬霞节为核心，具有农耕文化与自然崇拜的鲜明特征，主要流行于贵州省三都、荔波、都匀等水族聚居区。其中，端节作为最隆重的年节，持续49天，被誉为"世界上最长的节日"，并于2006年被列入第一批国家级非物质文化遗产名录', img: 'images/水族_节日_new.jpg' },
      food: { title: '水族饮食', desc: '水族饮食以酸辣为主，特色食物包括鱼包韭菜、酸汤及各类腌制食品，饮食习惯注重糯米、鱼类和酒文化，体现了独特的民族传统与稻作文化结合的特点', img: 'images/水族_饮食_new.jpg' }
    }
  },
  { name: '东乡族', pinyin: 'Dongxiangzu', alpha: 'D', tags: ['清真','花儿'], img: 'images/dongxiang_cover.jpg',
    population: '约77.4万人',
    distribution: '主要聚居在甘肃省，核心分布区为临夏回族自治州的东乡族自治县，此外在临夏县、积石山保安族东乡族撒拉族自治县，以及新疆维吾尔自治区（如伊犁、塔城）、青海、宁夏等地也有少量散居，多以村落形式集中居住',
    language: '东乡语属于阿尔泰语系蒙古语族，与蒙古语有亲属关系，但词汇和语法有自身特色，内部无明显方言差异；因长期与汉族、回族交往，多数东乡族群众兼通汉语，汉语是其社会交往中的主要通用语言',
    history: '东乡族的形成与元代蒙古军队及当地民族融合密切相关。元代，大批蒙古军（包括部分中亚穆斯林士兵）进驻今甘肃临夏地区，屯垦驻守，与当地汉族、回族、藏族等长期杂居，逐渐融合，形成具有独特文化的东乡族',
    culture: {
      attire: { title: '东乡族服饰', desc: '东乡族服饰是东乡族的传统民族服饰，兼具伊斯兰文化特征与游牧民族传统元素。男子服饰以素净实用为主，头戴黑、白平顶无檐号帽，身着白衬衣搭配黑坎肩，下穿青蓝色裤，冬季穿羊皮袄，礼仪场合穿对襟长衫"仲白"礼服。妇女服饰通过盖头颜色区分身份：未婚少女戴绿色，中年戴黑色，老年戴白色。日常穿假袖上衣与"过美"花裙，婚嫁时佩戴银耳环、手镯等饰物', img: 'images/东乡族_服饰_new.jpg' },
      architecture: { title: '东乡族建筑', desc: '东乡族建筑以其独特的民族风格和地域特色著称，主要分为民居、清真寺和拱北三大类，融合了实用性与宗教文化内涵，体现了东乡族在建筑艺术上的独特创造', img: 'images/东乡族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '东乡族的主要传统节日包括开斋节、古尔邦节（阿也）、圣纪节和阿术拉节（粮食节），均源于伊斯兰教传统，并融合了独特的民族习俗，体现了东乡族深厚的宗教文化底蕴', img: 'images/东乡族_节日_new.jpg' },
      food: { title: '东乡族饮食', desc: '东乡族饮食习俗是东乡族人在日常饮食与待客礼仪中形成的传统规范，以敬老尊客为核心特征。东乡族以青稞、洋芋为主食，副食包括牛羊肉等，特色食品有栈羊肉、清汤羊肉、油香、麻贴等。待客时需用整鸡分11块款待，其中象征尊贵的鸡尖（尾骨）必先敬主宾，主宾需反复礼让后方可食用', img: 'images/东乡族_饮食_new.jpg' }
    },
    gallery: ['images/dongxiang_cover.jpg']
  },
  { name: '京族', pinyin: 'Jingzu', alpha: 'J', tags: ['独弦琴','渔歌'], img: 'images/jing_cover.webp',
    population: '约3.3万人',
    distribution: '核心聚居区为广西壮族自治区防城港市，集中在东兴市的巫头、山心、尾三个海岛（合称"京族三岛"），少量分布在钦州、北海等沿海地区。他们世代依海而居，聚居地多临近渔港，形成了与海洋生态紧密结合的村落格局',
    language: '京族语言属汉藏语系壮侗语族越语支，与越南语北部方言相近，日常交流用本民族语言，多数人兼通汉语（粤语方言）和汉字。京族有传统文字"喃字"，由汉字改造而成，曾用于记录民歌、故事，但使用范围较窄，现日常文书、教育通用汉文，"喃字"主要在民间文艺传承中保留',
    history: '京族历史可追溯到16世纪，其先民从越南涂山（今越南海防市附近）等地迁来，最初以捕鱼为生，逐渐在广西沿海岛屿定居。明清时期，他们与当地汉、壮等民族交流融合，形成独特的海洋文化，如"哈节""独弦琴"等。1958年，京族被正式识别为单一民族，海洋渔业、海上贸易传统是其民族文化核心标识',
    culture: {
      attire: { title: '京族服饰', desc: '男子穿无领袒胸上衣，配彩色腰带，下着宽长黑裤。女子上衣短至腰间，无领开襟，以"遮胸"装饰，下装为宽长黑裤，外出时加穿矮领窄袖长衫，戴圆顶礼帽，整体风格简朴美观', img: 'images/京族_服饰_new.jpg' },
      architecture: { title: '京族建筑', desc: '过去多为"栏栅屋"，以木条、竹片编织墙壁，茅草盖顶，带有百越"干阑"式建筑特点。20世纪50年代后，"石条瓦房"逐渐普及，以淡褐色石条砌成，分左、中、右三间，正中为正厅，设神龛，改革开放后，钢筋水泥楼房增多', img: 'images/京族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '"哈节"是最隆重的节日，在"哈亭"举行，有迎神、祭神、入席听哈、送神等活动，日期因地区而异。此外，还过春节、中元节、食新米节等，中元节祭祖先，食新米节祭田头公，酬谢禾苗丰收', img: 'images/京族_节日_new.jpg' },
      food: { title: '京族饮食', desc: '以大米为主食，喜食鱼虾，"鲶汁"是独特调味汁。特色食品有"风吹饼"，用大米磨粉制成，香脆爽口，还爱吃糯米糖粥，妇女爱嚼槟榔，饮食具有浓郁的海洋特色', img: 'images/京族_饮食_new.jpg' }
    }
  },
  { name: '基诺族', pinyin: 'Jinuozu', alpha: 'J', tags: ['茶园','服饰'], img: 'images/jinuo_cover.png',
    population: '约2.6万人',
    distribution: '核心聚居区为西双版纳傣族自治州景洪市的基诺山基诺族乡，少数散居在勐海县、勐腊县及景洪市其他乡镇。他们世代生活在滇南热带雨林山区，依托山地资源发展农业，聚居地保留了较完整的民族文化生态',
    language: '基诺族语言属汉藏语系藏缅语族彝语支，无传统民族文字，历史上靠口耳相传传递信息，日常交流以本民族语言为主，多数人兼通汉语和傣语。20世纪80年代后，相关部门为其创制了以拉丁字母为基础的拼音文字，但实际使用范围较窄，目前仍以汉语为主要书面交流工具',
    history: '基诺族源于古代氐羌族群的分支，历史上曾被称为"攸乐"，早期过着刀耕火种的原始生活，18世纪起受傣族土司管辖。1949年后，基诺族逐步从原始部落社会直接过渡到现代社会，1979年正式被确认为单一民族。其民族文化中保留了大量原始氏族社会痕迹，如"大房子"居住习俗、长老议事制度等',
    culture: {
      attire: { title: '基诺族服饰', desc: '男子穿无领无扣对襟黑白花格麻、布褂，背绣太阳花，下着宽裤。女子穿无领镶绣对襟小褂，系红边黑裙，戴白厚麻布披风尖顶帽，裹绑腿，男女皆耳穿孔，以耳孔大为美', img: 'images/基诺族_服饰_new.jpg' },
      architecture: { title: '基诺族建筑', desc: '多为干栏式竹楼，形似孔明帽，相传为孔明所教。竹楼分两层，"客厅"有火塘，屋脊两头装饰茅草扎的耳环花，数量可区分主人身份', img: 'images/基诺族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '"特懋克"节最隆重，意为"打大铁"，是纪念铁器创制使用的节庆，在公历2月6日至8日举行，期间有祭祀、歌舞等活动', img: 'images/基诺族_节日_new.jpg' },
      food: { title: '基诺族饮食', desc: '以大米为主食，喜酸、辣、咸口味，酸笋是家常菜。常用臼舂菜，有"汉炒、傣蘸、基诺舂"之说。还喜食竹筒烤饭、酸笋煮狗肉等，普遍好酒，爱喝老叶茶', img: 'images/基诺族_饮食_new.jpg' }
    }
  },
  { name: '门巴族', pinyin: 'Menbazu', alpha: 'M', tags: ['藏区','民俗'], img: 'images/menba_cover.jfif',
    population: '约1.1万人',
    distribution: '主要分布在西藏自治区，核心聚居区为墨脱县、错那县，少数散居在林芝市察隅县及西藏其他边境县域，部分居住在印度控制的藏南地区。他们多生活在喜马拉雅山东南麓的河谷地带，世代以农业和林业为生，生活环境与高原山地气候紧密相关',
    language: '门巴族语言属汉藏语系藏缅语族门巴语支，分墨脱门巴语和错那门巴语两大方言，日常交流以本民族语言为主，多数人兼通藏语。无传统民族文字，历史上长期使用藏文记录文献、传递信息，包括宗教经文、民间故事等。现通用藏文和汉文，民族语言主要通过口头文学如歌谣、传说等形式传承',
    history: '门巴族历史悠久，源于古代青藏高原南部的土著族群，早期与藏族交往密切，受藏文化影响较深。唐代起，其聚居区纳入吐蕃政权管辖，元明清时期受中央政权下设的西藏地方政府治理。1959年后，门巴族地区进行民主改革，逐步融入现代社会。民族名称"门巴"意为"门隅的人"，1964年正式确定为单一民族',
    culture: {
      attire: { title: '门巴族服饰', desc: '男子多穿红色氆氇袍，有长外套"白"和短外套等。妇女穿"堆通江坚"花上衣和"辛嘎"筒裙，戴"巴尔霞"帽等。男女都戴饰品，男子腰佩长刀，女子颈挂松耳石等串成的项链', img: 'images/门巴族_服饰_new.jpg' },
      architecture: { title: '门巴族建筑', desc: '主要有碉房式石楼和干栏式木屋两类。石楼分三层，底层圈养牲畜，中层住人，上层放杂物。干栏式木屋也是三层，底层无围墙拴牲畜，二层住人，三层放杂物', img: 'images/门巴族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '年节是重要节日，墨脱地区以十二月为岁首，从藏历十一月开始准备。还有萨嘎达瓦节等宗教节日，以及庄稼成熟时的"曲科尔"节，祈求丰收，节日期间有歌舞、戏剧表演等活动', img: 'images/门巴族_节日_new.jpg' },
      food: { title: '门巴族饮食', desc: '主食有荞麦饼、玉米饭、鸡爪谷糊等，喜用辣椒佐餐。常见蔬菜有白菜、萝卜等，盛产野生蘑菇和木耳。善饮酒，有"邦羌"酒等，常用石锅煮饭做菜，餐具多为竹木制作，木碗最有名', img: 'images/门巴族_饮食_new.jpg' }
    }
  },
  { name: '珞巴族', pinyin: 'Luobazu', alpha: 'L', tags: ['林区','狩猎'], img: 'images/luoba_cover.jfif',
    population: '约3682人',
    distribution: '核心聚居区在西藏自治区东南部，主要分布于珞瑜地区及米林、墨脱、察隅、隆子等县的边境地带，少数散居在西藏其他边境县域。他们世代生活在喜马拉雅山脉东段南麓的深山峡谷中，依托山林资源，以农业和狩猎为生，居住环境多为原始林区',
    language: '珞巴族语言属汉藏语系藏缅语族，内部方言差异大，主要有博嘎尔、邦波、崩尼等方言，不同方言间沟通较困难，日常交流以本民族语言为主，部分人兼通藏语。无传统民族文字，历史上靠结绳记事、刻木为信传递信息，也借藏文记录少量内容',
    history: '珞巴族源于古代青藏高原南部的土著族群，历史上长期处于部落分散状态，与藏族、门巴族交往密切，受藏文化影响较深。唐代起，其聚居区纳入吐蕃政权势力范围，元明清时期受西藏地方政府管辖。1965年正式被确认为单一民族，"珞巴"意为"南方人"',
    culture: {
      attire: { title: '珞巴族服饰', desc: '男子多穿黑色羊毛套头坎肩，外披野牛皮，戴熊皮帽，背弓箭、挎腰刀。女子穿麻布对襟无领窄袖上衣，外披小牛皮，下围紧身筒裙，小腿裹绑腿，佩戴大量银质、铜质饰品及珠项链', img: 'images/珞巴族_服饰_new.jpg' },
      architecture: { title: '珞巴族建筑', desc: '传统住房为石木结构的碉房，坚固且具防御功能，门上或屋内墙壁画有避邪求福图案，墙上常挂动物头首，彰显财富与猎手能力', img: 'images/珞巴族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '有昂德林节（丰收节）、旭独龙节、调更谷乳术节等，节日多与农业生产有关，日期依月亮圆缺和物候确定，届时全村男女欢宴、对歌，祈求丰收、祈福消灾', img: 'images/珞巴族_节日_new.jpg' },
      food: { title: '珞巴族饮食', desc: '喜食烤肉、干肉、奶渣、荞麦饼等，尤爱粟米饭坨，喜用辣椒佐餐，蔬菜有白菜、土豆等，普遍好酒，常饮用青稞酒、玉米酒', img: 'images/珞巴族_饮食_new.jpg' }
    }
  },
  { name: '乌孜别克族', pinyin: 'Wuzibiekezu', alpha: 'W', tags: ['舞蹈','饮食'], img: 'images/wuzibieke_cover.webp',
    population: '约1.2万人',
    distribution: '国内主要聚居在新疆乌鲁木齐、伊宁、喀什等城市，少量分布在塔城、和田等地，多与维吾尔、汉、哈萨克等民族杂居。他们以经商、手工业和农业为生，依托新疆的商贸节点，形成了分散而集中的居住特点，是丝绸之路上的传统商贸民族',
    language: '乌兹别克语属阿尔泰语系突厥语族葛逻禄语支，与维吾尔语相近，日常交流可互通。中国乌兹别克族历史上曾用阿拉伯字母拼写的乌兹别克文，现因与维吾尔族交往密切，多通用维吾尔文，同时不少人兼通汉语和哈萨克语。在教育、文书场景中，维吾尔文和汉文是主要使用文字',
    history: '乌兹别克族源自中亚草原的突厥部落，16世纪后逐步形成民族共同体。明清时期，部分乌兹别克人沿丝绸之路迁入中国新疆，以经商为业，成为连接中外贸易的重要力量。历史上受伊斯兰文化和突厥文化影响深远，1949年后，其传统商贸习俗、音乐舞蹈等文化得以保留',
    culture: {
      attire: { title: '乌孜别克族服饰', desc: '乌兹别克族服饰色彩艳丽、刺绣精美，男子常穿白色立领绸衫，外搭黑色或深色"袷袢"，戴小花帽，脚踩皮靴。妇女爱穿连衣裙，裙摆宽大且绣满花卉纹样，已婚妇女会戴头巾或"开普"（绣花小帽），配饰偏爱银质耳环、项链和手镯，整体风格既显华贵，又融入了中亚游牧文化与丝绸贸易带来的精致感', img: 'images/乌兹别克族_服饰_new.jpg' },
      architecture: { title: '乌孜别克族建筑', desc: '受生活环境和文化影响，乌兹别克族传统建筑兼具实用与美观。民居多为土木结构的平顶房，墙体厚实以适应新疆温差，屋内铺设地毯，设壁炉取暖。富裕家庭的房屋会在门窗、廊柱上雕刻几何或花卉图案，部分建筑还保留中亚"庭院式"布局，院内种果树、搭葡萄架，既通风纳凉，又充满生活气息', img: 'images/乌兹别克族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '乌兹别克族最隆重的节日是"肉孜节"和"古尔邦节"。肉孜节清晨，人们沐浴后前往清真寺祈祷，随后走亲访友、分享美食；古尔邦节则有宰牲习俗，家家户户会准备手抓肉、馓子等食物，还会举办歌舞活动，男子弹起"都塔尔"，男女老少共同跳民间舞蹈，氛围热闹祥和', img: 'images/乌兹别克族_节日_new.jpg' },
      food: { title: '乌孜别克族饮食', desc: '乌兹别克族饮食以面食、肉食和奶制品为主，擅长制作特色美食。"手抓饭"是标志性食物，用羊肉、胡萝卜、葡萄干与大米焖煮而成，香气浓郁；还有"馕""烤包子""马肠子"等，日常爱喝奶茶、酸奶，节日里会酿制"穆塞莱斯"（果酒）。饮食口味偏浓郁，注重食材本味与香料的搭配', img: 'images/乌兹别克族_饮食_new.jpg' }
    }
  },
  { name: '俄罗斯族', pinyin: 'Eluosizu', alpha: 'E', tags: ['东正教','民歌'], img: 'images/eluosi_cover.webp',
    population: '约1.6万人',
    distribution: '国内主要聚居在新疆伊犁、塔城、阿勒泰等地，内蒙古额尔古纳市及黑龙江黑河、哈尔滨也有分布，其中新疆和内蒙古的聚居区保留了较多传统习俗。他们多与汉、哈萨克、维吾尔等民族杂居，形成"大分散、小聚居"特点，部分仍从事农业、畜牧业或手工业',
    language: '俄罗斯族语言属印欧语系斯拉夫语族东斯拉夫语支，即俄语，日常交流使用俄语口语，部分人兼通汉语及当地民族语言。历史上使用俄文（西里尔字母），多用于书写、记录或宗教活动。如今，年轻一代使用汉语和汉文的频率更高，俄文主要在家庭传承、民族文化活动中使用',
    history: '中国俄罗斯族主要源于19世纪至20世纪初，因战乱、经商、移民等从俄罗斯迁入中国东北、新疆等地的人口，后与当地民族通婚逐渐形成。清末民初是迁入高峰期，他们带来了农业技术、手工业技艺及东正教文化。1949年后，俄罗斯族正式成为中国56个民族之一，其传统节庆、建筑、饮食等文化，成为中俄文化交流的重要见证',
    culture: {
      attire: { title: '俄罗斯族服饰', desc: '俄罗斯族服饰兼具保暖性与民族特色，传统男装为"布拉吉"（长袍）或立领衬衫配长裤，外搭呢子大衣，冬季戴狐皮帽、穿高筒皮靴。女装以连衣裙为主，裙摆宽大且绣有花纹，搭配刺绣围裙，已婚妇女常戴头巾，少女则梳长辫并系彩色发带。现代服饰更简约，但节日时仍会穿戴绣有传统纹样的服饰，保留民族风格', img: 'images/俄罗斯族_服饰_new.jpg' },
      architecture: { title: '俄罗斯族建筑', desc: '俄罗斯族传统建筑以"木刻楞"最具代表性，用原木搭建，墙体缝隙填苔藓防寒，屋顶呈"人"字形并覆盖木板或铁皮，适应北方寒冷气候。房屋多为庭院式，院内设菜园、畜圈，室内铺木地板，摆放雕花家具，还会挂刺绣挂毯装饰。部分地区保留东正教堂建筑，尖顶、彩绘玻璃尽显特色，是民族文化的重要标志', img: 'images/俄罗斯族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '俄罗斯族重要节日有复活节、圣诞节和"谢肉节"。复活节会烤制彩蛋、圆形面包，亲友互赠彩蛋象征祝福；圣诞节在1月7日过，会唱圣诞歌、吃传统美食；谢肉节是送冬迎春的节日，人们会烤制薄饼，还会举行滑雪、跳舞等户外活动，节日氛围欢乐热闹，体现对生活的热爱', img: 'images/俄罗斯族_节日_new.jpg' },
      food: { title: '俄罗斯族饮食', desc: '俄罗斯族饮食口味偏酸甜，主食有列巴（俄式面包）、馕和各种面食。特色菜肴有红菜汤、俄式煎肉、奶油烤杂拌，常用黄油、奶油、番茄酱调味。饮品喜欢喝格瓦斯（麦芽饮料）、红茶，冬季爱饮热蜜酒。日常饮食注重营养搭配，节日时会准备丰富食物，全家团聚共享，展现独特的饮食文化', img: 'images/俄罗斯族_饮食_new.jpg' }
    }
  },
  { name: '裕固族', pinyin: 'Yuguzu', alpha: 'Y', tags: ['服饰','民居'], img: 'images/yugu_cover.png',
    population: '约1.4万人',
    distribution: '核心聚居区为甘肃省张掖市肃南裕固族自治县，集中在祁连山北麓的康乐、大河等乡镇，少量分布在酒泉市肃州区及青海海北等地。他们世代生活在草原与山地过渡带，多与汉、藏、回等民族杂居，形成了适应游牧与半农半牧生活的聚居格局',
    language: '裕固族有两种本民族语言，分属不同语系：西部裕固语属阿尔泰语系突厥语族，东部裕固语属阿尔泰语系蒙古语族，日常交流以本民族语言为主，多数人兼通汉语。裕固族无传统文字，历史上曾使用过回鹘文，现通用汉文，通过口传史诗、民歌等传承文化',
    history: '裕固族源于唐代的回鹘，9世纪回鹘汗国解体后，部分部众西迁，与河西走廊的突厥、蒙古等部落融合，形成"黄头回鹘"，元代后称"撒里畏兀儿"。明清时期因战乱迁徙至祁连山一带，逐渐形成独立民族。1953年，经民族识别正式定名为"裕固族"，其游牧文化、回鹘族源历史是民族核心标识',
    culture: {
      attire: { title: '裕固族服饰', desc: '男子戴金边白毡帽，穿大领偏襟长袍，扎红腰带。妇女头戴喇叭形红缨帽或芨芨草编织帽，未婚少女梳多条发辫，已婚妇女戴头面，服饰用料多为皮毛，色彩鲜艳，刺绣精美', img: 'images/裕固族_服饰_new.jpg' },
      architecture: { title: '裕固族建筑', desc: '过去以牛毛帐篷为主，便于游牧生活，帐篷呈圆形或方形，用木杆支撑，顶部有天窗。现多为土木或砖木结构住房，部分地区在夏秋牧场仍使用帐篷，冬春牧场则住平房或砖瓦房', img: 'images/裕固族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '春节是最大节日，节前包饺子、炸油馃子，有祭祖习俗，节日期间放鞭炮、点酥油灯、互送哈达。此外，还过藏传佛教的宗教节日，如正月十五的酥油花灯节等，有转经、法会等活动', img: 'images/裕固族_节日_new.jpg' },
      food: { title: '裕固族饮食', desc: '以酥油茶、糌粑、奶制品为主，每日三茶一饭。喜爱手抓羊肉、肉肠、"支果干"等风味食品，也用面粉制作烧壳子等面食，还喜欢在米饭、粥中加入蕨麻、葡萄干等，饮食具有浓郁的草原特色', img: 'images/裕固族_饮食_new.jpg' }
    }
  },
  { name: '保安族', pinyin: 'Baoanzu', alpha: 'B', tags: ['腰刀','清真'], img: 'images/baoan_cover.webp',
    population: '约2.4万人',
    distribution: '核心聚居区为甘肃省临夏回族自治州积石山保安族东乡族撒拉族自治县，集中在大河家、刘集等乡镇，少量分布在青海循化及新疆等地。他们多与回、汉、东乡等民族杂居，因历史上擅长手工业，聚居地常形成兼具生产与生活功能的村落，是西北边疆民族文化的重要组成部分',
    language: '保安族语言属阿尔泰语系蒙古语族，与东乡语、土族语相近，分大河家、同仁两个方言，日常交流用本民族语言，多数人兼通汉语和回族的"经堂语"。保安族无本民族传统文字，历史上长期靠口耳相传传承文化，现通用汉文，部分民间艺人会用汉文记录民歌、故事',
    history: '保安族历史可追溯到元代，其先民可能是蒙古军后裔与当地回、汉、藏等民族融合形成的群体，最初聚居在青海同仁地区，称"保安人"。清代因战乱迁徙至甘肃积石山，逐渐形成独立民族。历史上以农业为主，兼擅打制"保安腰刀"，刀艺精湛闻名西北。1952年，保安族被正式识别为单一民族',
    culture: {
      attire: { title: '保安族服饰', desc: '保安族服饰兼具民族特色与实用性，男子多穿白色或蓝色对襟上衣，外罩黑色或灰色坎肩，下装是深色长裤，戴白色或黑色圆顶帽，老年男子常留长胡须。妇女穿右衽大襟上衣，袖口和领口绣有彩色花纹，搭配深色长裤，头戴盖头，少女盖头为绿色，已婚妇女为黑色，老年妇女为白色，整体风格简洁大方，还会佩戴银饰点缀', img: 'images/保安族_服饰_new.jpg' },
      architecture: { title: '保安族建筑', desc: '保安族传统民居以土木结构为主，多为四合院式布局，讲究"人"字形屋顶，覆盖瓦片或茅草，墙体用泥土夯筑，坚固耐用。院内通常有正房、厢房和门楼，正房坐北朝南，是家庭活动的核心区域，屋内设有火炕，兼具取暖与休息功能。部分民居还会在墙面绘制简单花纹，或在院子里种植果树、花卉，营造舒适的居住环境', img: 'images/保安族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '保安族主要节日与伊斯兰教相关，有开斋节、古尔邦节和圣纪节。开斋节期间，人们会清晨沐浴、盛装打扮，到清真寺做礼拜，之后走亲访友、分享美食。古尔邦节要宰牲，将肉分三份，一份自用、一份馈赠亲友、一份救济贫困。圣纪节则是纪念先知穆罕默德诞辰，会举行诵经、演讲等活动，传承宗教文化与民族精神', img: 'images/保安族_节日_new.jpg' },
      food: { title: '保安族饮食', desc: '保安族饮食以面食、肉食为主，擅长制作各种特色小吃。日常主食有馒头、面条、馓子等，其中"油香"是节庆必备食品，用面粉油炸制成，口感香脆。肉食偏爱牛羊肉，常用炖、煮、烤等方式烹饪，如手抓羊肉。他们还喜欢喝奶茶、盖碗茶，茶中会加入红枣、枸杞等，既解渴又养生，饮食文化中还保留着尊重长辈、共享食物的传统', img: 'images/保安族_饮食_new.jpg' }
    }
  },
  { name: '独龙族', pinyin: 'Dulongzu', alpha: 'D', tags: ['纹面','原始森林'], img: 'images/dulong_cover.jfif',
    population: '约7310人',
    distribution: '核心聚居区为云南省怒江傈僳族自治州贡山独龙族怒族自治县，集中在独龙江流域两岸，少量分布在西藏察隅县。他们世代生活在横断山脉深处的峡谷中，过去因交通闭塞长期处于相对封闭状态，现聚居地仍保留着浓郁的原始民族风貌',
    language: '独龙族语言属汉藏语系藏缅语族，无本民族传统文字，历史上长期靠结绳记事、刻木为信传递信息，日常交流以口语为主，多数人兼通汉语和傈僳语。1951年，语言工作者为其创制了拉丁字母拼音文字方案，但未普及；现通用汉文，近年来通过民族语言教材、口述史记录等方式，保护和传承本民族语言文化',
    history: '独龙族是独龙江流域的土著民族，古代属"氐羌"族群一支，汉晋时期被称为"僰人"，明清时期称"俅人"。历史上长期处于原始公社末期阶段，保留"刀耕火种""氏族公社"等习俗，受藏族土司和傈僳族头人管辖。1952年，正式定名为"独龙族"，1999年独龙江公路通车后，其传统民族文化与现代社会逐步融合',
    culture: {
      attire: { title: '独龙族服饰', desc: '独龙族服饰以黑色棉麻为主，最具特色的是女性的"独龙毯"，用麻线手工织就，可围身当裙、披肩或盖被，边缘常绣红、黄纹。过去男性穿麻布短褂、长裤，女性穿无袖短衫和统裙，现日常多着汉装，仅在节庆或传统活动中穿民族服饰，部分老年女性仍保留纹面习俗，图案多为几何纹样，承载着民族历史记忆', img: 'images/独龙族_服饰_new.jpg' },
      architecture: { title: '独龙族建筑', desc: '独龙族传统建筑为"木楞房"，用原木垒墙、茅草或木板盖顶，分上下两层，下层养牲畜、堆杂物，上层住人，室内设火塘，是家庭活动核心。房屋多依山傍水而建，呈零散村落分布，避免集中破坏耕地。现部分地区已建砖木结构房屋，但偏远村寨仍保留不少传统木楞房，延续着适应山区气候的建筑智慧', img: 'images/独龙族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '独龙族最隆重的节日是"卡雀哇"，通常在每年农历腊月举行，为期3-5天，各村寨时间略有差异。节日核心是"剽牛祭天"，村民集体宰杀牦牛，祭祀山神和祖先，祈求来年丰收平安，还会跳"锅庄舞"、唱传统歌谣、互赠礼品。此外，受汉族影响，春节也成为重要节日，会结合本民族习俗过新年', img: 'images/独龙族_节日_new.jpg' },
      food: { title: '独龙族饮食', desc: '独龙族饮食以玉米、大米、荞麦为主食，擅长制作"石板烤粑粑""咕嘟酒"。因地处山区，常采食野菜、菌类，狩猎和捕鱼所得的兽肉、鱼是重要肉食来源，特色菜肴有"漆油鸡"，用当地漆树籽油烹饪，香气浓郁。饮食风格偏酸辣，过去因交通不便，多腌制酸菜、腊肉保存食物，现食材种类已更丰富', img: 'images/独龙族_饮食_new.jpg' }
    }
  },
  { name: '怒族', pinyin: 'Nuzu', alpha: 'N', tags: ['峡谷','纺织'], img: 'images/nu_cover.jfif',
    population: '约3.7万人',
    distribution: '主要聚居在怒江傈僳族自治州的福贡、贡山、兰坪三县，少量分布在迪庆州维西县，多生活在怒江、澜沧江沿岸的高山峡谷中，与傈僳、独龙、白等民族杂居，世代适应峡谷气候，以农耕和采集为生，是怒江流域的古老居民',
    language: '怒族语言属汉藏语系藏缅语族，分怒苏、阿侬、柔若三种方言，方言间差异较大，无通用语言。历史上怒族无本民族文字，长期靠口耳相传传递信息，部分地区曾借用汉文、傈僳文记录事务。20世纪末，学者为怒苏方言设计过拉丁字母拼音文字方案，但未普及，现日常交流仍以口语为主，汉语、傈僳语也被广泛使用',
    history: '怒族是怒江流域的土著民族之一，唐代文献中称"怒人"，曾受南诏、大理政权管辖，元明清时期属丽江木氏土司统治。历史上因峡谷阻隔，社会发展较慢，保留了原始公社残余习俗，如"刀耕火种"耕作方式、氏族议事传统。1949年后逐步融入现代社会，其"仙女节""跳锅庄"等文化习俗，是民族历史的重要传承载体',
    culture: {
      attire: { title: '怒族服饰', desc: '男女均喜穿麻布衣服，男子佩砍刀、肩背弓弩。福贡已婚妇女衣裙有花边，头胸佩珊瑚等饰品；贡山妇女只佩胸饰。男女都用红藤作缠头和腰箍，贡山妇女还喜用竹管穿耳，体现了山地民族的实用性和装饰性', img: 'images/怒族_服饰_new.jpg' },
      architecture: { title: '怒族建筑', desc: '多为干栏式，有茅草房、千脚落地房、木楞房等类型。千脚落地房较普遍，在斜坡地竖木桩，上铺木板或竹篾笆，分上下两层，上层住人，下层关牲畜，房顶用茅草或木板覆盖，适应峡谷地形的建筑智慧', img: 'images/怒族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '主要有鲜花节，在农历三月十五至十七日举行，人们身着盛装采摘鲜花祭祀仙女，祈求风调雨顺。部分怒族受傈僳族影响也过阔时节，相当于春节，有歌舞、祭祀等活动，体现了对自然的敬畏和民族文化的传承', img: 'images/怒族_节日_new.jpg' },
      food: { title: '怒族饮食', desc: '主食为玉米，兼食大米、荞麦等。特色饮食有乳猪、"侠辣""巩辣"、肉拌饭、漆油茶等。喜欢饮酒，擅酿"咕嘟酒""浊酒"等，酒是日常生活和节日中的重要饮品，体现了山地民族的饮食特色', img: 'images/怒族_饮食_new.jpg' }
    }
  },
  { name: '塔吉克族', pinyin: 'Tajikezu', alpha: 'T', tags: ['鹰舞','高原'], img: 'images/tajike_cover.jpeg',
    population: '约5.1万人',
    distribution: '主要聚居在新疆塔什库尔干塔吉克自治县，少量分布在莎车、泽普等周边县域，生活在帕米尔高原海拔3000米以上区域，世代以游牧和高原农耕为生',
    language: '塔吉克语属印欧语系伊朗语族东伊朗语支，分色勒库尔和瓦罕两个方言，色勒库尔方言为主要交际语言。历史上曾使用波斯文，现通用以阿拉伯字母为基础的塔吉克文',
    history: '塔吉克族是古代"揭盘陀国"居民的后裔，西汉时已在帕米尔高原活动，唐代属安西都护府管辖，长期承担边疆守卫职责。历史上与周边民族及中亚、南亚文化交流频繁，形成独特的高原文化',
    culture: {
      attire: { title: '塔吉克族服饰', desc: '男子戴黑绒圆高统"吐马克"帽，穿黑色袷袢。妇女戴"库勒塔"帽，穿连衣裙，已婚妇女系彩色围裙。男女都着毡袜、长筒羊皮软靴。妇女盛装时戴银链、耳环、项链等首饰，色彩艳丽，极具民族特色', img: 'images/塔吉克族_服饰.jpg' },
      architecture: { title: '塔吉克族建筑', desc: '多为正方平顶、木石结构的房屋，墙壁用石块、草皮砌成，厚而结实。顶部架树枝，抹泥土，开天窗。室内较低矮，四周筑土炕，长辈、客人和晚辈分侧而居，还有牲畜棚圈、厨房等附属建筑', img: 'images/塔吉克族_建筑.jpg' },
      festival: { title: '传统节日', desc: '最隆重的是"肖贡巴哈尔节"，在每年春分前后举行，有"新年""迎春"之意。届时有破冰引水、开犁播种等农事仪式，还有鹰舞、赛马、民歌等非遗展演，人们共同祈愿风调雨顺，热闹非凡', img: 'images/塔吉克族_节日.jpg' },
      food: { title: '塔吉克族饮食', desc: '牧民以奶类、肉类和面食为主，农民以面食为主。善于制作酥油、酸奶等奶品，食物多煮食，"抓肉""牛奶煮米饭"等为上好食品，爱饮加牛奶的奶茶，还喜食馕、烤包子等，肉食以羊、牛、骆驼为主', img: 'images/塔吉克族_饮食.jpg' }
    }
  },
  { name: '柯尔克孜族', pinyin: 'Kezikezizu', alpha: 'K', tags: ['毡房','鹰猎'], img: 'images/keerkezi_cover.jfif',
    population: '约20.4万人',
    distribution: '主要聚居在新疆克孜勒苏柯尔克孜自治州，占该族总人口的70%以上；少量分布在新疆伊犁、阿克苏及黑龙江富裕县等地，与汉、维吾尔、哈萨克等民族杂居',
    language: '柯尔克孜族通用柯尔克孜语，属阿尔泰语系突厥语族东匈语支，分南、北两个方言区，日常交流以北部方言为主。文字使用以阿拉伯字母为基础的柯尔克孜文',
    history: '柯尔克孜族先民古称"坚昆""黠戛斯"，最早活动于叶尼塞河流域，唐代曾建立黠戛斯汗国，与唐朝往来密切。10世纪后逐渐西迁至天山地区，明清时期隶属叶尔羌汗国、清朝伊犁将军管辖',
    culture: {
      attire: { title: '柯尔克孜族服饰', desc: '男子常戴白毡帽"喀勒帕克"，穿驼毛长衣"且克麦恰袢"，脚蹬皮靴"乔勒克"。女子多穿裙装，未婚女子戴红色丝绒圆顶小花帽，已婚妇女戴缠布帽子"开来克"，服饰刺绣精美，喜用红色装饰', img: 'images/柯尔克孜族_服饰.jpg' },
      architecture: { title: '柯尔克孜族建筑', desc: '牧民多住圆形毡房，下半部为圆形，上半部为塔形，由柳木、桦木等制作框架，外覆毛毡，顶部有天窗，冬暖夏凉，拆装方便。定居者多住方形平顶土房，室内用挂毯、地毯等装饰，风格温馨', img: 'images/柯尔克孜族_建筑.jpg' },
      festival: { title: '传统节日', desc: '主要有诺鲁孜节，类似春节，人们用七种以上粮食做"克缺"庆祝。马奶节在农历小满后第二天，标志着开始食用马奶。喀尔戛托依节是妇女的节日，在阳历五月初一，妇女们唱歌跳舞，男人们准备食物', img: 'images/柯尔克孜族_节日.jpg' },
      food: { title: '柯尔克孜族饮食', desc: '以奶制品和肉类为主，如马奶、奶皮、奶油、手抓羊肉等，辅以面食，如馕、面条、油饼等。特色食品有"乌麻什""库依马克"等，还喜用青稞等发酵制成牙尔玛饮料，爱喝茯茶', img: 'images/柯尔克孜族_饮食.jpg' }
    }
  },
  { name: '德昂族', pinyin: 'Deangzu', alpha: 'D', tags: ['云南','茶文化'], img: 'images/deang_cover.jfif',
    population: '约2.2万人',
    distribution: '主要聚居在云南省德宏傣族景颇族自治州的芒市、瑞丽、陇川等地，少量分布在保山、临沧等市。他们多与傣、景颇、汉等民族杂居，因长期生活在亚热带山区，聚居地多依山傍水，部分仍保留传统农耕生活模式，是西南边疆民族文化多样性的重要组成',
    language: '德昂语属南亚语系孟高棉语族佤德昂语支，分"布列""汝买""梁"三个主要方言，日常交流用本民族语言，多数人兼通傣语、汉语或景颇语。德昂族无本民族传统文字，历史上曾借用傣文记录历史、宗教内容，现通用汉文，部分地区通过民族语言教材、民间歌谣收集等方式，保护和传承本民族语言文化',
    history: '德昂族历史悠久，古代属"百濮"族群一支，汉晋时期被称为"濮人"，唐代后因居住区域和习俗，有"茫蛮""朴子蛮"等称呼。历史上以种茶、农耕为生，长期与周边民族交流融合，部分地区曾受傣族土司管辖。1949年后，德昂族正式被识别为单一民族，其传统种茶技艺、银饰文化等，成为民族文化的独特标识',
    culture: {
      attire: { title: '德昂族服饰', desc: '男子穿蓝、黑色大襟上衣和宽短裤，裹头巾饰绒球。妇女着藏青或黑色对襟短上衣，镶红布条，配彩色横条纹长裙，戴藤蔑或银丝腰箍，男女都喜戴银饰，五彩绒球也是服饰特色装饰，体现了山地民族的装饰艺术', img: 'images/德昂族_服饰_new.jpg' },
      architecture: { title: '德昂族建筑', desc: '以竹楼著称，多依山而建，坐西向东，有正方形和长方形两种形式。外形别致，像古代儒生巾帽，也似诸葛亮的帽子。屋内分设两个火塘，有两部楼梯，分别供不同用途使用，体现了独特的建筑智慧', img: 'images/德昂族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '主要有泼水节、关门节、开门节等。泼水节在清明后第七天，共3天，有浴佛、取水等仪式；关门节从傣历九月十五日开始，为期3个月，期间禁止谈情说爱；开门节在傣历十二月十五日，标志着爱情婚姻之门开启，有宗教仪式和赶摆活动', img: 'images/德昂族_节日_new.jpg' },
      food: { title: '德昂族饮食', desc: '茶是最重要的饮料，成年男子和中老年妇女几乎一日不可无茶，且好饮浓茶。饮食还包括各种米面主食及肉类，常以酸辣口味的佐料调味，喜用竹编制品盛放食物，体现了与竹文化的紧密联系，展现了独特的饮食文化', img: 'images/德昂族_饮食_new.jpg' }
    }
  },
  { name: '仡佬族', pinyin: 'Gelaozu', alpha: 'G', tags: ['贵州','傩戏'], img: 'images/gelao_cover.jfif',
    population: '约67.7万人',
    distribution: '其分布较分散，主要聚居在贵州遵义、安顺、六盘水及铜仁等地，少量分布在四川泸州、云南昭通，多与汉、苗、布依等民族杂居，生活区域涵盖山地、丘陵，部分保留传统聚居村落',
    language: '仡佬语属汉藏语系仡佬语族，分黔北、黔中、黔西等多个方言，方言间差异较大，多数人兼通汉语。历史上仡佬族无本民族文字，长期靠口传心授传承文化。现虽有学者设计以拉丁字母为基础的拼音文字方案，但未广泛普及，日常交流与书面记录仍以汉文为主',
    history: '仡佬族是古代"濮人"后裔，商周时期便在西南地区活动，汉代称"夜郎蛮"，唐宋后有"葛僚""仡僚"等族称记载，曾以农耕、采矿为生，擅长冶炼。历史上多次迁徙，与周边民族深度融合，1956年被识别为单一民族，部分支系因长期与其他民族杂居，习俗逐渐相近，但仍保留核心民族文化',
    culture: {
      attire: { title: '仡佬族服饰', desc: '仡佬族服饰色彩以青、蓝、白为主，风格因支系略有差异。传统男子穿对襟短衫、长裤，缠青布头巾，系腰带；妇女穿无领右衽长衣，袖口、衣襟绣花纹，下着百褶裙或长裤，戴银簪、耳环等首饰，部分支系妇女会裹绑腿。现日常多穿便装，节庆时仍会穿戴绣有民族纹样的传统服饰，凸显文化特色', img: 'images/仡佬族_服饰_new.jpg' },
      architecture: { title: '仡佬族建筑', desc: '仡佬族传统建筑适应山地环境，常见"吊脚楼"和"石板房"。吊脚楼依山而建，木质结构，底层架空养牲畜、堆杂物，上层住人；石板房以当地青石为材料，屋顶盖石板，墙体砌石板，冬暖夏凉。部分地区也有土木结构的平房，屋内设火塘，是家庭活动核心，村寨多沿山坡或溪流分布，布局灵活', img: 'images/仡佬族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '仡佬族重要节日有春节、祭山节和吃新节。祭山节在农历三月，祭祀山神祈求丰收，会举行献祭品、唱祭歌等仪式；吃新节在稻谷初熟时，尝新米、祭祖先，伴有歌舞活动。春节习俗与汉族相近，但会增加打糍粑、跳传统舞蹈等民族活动，部分支系还有"闹元宵""过小年"等特色节庆', img: 'images/仡佬族_节日_new.jpg' },
      food: { title: '仡佬族饮食', desc: '仡佬族以稻米、玉米为主食，擅长制作糍粑、米粉、糯米饭。特色菜肴有"酸鲊肉"（用糯米腌制猪肉）、"灰豆腐"（豆腐经草木灰加工），日常喜食酸辣味，常以酸汤、辣椒调味。饮酒普遍，多饮自酿米酒，待客时会备腊肉、香肠等特色菜，部分地区保留"手抓肉"的饮食习俗，体现山地民族饮食特点', img: 'images/仡佬族_饮食_new.jpg' }
    }
  },
  { name: '畲族', pinyin: 'Shezu', alpha: 'S', tags: ['福建','乌饭'], img: 'images/she_cover.jpg',
    population: '约74.6万人',
    distribution: '主要聚居在福建省、浙江省，核心分布区为福建宁德、龙岩，浙江丽水、温州等地；此外，在江西省、广东省、安徽省也有少量散居，整体呈"大分散、小聚居"格局，多与汉族或其他民族交错居住',
    language: '畲语属于汉藏语系苗瑶语族瑶语支，内部可分为闽东、浙南、粤东等方言，不同方言间存在一定差异；由于长期与汉族杂居，多数畲族群众通用汉语（如闽语、吴语），纯畲语使用者主要集中在部分偏远山区。畲族历史上无本民族通用文字，现日常交流、教育及文化传播多使用汉语汉字',
    history: '畲族起源与古代"武陵蛮""五溪蛮"等南方族群有渊源，早期活动于长江中下游流域。畲族拥有丰富的传统节日体系，其中春节、"二月二"会亲节和"三月三"乌饭节是最具代表性的三大节日，体现了畲族对祖先的敬奉、历史的纪念及农耕文化的传承',
    culture: {
      attire: { title: '畲族服饰', desc: '畲族男女服饰基本类同于当地汉人。但人口相对集中的闽浙两地畲族服饰尚存一定的民族特色，尤以闽省畲家妇女特色显著，并因地域、婚姻状态而纷呈异彩。闽东北畲族妇女发式称为"凤凰髻"，16岁前少女用红绒缠辫子，盘绕头上，额前留"留海"，畲族称为"布妮头"。成年已婚妇女发式畲族称为"山哈娜头"，随地域不同略有差异，体现了独特的民族服饰文化', img: 'images/畲族_服饰_new.jpg' },
      architecture: { title: '畲族建筑', desc: '畲族建筑作为山地民族智慧的结晶，融合了自然适应性与文化独特性，主要分布在浙江、福建等山区。传统建筑以木结构为主，适应山地环境，体现了畲族人民与自然和谐共生的建筑智慧', img: 'images/畲族_建筑_new.png' },
      festival: { title: '传统节日', desc: '畲族拥有丰富的传统节日体系，其中春节、"二月二"会亲节和"三月三"乌饭节是最具代表性的三大节日，体现了畲族对祖先的敬奉、历史的纪念及农耕文化的传承。这些节日承载着深厚的文化内涵和民族精神', img: 'images/畲族_节日_new.jpg' },
      food: { title: '畲族饮食', desc: '畲族饮食以稻米为主食，辅以竹笋、番薯等，特色食品包括乌米饭、菅叶粽和糍粑，饮品以自产烘青茶和糯米酒为主，节日食俗如三月三食乌饭和端午制菅粽体现了深厚的文化传承，展现了独特的饮食文化特色', img: 'images/畲族_饮食_new.jpg' }
    }
  },
  { name: '高山族', pinyin: 'Gaoshanzu', alpha: 'G', tags: ['台湾','原住民'], img: 'images/gaoshan_cover.jpg',
    population: '约50万人',
    distribution: '主要分布在台湾省，包括阿美、泰雅、排湾、布农、卑南、鲁凯、邹、赛夏、雅美、邵、噶玛兰、太鲁阁、撒奇莱雅、赛德克、拉阿鲁哇、卡那卡那富等16个族群',
    language: '高山族语言属于南岛语系，各族群有自己的语言，如阿美语、泰雅语、排湾语等',
    history: '高山族是台湾的原住民，有着悠久的历史和丰富的文化传统',
    culture: {
      attire: { title: '高山族服饰', desc: '高山族服饰因族群而异，通常色彩鲜艳，装饰精美，体现了各族的独特文化特色', img: 'images/高山族_服饰_new.jpg' },
      architecture: { title: '高山族建筑', desc: '传统建筑多为木结构，适应山地环境，体现了与自然和谐共生的建筑智慧', img: 'images/高山族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '各族群有自己独特的传统节日和庆典活动，承载着深厚的文化内涵', img: 'images/高山族_节日_new.jpg' },
      food: { title: '高山族饮食', desc: '以稻米、小米为主食，擅长制作各种传统美食，体现了独特的饮食文化', img: 'images/高山族_饮食_new.jpg' }
    }
  },
  { name: '拉祜族', pinyin: 'Lahuzu', alpha: 'L', tags: ['云南','葫芦'], img: 'images/lahu_cover.jpg',
    population: '约48.6万人',
    distribution: '主要分布在云南省普洱市、临沧市、西双版纳州等地',
    language: '拉祜语属于汉藏语系藏缅语族彝语支',
    history: '拉祜族是云南的古老民族，有着悠久的历史和丰富的文化传统',
    culture: {
      attire: { title: '拉祜族服饰', desc: '拉祜族服饰以黑色为主，配以彩色装饰，体现了山地民族的特色', img: 'images/拉祜族_服饰_new.jpg' },
      architecture: { title: '拉祜族建筑', desc: '传统建筑多为干栏式，适应山地环境，体现了独特的建筑智慧', img: 'images/拉祜族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '拉祜族有丰富的传统节日，如葫芦节、扩塔节等，体现了深厚的文化内涵', img: 'images/拉祜族_节日_new.jpg' },
      food: { title: '拉祜族饮食', desc: '以稻米、玉米为主食，擅长制作各种传统美食，体现了独特的饮食文化', img: 'images/拉祜族_饮食_new.jpg' }
    }
  },
  { name: '水族', pinyin: 'Shuizu', alpha: 'S', tags: ['贵州','水书'], img: 'images/shui_cover.jpg',
    population: '约41.2万人',
    distribution: '主要分布在贵州省三都水族自治县及周边地区',
    language: '水语属于汉藏语系壮侗语族侗水语支',
    history: '水族是贵州的古老民族，有着悠久的历史和独特的文化传统',
    culture: {
      attire: { title: '水族服饰', desc: '水族服饰以青色为主，配以精美的刺绣，体现了独特的民族特色', img: 'images/水族_服饰_new.jpg' },
      architecture: { title: '水族建筑', desc: '传统建筑多为木结构，适应山地环境，体现了独特的建筑智慧', img: 'images/水族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '水族有丰富的传统节日，如端节、卯节等，体现了深厚的文化内涵', img: 'images/水族_节日_new.jpg' },
      food: { title: '水族饮食', desc: '以稻米为主食，擅长制作各种传统美食，体现了独特的饮食文化', img: 'images/水族_饮食_new.jpg' }
    }
  },
  { name: '东乡族', pinyin: 'Dongxiangzu', alpha: 'D', tags: ['甘肃','东乡语'], img: 'images/dongxiang_cover.jpg',
    population: '约62.2万人',
    distribution: '主要分布在甘肃省临夏回族自治州东乡族自治县及周边地区',
    language: '东乡语属于阿尔泰语系蒙古语族',
    history: '东乡族是甘肃的古老民族，有着悠久的历史和独特的文化传统',
    culture: {
      attire: { title: '东乡族服饰', desc: '东乡族服饰兼具伊斯兰文化特征与游牧民族传统元素，体现了独特的民族特色', img: 'images/东乡族_服饰_new.jpg' },
      architecture: { title: '东乡族建筑', desc: '传统建筑融合了实用性与宗教文化内涵，体现了独特的建筑智慧', img: 'images/东乡族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '东乡族的主要传统节日包括开斋节、古尔邦节等，体现了深厚的宗教文化底蕴', img: 'images/东乡族_节日_new.jpg' },
      food: { title: '东乡族饮食', desc: '以青稞、洋芋为主食，特色食品有栈羊肉、清汤羊肉等，体现了独特的饮食文化', img: 'images/东乡族_饮食_new.jpg' }
    }
  },
  { name: '纳西族', pinyin: 'Naxizu', alpha: 'N', tags: ['云南','东巴文'], img: 'images/naxi_cover.jpg',
    population: '约32.6万人',
    distribution: '主要分布在云南省丽江市、迪庆州等地',
    language: '纳西语属于汉藏语系藏缅语族彝语支',
    history: '纳西族是云南的古老民族，有着悠久的历史和独特的文化传统',
    culture: {
      attire: { title: '纳西族服饰', desc: '纳西族服饰以黑色为主，配以精美的刺绣，体现了独特的民族特色', img: 'images/纳西族_服饰.jpg' },
      architecture: { title: '纳西族建筑', desc: '传统建筑多为木结构，适应山地环境，体现了独特的建筑智慧', img: 'images/纳西族_建筑.jpg' },
      festival: { title: '传统节日', desc: '纳西族有丰富的传统节日，如三朵节、火把节等，体现了深厚的文化内涵', img: 'images/纳西族_节日.jpg' },
      food: { title: '纳西族饮食', desc: '以稻米、玉米为主食，擅长制作各种传统美食，体现了独特的饮食文化', img: 'images/纳西族_饮食.jpg' }
    }
  },
  { name: '景颇族', pinyin: 'Jingpozu', alpha: 'J', tags: ['云南','目瑙纵歌'], img: 'images/jingpo_cover.jpg',
    population: '约14.8万人',
    distribution: '主要分布在云南省德宏州等地',
    language: '景颇语属于汉藏语系藏缅语族景颇语支',
    history: '景颇族是云南的古老民族，有着悠久的历史和独特的文化传统',
    culture: {
      attire: { title: '景颇族服饰', desc: '景颇族服饰色彩鲜艳，装饰精美，体现了独特的民族特色', img: 'images/景颇族_服饰.jpg' },
      architecture: { title: '景颇族建筑', desc: '传统建筑多为木结构，适应山地环境，体现了独特的建筑智慧', img: 'images/景颇族_建筑.jpg' },
      festival: { title: '传统节日', desc: '景颇族有丰富的传统节日，如目瑙纵歌节等，体现了深厚的文化内涵', img: 'images/景颇族_节日.jpg' },
      food: { title: '景颇族饮食', desc: '以稻米、玉米为主食，擅长制作各种传统美食，体现了独特的饮食文化', img: 'images/景颇族_饮食.jpg' }
    }
  },
  { name: '土族', pinyin: 'Tuzu', alpha: 'T', tags: ['青海','安昭舞'], img: 'images/tu_cover.jpg',
    population: '约28.9万人',
    distribution: '主要分布在青海省互助土族自治县及周边地区',
    language: '土语属于阿尔泰语系蒙古语族',
    history: '土族是青海的古老民族，有着悠久的历史和独特的文化传统',
    culture: {
      attire: { title: '土族服饰', desc: '土族服饰色彩鲜艳，装饰精美，体现了独特的民族特色', img: 'images/土族_服饰_new.jpg' },
      architecture: { title: '土族建筑', desc: '传统建筑多为木结构，适应山地环境，体现了独特的建筑智慧', img: 'images/土族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '土族有丰富的传统节日，如纳顿节等，体现了深厚的文化内涵', img: 'images/土族_节日_new.jpg' },
      food: { title: '土族饮食', desc: '以青稞、小麦为主食，擅长制作各种传统美食，体现了独特的饮食文化', img: 'images/土族_饮食_new.jpg' }
    }
  },
  { name: '达斡尔族', pinyin: 'Dawoerzu', alpha: 'D', tags: ['内蒙古','曲棍球'], img: 'images/dawoer_cover.jpg',
    population: '约13.2万人',
    distribution: '主要分布在内蒙古自治区、黑龙江省等地',
    language: '达斡尔语属于阿尔泰语系蒙古语族',
    history: '达斡尔族是东北的古老民族，有着悠久的历史和独特的文化传统',
    culture: {
      attire: { title: '达斡尔族服饰', desc: '达斡尔族服饰以青色为主，配以精美的刺绣，体现了独特的民族特色', img: 'images/达斡尔族_服饰_new.jpg' },
      architecture: { title: '达斡尔族建筑', desc: '传统建筑多为木结构，适应北方环境，体现了独特的建筑智慧', img: 'images/达斡尔族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '达斡尔族有丰富的传统节日，如库木勒节等，体现了深厚的文化内涵', img: 'images/达斡尔族_节日_new.jpg' },
      food: { title: '达斡尔族饮食', desc: '以小米、荞麦为主食，擅长制作各种传统美食，体现了独特的饮食文化', img: 'images/达斡尔族_饮食_new.jpg' }
    }
  },
  { name: '仫佬族', pinyin: 'Mulaozu', alpha: 'M', tags: ['广西','依饭节'], img: 'images/mulao_cover.jpg',
    population: '约21.6万人',
    distribution: '主要分布在广西壮族自治区罗城仫佬族自治县及周边地区',
    language: '仫佬语属于汉藏语系壮侗语族侗水语支',
    history: '仫佬族是广西的古老民族，有着悠久的历史和独特的文化传统',
    culture: {
      attire: { title: '仫佬族服饰', desc: '仫佬族服饰以青色为主，配以精美的刺绣，体现了独特的民族特色', img: 'images/仫佬族_服饰_new.jpg' },
      architecture: { title: '仫佬族建筑', desc: '传统建筑多为木结构，适应山地环境，体现了独特的建筑智慧', img: 'images/仫佬族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '仫佬族有丰富的传统节日，如依饭节等，体现了深厚的文化内涵', img: 'images/仫佬族_节日_new.jpg' },
      food: { title: '仫佬族饮食', desc: '以稻米、玉米为主食，擅长制作各种传统美食，体现了独特的饮食文化', img: 'images/仫佬族_饮食_new.jpg' }
    }
  },
  { name: '羌族', pinyin: 'Qiangzu', alpha: 'Q', tags: ['四川','羌笛'], img: 'images/qiang_cover.jpg',
    population: '约30.9万人',
    distribution: '主要分布在四川省阿坝州、绵阳市等地',
    language: '羌语属于汉藏语系藏缅语族羌语支',
    history: '羌族是四川的古老民族，有着悠久的历史和独特的文化传统',
    culture: {
      attire: { title: '羌族服饰', desc: '羌族服饰色彩鲜艳，装饰精美，体现了独特的民族特色', img: 'images/羌族_服饰_new.jpg' },
      architecture: { title: '羌族建筑', desc: '传统建筑多为石砌碉楼，适应山地环境，体现了独特的建筑智慧', img: 'images/羌族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '羌族有丰富的传统节日，如羌年等，体现了深厚的文化内涵', img: 'images/羌族_节日_new.jpg' },
      food: { title: '羌族饮食', desc: '以青稞、小麦为主食，擅长制作各种传统美食，体现了独特的饮食文化', img: 'images/羌族_饮食_new.jpg' }
    }
  },
  { name: '布朗族', pinyin: 'Bulangzu', alpha: 'B', tags: ['云南','茶文化'], img: 'images/bulang_cover.jpg',
    population: '约11.9万人',
    distribution: '主要分布在云南省西双版纳州、临沧市等地',
    language: '布朗语属于南亚语系孟高棉语族',
    history: '布朗族是云南的古老民族，有着悠久的历史和独特的文化传统',
    culture: {
      attire: { title: '布朗族服饰', desc: '布朗族服饰以黑色为主，配以精美的刺绣，体现了独特的民族特色', img: 'images/布朗族_服饰_new.jpg' },
      architecture: { title: '布朗族建筑', desc: '传统建筑多为木结构，适应山地环境，体现了独特的建筑智慧', img: 'images/布朗族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '布朗族有丰富的传统节日，如桑康节等，体现了深厚的文化内涵', img: 'images/布朗族_节日_new.jpg' },
      food: { title: '布朗族饮食', desc: '以稻米、玉米为主食，擅长制作各种传统美食，体现了独特的饮食文化', img: 'images/布朗族_饮食_new.jpg' }
    }
  },
  { name: '撒拉族', pinyin: 'Salazu', alpha: 'S', tags: ['青海','花儿'], img: 'images/sala_cover.jpg',
    population: '约13.1万人',
    distribution: '主要分布在青海省循化撒拉族自治县及周边地区',
    language: '撒拉语属于阿尔泰语系突厥语族',
    history: '撒拉族是青海的古老民族，有着悠久的历史和独特的文化传统',
    culture: {
      attire: { title: '撒拉族服饰', desc: '撒拉族服饰兼具伊斯兰文化特征与民族传统元素，体现了独特的民族特色', img: 'images/撒拉族_服饰_new.jpg' },
      architecture: { title: '撒拉族建筑', desc: '传统建筑融合了实用性与宗教文化内涵，体现了独特的建筑智慧', img: 'images/撒拉族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '撒拉族的主要传统节日包括开斋节、古尔邦节等，体现了深厚的宗教文化底蕴', img: 'images/撒拉族_节日_new.jpg' },
      food: { title: '撒拉族饮食', desc: '以小麦、青稞为主食，特色食品有手抓羊肉等，体现了独特的饮食文化', img: 'images/撒拉族_饮食_new.jpg' }
    }
  },
  { name: '毛南族', pinyin: 'Maonanzu', alpha: 'M', tags: ['广西','分龙节'], img: 'images/maonan_cover.jpg',
    population: '约10.7万人',
    distribution: '主要分布在广西壮族自治区环江毛南族自治县及周边地区',
    language: '毛南语属于汉藏语系壮侗语族侗水语支',
    history: '毛南族是广西的古老民族，有着悠久的历史和独特的文化传统',
    culture: {
      attire: { title: '毛南族服饰', desc: '毛南族服饰以青色为主，配以精美的刺绣，体现了独特的民族特色', img: 'images/毛南族_服饰_new.jpg' },
      architecture: { title: '毛南族建筑', desc: '传统建筑多为木结构，适应山地环境，体现了独特的建筑智慧', img: 'images/毛南族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '毛南族有丰富的传统节日，如分龙节等，体现了深厚的文化内涵', img: 'images/毛南族_节日_new.jpg' },
      food: { title: '毛南族饮食', desc: '以稻米、玉米为主食，擅长制作各种传统美食，体现了独特的饮食文化', img: 'images/毛南族_饮食_new.jpg' }
    }
  },
  { name: '仡佬族', pinyin: 'Gelaozu', alpha: 'G', tags: ['贵州','傩戏'], img: 'images/gelao_cover.jpg',
    population: '约67.7万人',
    distribution: '主要分布在贵州省遵义市、安顺市等地',
    language: '仡佬语属于汉藏语系仡佬语族',
    history: '仡佬族是贵州的古老民族，有着悠久的历史和独特的文化传统',
    culture: {
      attire: { title: '仡佬族服饰', desc: '仡佬族服饰以青色为主，配以精美的刺绣，体现了独特的民族特色', img: 'images/仡佬族_服饰_new.jpg' },
      architecture: { title: '仡佬族建筑', desc: '传统建筑多为木结构，适应山地环境，体现了独特的建筑智慧', img: 'images/仡佬族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '仡佬族有丰富的传统节日，如祭山节等，体现了深厚的文化内涵', img: 'images/仡佬族_节日_new.jpg' },
      food: { title: '仡佬族饮食', desc: '以稻米、玉米为主食，擅长制作各种传统美食，体现了独特的饮食文化', img: 'images/仡佬族_饮食_new.jpg' }
    }
  },
  { name: '锡伯族', pinyin: 'Xibozu', alpha: 'X', tags: ['新疆','西迁节'], img: 'images/xibo_cover.jpg',
    population: '约19.1万人',
    distribution: '主要分布在新疆维吾尔自治区察布查尔锡伯自治县及周边地区',
    language: '锡伯语属于阿尔泰语系满-通古斯语族',
    history: '锡伯族是新疆的古老民族，有着悠久的历史和独特的文化传统',
    culture: {
      attire: { title: '锡伯族服饰', desc: '锡伯族服饰色彩鲜艳，装饰精美，体现了独特的民族特色', img: 'images/锡伯族_服饰_new.jpg' },
      architecture: { title: '锡伯族建筑', desc: '传统建筑多为木结构，适应北方环境，体现了独特的建筑智慧', img: 'images/锡伯族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '锡伯族有丰富的传统节日，如西迁节等，体现了深厚的文化内涵', img: 'images/锡伯族_节日_new.jpg' },
      food: { title: '锡伯族饮食', desc: '以小麦、大米为主食，擅长制作各种传统美食，体现了独特的饮食文化', img: 'images/锡伯族_饮食_new.jpg' }
    }
  },
  { name: '阿昌族', pinyin: 'Achangzu', alpha: 'A', tags: ['云南','户撒刀'], img: 'images/achang_cover.jpg',
    population: '约3.9万人',
    distribution: '主要分布在云南省德宏州等地',
    language: '阿昌语属于汉藏语系藏缅语族缅语支',
    history: '阿昌族是云南的古老民族，有着悠久的历史和独特的文化传统',
    culture: {
      attire: { title: '阿昌族服饰', desc: '阿昌族服饰色彩鲜艳，装饰精美，体现了独特的民族特色', img: 'images/阿昌族_服饰_new.jpg' },
      architecture: { title: '阿昌族建筑', desc: '传统建筑多为木结构，适应山地环境，体现了独特的建筑智慧', img: 'images/阿昌族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '阿昌族有丰富的传统节日，如阿露窝罗节等，体现了深厚的文化内涵', img: 'images/阿昌族_节日_new.jpg' },
      food: { title: '阿昌族饮食', desc: '以稻米、玉米为主食，擅长制作各种传统美食，体现了独特的饮食文化', img: 'images/阿昌族_饮食_new.jpg' }
    }
  },
  { name: '普米族', pinyin: 'Pumizu', alpha: 'P', tags: ['云南','锅庄舞'], img: 'images/pumi_cover.jpg',
    population: '约4.2万人',
    distribution: '主要分布在云南省丽江市、怒江州等地',
    language: '普米语属于汉藏语系藏缅语族羌语支',
    history: '普米族是云南的古老民族，有着悠久的历史和独特的文化传统',
    culture: {
      attire: { title: '普米族服饰', desc: '普米族服饰色彩鲜艳，装饰精美，体现了独特的民族特色', img: 'images/普米族_服饰_new.jpg' },
      architecture: { title: '普米族建筑', desc: '传统建筑多为木结构，适应山地环境，体现了独特的建筑智慧', img: 'images/普米族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '普米族有丰富的传统节日，如吾昔节等，体现了深厚的文化内涵', img: 'images/普米族_节日_new.jpg' },
      food: { title: '普米族饮食', desc: '以青稞、小麦为主食，擅长制作各种传统美食，体现了独特的饮食文化', img: 'images/普米族_饮食_new.jpg' }
    }
  },
  { name: '塔塔尔族', pinyin: 'Tataerzu', alpha: 'T', tags: ['新疆','萨班节'], img: 'images/tataer_cover.jpg',
    population: '约3556人',
    distribution: '主要分布在新疆维吾尔自治区乌鲁木齐市、伊宁市等地',
    language: '塔塔尔语属于阿尔泰语系突厥语族',
    history: '塔塔尔族是新疆的古老民族，有着悠久的历史和独特的文化传统',
    culture: {
      attire: { title: '塔塔尔族服饰', desc: '塔塔尔族服饰色彩鲜艳，装饰精美，体现了独特的民族特色', img: 'images/塔塔尔族_服饰_new.jpg' },
      architecture: { title: '塔塔尔族建筑', desc: '传统建筑多为木结构，适应北方环境，体现了独特的建筑智慧', img: 'images/塔塔尔族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '塔塔尔族有丰富的传统节日，如萨班节等，体现了深厚的文化内涵', img: 'images/塔塔尔族_节日_new.jpg' },
      food: { title: '塔塔尔族饮食', desc: '以小麦、大米为主食，擅长制作各种传统美食，体现了独特的饮食文化', img: 'images/塔塔尔族_饮食_new.jpg' }
    }
  },
  { name: '鄂温克族', pinyin: 'Ewenkezu', alpha: 'E', tags: ['内蒙古','驯鹿'], img: 'images/ewenke_cover.jpg',
    population: '约3.1万人',
    distribution: '主要分布在内蒙古自治区呼伦贝尔市等地',
    language: '鄂温克语属于阿尔泰语系满-通古斯语族',
    history: '鄂温克族是内蒙古的古老民族，有着悠久的历史和独特的文化传统',
    culture: {
      attire: { title: '鄂温克族服饰', desc: '鄂温克族服饰色彩鲜艳，装饰精美，体现了独特的民族特色', img: 'images/鄂温克族_服饰_new.jpg' },
      architecture: { title: '鄂温克族建筑', desc: '传统建筑多为木结构，适应北方环境，体现了独特的建筑智慧', img: 'images/鄂温克族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '鄂温克族有丰富的传统节日，如瑟宾节等，体现了深厚的文化内涵', img: 'images/鄂温克族_节日_new.jpg' },
      food: { title: '鄂温克族饮食', desc: '以肉类、奶制品为主食，擅长制作各种传统美食，体现了独特的饮食文化', img: 'images/鄂温克族_饮食_new.jpg' }
    }
  },
  { name: '鄂伦春族', pinyin: 'Elunchunzu', alpha: 'E', tags: ['黑龙江','狩猎'], img: 'images/elunchun_cover.jpg',
    population: '约8659人',
    distribution: '主要分布在黑龙江省、内蒙古自治区等地',
    language: '鄂伦春语属于阿尔泰语系满-通古斯语族',
    history: '鄂伦春族是东北的古老民族，有着悠久的历史和独特的文化传统',
    culture: {
      attire: { title: '鄂伦春族服饰', desc: '鄂伦春族服饰以兽皮为主，配以精美的装饰，体现了独特的民族特色', img: 'images/鄂伦春族_服饰_new.jpg' },
      architecture: { title: '鄂伦春族建筑', desc: '传统建筑多为木结构，适应北方环境，体现了独特的建筑智慧', img: 'images/鄂伦春族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '鄂伦春族有丰富的传统节日，如古伦木沓节等，体现了深厚的文化内涵', img: 'images/鄂伦春族_节日_new.jpg' },
      food: { title: '鄂伦春族饮食', desc: '以肉类、鱼类为主食，擅长制作各种传统美食，体现了独特的饮食文化', img: 'images/鄂伦春族_饮食_new.jpg' }
    }
  },
  { name: '赫哲族', pinyin: 'Hezhezu', alpha: 'H', tags: ['黑龙江','鱼皮衣'], img: 'images/hezhe_cover.jpg',
    population: '约5354人',
    distribution: '主要分布在黑龙江省同江市、饶河县等地',
    language: '赫哲语属于阿尔泰语系满-通古斯语族',
    history: '赫哲族是黑龙江的古老民族，有着悠久的历史和独特的文化传统',
    culture: {
      attire: { title: '赫哲族服饰', desc: '赫哲族服饰以鱼皮为主，配以精美的装饰，体现了独特的民族特色', img: 'images/赫哲族_服饰_new.jpg' },
      architecture: { title: '赫哲族建筑', desc: '传统建筑多为木结构，适应北方环境，体现了独特的建筑智慧', img: 'images/赫哲族_建筑_new.jpg' },
      festival: { title: '传统节日', desc: '赫哲族有丰富的传统节日，如乌日贡节等，体现了深厚的文化内涵', img: 'images/赫哲族_节日_new.jpg' },
      food: { title: '赫哲族饮食', desc: '以鱼类、肉类为主食，擅长制作各种传统美食，体现了独特的饮食文化', img: 'images/赫哲族_饮食_new.jpg' }
    }
  }
];

// 合并民族数据（已合并到主数组中）

// 去重并合并（按 pinyin 唯一）
(function normalizeEthnics() {
  const exist = new Map();
  ETHNIC_LIST.forEach(e => {
    const key = (e.pinyin || e.name || '').toLowerCase();
    if (!exist.has(key)) exist.set(key, e);
  });
  ETHNIC_LIST = Array.from(exist.values());
  console.log(`已加载 ${ETHNIC_LIST.length} 个民族数据`);
})();

const PAGE_SIZE = SIMPLE_MODE ? 12 : 24;
let currentAlpha = 'ALL';
let currentPage = 1;

function renderAZ() {
  const letters = ['ALL','A','B','C','D','E','F','G','H','J','K','L','M','N','P','Q','R','S','T','W','X','Y','Z'];
  if (SIMPLE_MODE) { overviewAZ.innerHTML = ''; return; }
  overviewAZ.innerHTML = letters.map(l => `<button data-alpha="${l}">${l}</button>`).join('');
  $$('button', overviewAZ).forEach(btn => {
    btn.addEventListener('click', () => {
      // 点击动效 + 涟漪
      btn.classList.add('pulse');
      setTimeout(() => btn.classList.remove('pulse'), 360);
      currentAlpha = btn.dataset.alpha; currentPage = 1; updateOverview();
    });
  });
}

function getFiltered() {
  return ETHNIC_LIST.filter(e => currentAlpha === 'ALL' ? true : e.alpha === currentAlpha);
}

function renderGrid(list) {
  overviewGrid.innerHTML = list.map(e => `
    <article class="ethnic-card">
      <div class="card-img" style="background-image:url('${e.img}');"></div>
      <div class="card-body">
        <h4 class="card-title">${e.name} <span class="pin">${e.pinyin}</span></h4>
        <div class="tags">${(e.tags||[]).slice(0,3).map(t=>`<span>${t}</span>`).join('')}</div>
        <a href="#minzu/${(e.pinyin||'').toLowerCase()}" class="card-link">查看详情</a>
      </div>
    </article>`).join('');
}

function renderPager(total) {
  if (SIMPLE_MODE) { overviewPager.innerHTML = ''; return; }
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  let html = '';
  for (let i = 1; i <= pages; i++) {
    html += `<button data-page="${i}" class="${i===currentPage?'active':''}">${i}</button>`;
  }
  overviewPager.innerHTML = html;
  // 等待容器内图片加载完成的工具
  const waitImages = (container) => {
    const imgs = Array.from(container.querySelectorAll('img'));
    if (imgs.length === 0) return Promise.resolve();
    return Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(res => {
      img.addEventListener('load', res, { once: true });
      img.addEventListener('error', res, { once: true });
    })));
  };

  $$('button', overviewPager).forEach(btn => btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    // 点击动效
    btn.classList.add('pulse');
    setTimeout(() => btn.classList.remove('pulse'), 360);
    const keepY = window.pageYOffset;
    const gridTopBeforeAbs = overviewGrid.getBoundingClientRect().top + window.pageYOffset;
    // 临时锁定高度避免抖动
    const prevHeight = overviewGrid.offsetHeight;
    overviewGrid.style.minHeight = prevHeight + 'px';
    if (document.activeElement) { try { document.activeElement.blur(); } catch(_){} }
    const next = Number(btn.dataset.page || '1');
    if (next === currentPage) return; // 同页不处理
    currentPage = next;
    updateOverview();
    // 等图片加载稳定后再恢复滚动位置，避免跳动
    try { await waitImages(overviewGrid); } catch(_) {}
    const gridTopAfterAbs = overviewGrid.getBoundingClientRect().top + window.pageYOffset;
    const delta = gridTopAfterAbs - gridTopBeforeAbs;
    window.scrollTo({ top: keepY + delta, behavior: 'auto' });
    overviewGrid.style.minHeight = '';
  }));
}

function updateOverview() {
  // 高亮 AZ
  if (!SIMPLE_MODE) $$('button', overviewAZ).forEach(b => b.classList.toggle('active', b.dataset.alpha === currentAlpha));
  const list = getFiltered();
  renderPager(list.length);
  const items = SIMPLE_MODE ? list.slice(0, PAGE_SIZE) : list.slice((currentPage - 1) * PAGE_SIZE, (currentPage - 1) * PAGE_SIZE + PAGE_SIZE);
  renderGrid(items);
}

renderAZ();
updateOverview();

// =================== 简易 Hash 路由与详情渲染 ===================
const homeMain = $('#home');
const detailView = $('#detailView');
const detailBack = $('#detailBack');
const detailBannerImg = $('#detailBannerImg');
const detailTitle = $('#detailTitle');
const detailSlogan = $('#detailSlogan');
const detailFacts = $('#detailFacts');
// const detailMasonry = $('#detailMasonry'); // 已删除民族影像库
const detailStories = $('#detailStories');

function parseRoute() {
  const hash = location.hash || '';
  const m = hash.match(/^#minzu\/([a-z0-9_-]+)/i);
  if (m) return { name: 'detail', slug: m[1].toLowerCase() };
  return { name: 'home' };
}

function findEthnicBySlug(slug) {
  return ETHNIC_LIST.find(e => (e.pinyin||'').toLowerCase() === slug);
}

function renderDetail(e) {
  // Banner
  detailBannerImg.src = e.img;
  detailBannerImg.alt = e.name + ' 民族封面';
  detailTitle.textContent = `${e.name} ${e.pinyin ? e.pinyin : ''}`;
  detailSlogan.textContent = '文化的温度与力量，在此相遇';

  // 概况 - 使用实际数据或占位示例
  const facts = [
    `人口与分布：${e.population || '示例描述（可替换为权威数据）'}`,
    `语言文字：${e.language || '示例描述'}`,
    `历史渊源：${e.history || '示例描述'}`
  ];
  detailFacts.innerHTML = facts.map(t => `<li>${t}</li>`).join('');

  // 特色 - 使用实际数据或占位示例
  if (e.culture) {
    $('#featAttire').style.backgroundImage = `url('${e.culture.attire?.img || e.img}')`;
    $('#featArch').style.backgroundImage = `url('${e.culture.architecture?.img || e.img}')`;
    $('#featFestival').style.backgroundImage = `url('${e.culture.festival?.img || e.img}')`;
    $('#featFood').style.backgroundImage = `url('${e.culture.food?.img || e.img}')`;
    $('#featAttireText').textContent = `服饰：${e.culture.attire?.desc || '示例解读（待补充）'}`;
    $('#featArchText').textContent = `建筑：${e.culture.architecture?.desc || '示例解读（待补充）'}`;
    $('#featFestivalText').textContent = `节日：${e.culture.festival?.desc || '示例解读（待补充）'}`;
    $('#featFoodText').textContent = `饮食：${e.culture.food?.desc || '示例解读（待补充）'}`;
  } else {
    // 兼容旧数据结构
  $('#featAttire').style.backgroundImage = `url('${e.img}')`;
  $('#featArch').style.backgroundImage = `url('${e.img}')`;
  $('#featFestival').style.backgroundImage = `url('${e.img}')`;
  $('#featFood').style.backgroundImage = `url('${e.img}')`;
  $('#featAttireText').textContent = '服饰：示例解读（待补充）';
  $('#featArchText').textContent = '建筑：示例解读（待补充）';
  $('#featFestivalText').textContent = '节日：示例解读（待补充）';
  $('#featFoodText').textContent = '饮食：示例解读（待补充）';
  }

  // 影像库已删除

  // 故事（占位）
  if (detailStories) detailStories.innerHTML = '';
}

function switchView(name) {
  if (name === 'detail') {
    homeMain.hidden = true;
    detailView.hidden = false;
    window.scrollTo({ top: 0, behavior: 'auto' });
  } else {
    detailView.hidden = true;
    homeMain.hidden = false;
  }
}

function router() {
  const r = parseRoute();
  if (r.name === 'detail') {
    const e = findEthnicBySlug(r.slug);
    if (e) { renderDetail(e); switchView('detail'); }
    else { switchView('home'); }
  } else {
    switchView('home');
  }
}

if (!SIMPLE_MODE) {
  window.addEventListener('hashchange', router);
  detailBack.addEventListener('click', () => { history.pushState(null, '', '#'); router(); });
  router();
} else {
  // 简洁模式：禁用详情视图
  if (detailView) detailView.hidden = true;
  // 卡片链接改为不跳转
  overviewGrid.addEventListener('click', e => {
    const link = e.target.closest('a.card-link');
    if (link) { e.preventDefault(); alert('简洁模式：详情页未启用'); }
  });
}

function addBubble(text, role = 'user') {
  const div = document.createElement('div');
  div.className = `bubble ${role}`;
  div.innerHTML = text;
  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function setThinking(show) {
  let thinking = $('.ai-thinking', chatBody);
  if (show) {
    if (!thinking) {
      thinking = document.createElement('div');
      thinking.className = 'ai-thinking';
      thinking.innerHTML = '<div class="spinner"></div><span>AI 正在思考…</span>';
      chatBody.appendChild(thinking);
    }
  } else if (thinking) {
    thinking.remove();
  }
  chatBody.scrollTop = chatBody.scrollHeight;
}

function answerFor(query) {
  // 简单的本地规则回答（占位）。可替换为真实 API。
  const q = query.toLowerCase();
  if (q.includes('那达慕') || q.includes('nadamu')) {
    return '那达慕大会的主要项目包括：・赛马 ・摔跤 ・射箭。更多影像可在“影像库”中查看→ <a class="hint-link" href="#gallery">前往影像库</a>';
  }
  if (q.includes('苗族') && (q.includes('银饰') || q.includes('寓意'))) {
    return '苗族银饰常见“银角”象征图腾与守护，常用于重大节日与婚嫁。推荐阅读：<a class="hint-link" href="#stories">苗族故事</a>';
  }
  return '很抱歉，目前暂未收录该问题的相关信息，你可以尝试其他问题，或前往“互动专区”的“文化问答”。';
}

// 智谱 AI 接入（ZhipuAI）
const ZHIPU_ENDPOINTS = [
  'https://open.bigmodel.cn/api/paas/v4/chat/completions'
];
const LS_ZHIPU_KEY = 'ZHIPU_API_KEY';
const DEFAULT_ZHIPU_KEY = '1ec8caf19a3d4b649bb91259fe6cf8ad.tc8wmq1gfVNoJWQq';
function getZhipuKey() { try { return localStorage.getItem(LS_ZHIPU_KEY) || DEFAULT_ZHIPU_KEY || ''; } catch(_) { return DEFAULT_ZHIPU_KEY || ''; } }
function setZhipuKey(k) { try { localStorage.setItem(LS_ZHIPU_KEY, k || ''); } catch(_) {} }

async function ensureZhipuKey() {
  let key = getZhipuKey();
  if (!key) {
    key = window.prompt('请输入 智谱AI API Key（仅保存在本机浏览器）：', '') || '';
    if (key) setZhipuKey(key.trim());
  }
  return getZhipuKey();
}

async function callZhipuChat(query) {
  const apiKey = await ensureZhipuKey();
  if (!apiKey) throw new Error('缺少智谱 API 密钥');
  const payload = {
    model: 'glm-4.5',
    messages: [
      { role: 'system', content: '你是民族文化讲解助手，请用简洁、准确、尊重的语气回答。' },
      { role: 'user', content: String(query || '') }
    ],
    temperature: 0.6,
    stream: false
  };
  let lastErr;
  for (const ep of ZHIPU_ENDPOINTS) {
    try {
      const res = await fetch(ep, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': 'Bearer ' + apiKey 
        }, 
        body: JSON.stringify(payload) 
      });
      if (!res.ok) { 
        const errorData = await res.json().catch(() => ({}));
        lastErr = new Error('Zhipu 请求失败：' + res.status + ' ' + (errorData.error?.message || res.statusText)); 
        continue; 
      }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content || '';
      if (!content) { lastErr = new Error('Zhipu 无返回内容'); continue; }
      return String(content).replace(/\n/g, '<br>');
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Zhipu 不可用');
}

// =============== 智谱AI 接入 ===============

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  $('.chat-placeholder', chatBody)?.remove();
  addBubble(text, 'user');
  chatInput.value = '';
  chatSend.disabled = true;
  setThinking(true);
  try {
    const reply = await callZhipuChat(text);
    setThinking(false);
    addBubble(reply, 'ai');
  } catch (err) {
    setThinking(false);
    addBubble('AI 暂时不可用，请检查智谱 API Key 或稍后重试。', 'ai');
  } finally {
    chatSend.disabled = false;
    chatInput.focus();
  }
}

chatInput.addEventListener('input', () => {
  chatSend.disabled = chatInput.value.trim().length === 0;
  // 自适应高度
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
});
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
chatSend.addEventListener('click', sendMessage);

chatClear.addEventListener('click', () => {
  if (!confirm('是否清除所有对话记录？')) return;
  chatBody.innerHTML = '<div class="chat-placeholder">欢迎咨询民族文化 AI 助手！你可以问我“傣族泼水节的由来”“藏族酥油茶怎么做”等问题～</div>';
});

chatHelp.addEventListener('click', () => {
  const tip = document.createElement('div');
  tip.className = 'bubble ai';
  tip.textContent = '可咨询民族习俗、服饰、节日等问题，例如“蒙古族那达慕有哪些项目？”';
  chatBody.appendChild(tip);
  setTimeout(() => tip.remove(), 10000);
  chatBody.scrollTop = chatBody.scrollHeight;
});

// 可选：表情（占位插入）
$('#chatEmoji').addEventListener('click', () => {
  chatInput.value += ' 🙂';
  chatInput.dispatchEvent(new Event('input'));
  chatInput.focus();
});



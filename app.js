/* global STORIES */
(function () {
  'use strict';

  const storiesGrid = document.getElementById('stories-grid');
  const storiesView = document.getElementById('stories-view');
  const playerView = document.getElementById('player-view');
  const backToStoriesBtn = document.getElementById('back-to-stories');
  const storyImage = document.getElementById('story-image');
  const storyTitle = document.getElementById('story-title');
  const nodeText = document.getElementById('node-text');
  const choicesEl = document.getElementById('choices');
  const themeToggle = document.getElementById('theme-toggle');

  let currentStory = null;
  let currentNodeId = null;
  // حفظ موقعیت اسکرول و آخرین داستان باز شده برای بازگشت روی همان کارت
  let lastScrollY = 0;
  let lastStoryId = null;

  function attachImageFallback(imgElement) {
    if (!imgElement || imgElement.__fallbackAttached) return;
    imgElement.__fallbackAttached = true;
    imgElement.addEventListener('error', () => {
      imgElement.src = 'assets/images/placeholder.svg';
    });
  }

  function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    themeToggle.querySelector('.icon').textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') {
      setTheme(saved);
      return;
    }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
  }

  themeToggle.addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    setTheme(isDark ? 'light' : 'dark');
  });

  function createStoryCard(story) {
    const card = document.createElement('article');
    card.className = 'story-card glass';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `شروع ${story.title}`);
    card.dataset.id = story.id;

    const img = document.createElement('img');
    img.src = story.image;
    img.alt = story.title;
    img.className = 'story-thumb themable';
    attachImageFallback(img);

    const body = document.createElement('div');
    body.className = 'story-body';

    const h3 = document.createElement('h3');
    h3.className = 'story-title';
    h3.textContent = story.title;

    const p = document.createElement('p');
    p.className = 'story-desc';
    p.textContent = story.tagline || 'یک ماجراجویی چندمسیره';

    body.appendChild(h3);
    body.appendChild(p);
    card.appendChild(img);
    card.appendChild(body);

    card.addEventListener('click', () => openStory(story.id));
    card.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') openStory(story.id);
    });
    return card;
  }

  function renderStories() {
    storiesGrid.innerHTML = '';
    STORIES.forEach((story) => storiesGrid.appendChild(createStoryCard(story)));
  }

  function openStory(storyId) {
    // ذخیره موقعیت اسکرول و شناسه کارت برای بازگشت
    lastScrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    lastStoryId = storyId;

    currentStory = STORIES.find((s) => s.id === storyId);
    if (!currentStory) return;
    currentNodeId = 'start';
    storyImage.src = currentStory.image;
    storyImage.classList.add('themable');
    attachImageFallback(storyImage);
    storyTitle.textContent = currentStory.title;
    storiesView.classList.remove('active');
    playerView.classList.add('active');
    renderNode();
  }

  function getNode() {
    return currentStory.nodes[currentNodeId];
  }

  function renderNode() {
    const node = getNode();
    nodeText.innerHTML = toHtmlParagraphs(node.text);
    choicesEl.innerHTML = '';

    if (node.ending) {
      const actions = document.createElement('div');
      actions.className = 'actions-row';

      const restart = document.createElement('button');
      restart.className = 'primary-btn';
      restart.textContent = 'شروع دوباره';
      restart.addEventListener('click', () => {
        currentNodeId = 'start';
        renderNode();
      });

      const back = document.createElement('button');
      back.className = 'secondary-btn';
      back.textContent = 'بازگشت به فهرست';
      back.addEventListener('click', () => goHome());

      actions.appendChild(restart);
      actions.appendChild(back);
      choicesEl.appendChild(actions);
      return;
    }

    (node.choices || []).forEach((choice) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice.text;
      btn.addEventListener('click', () => {
        currentNodeId = choice.next;
        renderNode();
      });
      choicesEl.appendChild(btn);
    });
  }

  function goHome() {
    playerView.classList.remove('active');
    storiesView.classList.add('active');
    const restoreY = lastScrollY;
    const restoreId = lastStoryId;
    // بعد از نمایان شدن لیست، اسکرول بازگردانده و روی همان کارت فوکوس شود
    requestAnimationFrame(() => {
      window.scrollTo(0, restoreY || 0);
      if (restoreId) {
        const card = document.querySelector(`.story-card[data-id="${restoreId}"]`);
        if (card) {
          // جلوگیری از اسکرول اضافه هنگام فوکوس
          if (typeof card.focus === 'function') {
            try { card.focus({ preventScroll: true }); } catch (e) { card.focus(); }
          }
        }
      }
    });

    currentStory = null;
    currentNodeId = null;
  }

  backToStoriesBtn.addEventListener('click', goHome);

  // Prevent zoom gestures to feel like standalone app
  function preventZoomBehavior() {
    // Keyboard zoom
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=')) {
        e.preventDefault();
      }
    }, { passive: false });
    // Wheel zoom
    window.addEventListener('wheel', (e) => {
      if (e.ctrlKey) e.preventDefault();
    }, { passive: false });
    // Gesture zoom (mobile)
    window.addEventListener('gesturestart', (e) => e.preventDefault());
    window.addEventListener('dblclick', (e) => e.preventDefault());
  }

  function toHtmlParagraphs(text) {
    if (!text) return '';
    return String(text)
      .split(/\n{2,}/)
      .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`) // preserve single line breaks
      .join('');
  }

  // Extend story text with kid-friendly supportive narration to increase length
  // no auto-extension or auto-choice formatting; texts and choices come from data

  function preloadImages() {
    STORIES.forEach((s) => {
      const img = new Image();
      img.src = s.image;
    });
  }

  // Boot
  initTheme();
  renderStories();
  preloadImages();
  preventZoomBehavior();
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(registration => {
          console.log('✅ Service Worker registered successfully');
          
          // چک کردن برای آپدیت
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // نمایش پیام آپدیت
                if (confirm('نسخه جدید برنامه آماده است! آیا می‌خواهید بروزرسانی کنید؟')) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
              }
            });
          });
        })
        .catch(error => console.log('❌ SW registration failed:', error));
    });
  }

  // مدیریت نصب PWA
  let deferredPrompt;
  const installButton = document.createElement('button');
  installButton.textContent = '📱 نصب برنامه';
  installButton.className = 'install-btn';
  installButton.style.display = 'none';

  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('💡 برنامه قابل نصب است');
    e.preventDefault();
    deferredPrompt = e;
    
    // نمایش دکمه نصب
    installButton.style.display = 'inline-block';
    document.querySelector('.header').appendChild(installButton);
  });

  installButton.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      console.log('نتیجه نصب:', result);
      
      if (result.outcome === 'accepted') {
        console.log('✅ کاربر برنامه را نصب کرد');
      } else {
        console.log('❌ کاربر نصب را رد کرد');
      }
      
      deferredPrompt = null;
      installButton.style.display = 'none';
    }
  });

  // چک کردن حالت آفلاین
  window.addEventListener('online', () => {
    console.log('🌐 اتصال اینترنت برقرار شد');
    document.body.classList.remove('offline');
  });

  window.addEventListener('offline', () => {
    console.log('📵 اتصال اینترنت قطع شد - حالت آفلاین');
    document.body.classList.add('offline');
  });
})();



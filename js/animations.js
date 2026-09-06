/* ==========================================================================
   Campus Connect - Ronnsquare-Style Cinematic Scroll Animation Engine
   js/animations.js
   ========================================================================== */

(function () {
  'use strict';

  // State & Motion Coordinator Variables
  let rafId = null;
  let isRunning = false;
  let targetScrollY = window.pageYOffset || document.documentElement.scrollTop;
  let currentScrollY = targetScrollY;
  let scrollVelocity = 0;
  let scrollDirection = 1;
  let lastScrollTime = performance.now();
  let isReducedMotion = false;
  let isMobile = false;

  // Cached Elements for High-Performance Animation
  let animatedElements = [];
  let parallaxBackground = null;
  let heroContainer = null;
  let heroPreviewCard = null;

  /* ---------- DETECT PREFERENCES & DEVICE ---------- */
  function updateDeviceCapabilities() {
    isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    isMobile = window.innerWidth < 768;
  }

  /* ---------- ELEMENT REGISTRATION & CACHING ---------- */
  function refreshAnimatedElements() {
    updateDeviceCapabilities();

    parallaxBackground = document.getElementById('bc-bg');
    heroContainer = document.querySelector('#view-landing > .perspective-container') || document.querySelector('.perspective-container');
    heroPreviewCard = document.querySelector('.lg\\:col-span-5 .card-3d') || document.querySelector('.animate-float');

    const selector = '.reveal-on-scroll, .reveal-scale, .reveal-slide-left, .reveal-slide-right, .stat-card-3d, .feed-item-card, .role-select-card';
    const domNodes = Array.from(document.querySelectorAll(selector));

    animatedElements = domNodes.map((el) => {
      // Find index within immediate sibling grid if applicable for staggered timing
      let staggerIndex = 0;
      if (el.parentElement) {
        const siblings = Array.from(el.parentElement.children);
        staggerIndex = siblings.indexOf(el) % 4;
      }

      return {
        el,
        staggerIndex,
        type: el.classList.contains('reveal-scale') ? 'scale' :
              el.classList.contains('reveal-slide-left') ? 'slide-left' :
              el.classList.contains('reveal-slide-right') ? 'slide-right' : 'default',
        isCard: el.classList.contains('card-3d') || el.classList.contains('stat-card-3d'),
        lastProgress: -1
      };
    });
  }

  /* ---------- CONTINUOUS SCROLL PROGRESS CALCULATOR ---------- */
  // Calculates continuous normalized progress (0.0 when entering bottom -> 1.0 when leaving top)
  function getElementProgress(el, vh) {
    const rect = el.getBoundingClientRect();
    const totalTravel = vh + rect.height;
    if (totalTravel <= 0) return 0;
    const progress = (vh - rect.top) / totalTravel;
    return Math.min(Math.max(progress, 0), 1);
  }

  /* ---------- TICK / RENDER FRAME (GPU TRANSFORM COMPOSER) ---------- */
  function renderFrame() {
    if (isReducedMotion) {
      // In reduced motion, ensure all elements are visible without transforms
      animatedElements.forEach(item => {
        item.el.classList.add('is-visible');
        item.el.style.removeProperty('--scroll-opacity');
        item.el.style.removeProperty('--scroll-ty');
        item.el.style.removeProperty('--scroll-scale');
        item.el.style.removeProperty('--scroll-rx');
      });
      isRunning = false;
      return;
    }

    const vh = window.innerHeight;
    const now = performance.now();
    const dt = Math.max(now - lastScrollTime, 1);
    lastScrollTime = now;

    // Smooth scroll interpolation lerp (faster on mobile, ultra-fluid on desktop)
    const lerpFactor = isMobile ? 0.35 : 0.12;
    const diff = targetScrollY - currentScrollY;
    currentScrollY += diff * lerpFactor;
    scrollVelocity = (diff * lerpFactor) / (dt / 16.67);
    scrollDirection = diff >= 0 ? 1 : -1;

    // 1. Multi-Layer Background Parallax (Slow, deep subtle float)
    if (parallaxBackground) {
      const bgY = currentScrollY * -0.1;
      parallaxBackground.style.transform = `translate3d(0, ${bgY.toFixed(2)}px, 0)`;
    }

    // 2. Hero Section Cinematic Exit & Depth Recession
    if (heroContainer) {
      const heroRect = heroContainer.getBoundingClientRect();
      if (heroRect.bottom > 0 && heroRect.top < vh) {
        const heroTravel = Math.max(0, -heroRect.top);
        const heroRatio = Math.min(heroTravel / (vh * 0.9), 1);

        // Smoothly scale down and recede with 3D perspective as user scrolls down
        const heroScale = (1 - heroRatio * 0.05).toFixed(4);
        const heroY = (heroTravel * 0.22).toFixed(2);
        const heroOpacity = Math.max(1 - heroRatio * 1.25, 0).toFixed(3);
        const heroZ = (-heroRatio * 50).toFixed(1);

        heroContainer.style.transform = `perspective(1200px) translate3d(0, ${heroY}px, ${heroZ}px) scale(${heroScale})`;
        heroContainer.style.opacity = heroOpacity;
      } else if (heroRect.top >= 0) {
        heroContainer.style.transform = 'perspective(1200px) translate3d(0, 0px, 0px) scale(1)';
        heroContainer.style.opacity = '1';
      }
    }

    // 3. Hero Graphic Preview Card Multi-Rate Parallax
    if (heroPreviewCard && !heroPreviewCard.dataset.pointerHovered) {
      const heroRect = heroPreviewCard.getBoundingClientRect();
      if (heroRect.bottom > 0 && heroRect.top < vh) {
        const previewOffset = (vh - heroRect.top) * 0.04;
        const subtleRot = Math.min(Math.max((currentScrollY * 0.015), -4), 4);
        heroPreviewCard.style.transform = `perspective(1000px) translate3d(0, ${-previewOffset.toFixed(1)}px, 10px) rotateY(${subtleRot.toFixed(2)}deg)`;
      }
    }

    // 4. Scrubbed Section & Card Scroll-Linked Transforms (Reversible On Scroll Up)
    for (let i = 0; i < animatedElements.length; i++) {
      const item = animatedElements[i];
      const el = item.el;

      // Skip elements that are inside hidden tabs / views
      if (el.offsetParent === null) continue;

      const rawProgress = getElementProgress(el, vh);

      // Apply subtle stagger offset based on grid column
      const staggerDamp = item.staggerIndex * 0.035;
      const progress = Math.min(Math.max((rawProgress - staggerDamp) / (1 - staggerDamp), 0), 1);

      // Only re-apply if progress changed meaningfully
      if (Math.abs(progress - item.lastProgress) < 0.001) continue;
      item.lastProgress = progress;

      // PHASE A: Entering from bottom (progress 0.0 -> 0.28)
      if (progress < 0.28) {
        const enterFactor = progress / 0.28;
        // Cubic ease out for fluid deceleration
        const easeEnter = 1 - Math.pow(1 - enterFactor, 3);

        const ty = ((1 - easeEnter) * 38).toFixed(2);
        const scale = (0.94 + easeEnter * 0.06).toFixed(4);
        const opacity = Math.min(enterFactor * 1.35, 1).toFixed(3);
        const rx = isMobile ? 0 : ((1 - easeEnter) * 4).toFixed(2);

        el.style.setProperty('--scroll-opacity', opacity);
        el.style.setProperty('--scroll-ty', `${ty}px`);
        el.style.setProperty('--scroll-scale', scale);
        el.style.setProperty('--scroll-rx', `${rx}deg`);

        if (progress > 0.06) {
          el.classList.add('is-visible');
        } else {
          el.classList.remove('is-visible');
        }
      }
      // PHASE B: In Active Viewing Zone (progress 0.28 -> 0.78)
      else if (progress <= 0.78) {
        // Continuous subtle midground parallax
        const midProgress = (progress - 0.28) / 0.5; // 0 to 1 across center zone
        const parallaxY = ((midProgress - 0.5) * -16).toFixed(2);

        el.classList.add('is-visible');
        el.style.setProperty('--scroll-opacity', '1');
        el.style.setProperty('--scroll-ty', `${parallaxY}px`);
        el.style.setProperty('--scroll-scale', '1');
        el.style.setProperty('--scroll-rx', '0deg');

        // If card contains an image, apply subtle image zoom parallax
        const cardImg = el.querySelector('.img-zoom');
        if (cardImg) {
          const imgScale = (1.0 + (midProgress * 0.04)).toFixed(3);
          cardImg.style.setProperty('--parallax-scale', imgScale);
        }
      }
      // PHASE C: Exiting toward Top of Viewport (progress > 0.78)
      else {
        const exitFactor = (progress - 0.78) / 0.22;
        const easeExit = Math.pow(exitFactor, 2);

        const ty = (easeExit * -22).toFixed(2);
        const scale = (1 - easeExit * 0.035).toFixed(4);
        const opacity = (1 - easeExit * 0.45).toFixed(3);
        const rx = isMobile ? 0 : (easeExit * -2.5).toFixed(2);

        el.classList.add('is-visible');
        el.style.setProperty('--scroll-opacity', opacity);
        el.style.setProperty('--scroll-ty', `${ty}px`);
        el.style.setProperty('--scroll-scale', scale);
        el.style.setProperty('--scroll-rx', `${rx}deg`);
      }
    }

    // Continue loop if still interpolating or scrolling
    if (Math.abs(diff) > 0.3 || Math.abs(scrollVelocity) > 0.05) {
      rafId = requestAnimationFrame(renderFrame);
    } else {
      currentScrollY = targetScrollY;
      isRunning = false;
    }
  }

  /* ---------- SCROLL & RESIZE LISTENERS ---------- */
  function wakeScrollEngine() {
    targetScrollY = window.pageYOffset || document.documentElement.scrollTop;
    if (!isRunning) {
      isRunning = true;
      lastScrollTime = performance.now();
      rafId = requestAnimationFrame(renderFrame);
    }
  }

  window.addEventListener('scroll', wakeScrollEngine, { passive: true });

  window.addEventListener('resize', () => {
    updateDeviceCapabilities();
    refreshAnimatedElements();
    wakeScrollEngine();
  }, { passive: true });

  /* ---------- LEGACY COMPATIBILITY HOOKS ---------- */
  window.initScrollObserver = function () {
    refreshAnimatedElements();
    wakeScrollEngine();
  };

  /* ---------- 3D CARD TILT & SPECULAR GLARE ENGINE (WITH PARALLAX BLENDING) ---------- */
  window.init3DTiltCards = function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const isTouchMobile = ('ontouchstart' in window) && window.innerWidth < 768;

    const tiltTargets = document.querySelectorAll('.card-3d, [data-tilt], .stat-card-3d, .step-card-3d, .role-select-card');

    tiltTargets.forEach(card => {
      if (card.dataset.tiltInitialized) return;
      card.dataset.tiltInitialized = 'true';

      let tiltRafId = null;
      let rect = card.getBoundingClientRect();

      // Create specular glare overlay if not exists
      let glare = card.querySelector('.card-glare-effect');
      if (!glare && !card.classList.contains('no-glare')) {
        glare = document.createElement('div');
        glare.className = 'card-glare-effect pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 z-10';
        glare.style.background = 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)';
        card.appendChild(glare);
      }

      function onPointerEnter() {
        rect = card.getBoundingClientRect();
        card.dataset.pointerHovered = 'true';
        card.style.transition = 'transform 0.1s ease-out';
        if (glare) glare.style.opacity = '1';
      }

      function onPointerMove(e) {
        if (isTouchMobile) return;
        if (tiltRafId) cancelAnimationFrame(tiltRafId);

        tiltRafId = requestAnimationFrame(() => {
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;

          const maxTilt = card.dataset.tiltMax ? parseFloat(card.dataset.tiltMax) : 7;
          const rotateX = ((y - centerY) / centerY) * -maxTilt;
          const rotateY = ((x - centerX) / centerX) * maxTilt;

          card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(8px) scale3d(1.015, 1.015, 1.015)`;

          if (glare) {
            const glareX = (x / rect.width) * 100;
            const glareY = (y / rect.height) * 100;
            const isDark = document.documentElement.classList.contains('dark');
            glare.style.background = isDark
              ? `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(34, 211, 238, 0.18) 0%, rgba(124, 58, 237, 0.1) 40%, rgba(0,0,0,0) 70%)`
              : `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 65%)`;
          }
        });
      }

      function onPointerLeave() {
        if (tiltRafId) cancelAnimationFrame(tiltRafId);
        delete card.dataset.pointerHovered;
        card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s ease';
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)';
        if (glare) glare.style.opacity = '0';
      }

      card.addEventListener('pointerenter', onPointerEnter, { passive: true });
      card.addEventListener('pointermove', onPointerMove, { passive: true });
      card.addEventListener('pointerleave', onPointerLeave, { passive: true });
    });
  };

  /* ---------- ANIMATED STAT COUNTER ---------- */
  window.animateValue = function (obj, start, end, duration) {
    if (!obj) return;
    let startTimestamp = null;
    const isPercent = String(end).includes('%');
    const numEnd = parseInt(end, 10) || 0;
    const numStart = parseInt(start, 10) || 0;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease out
      const current = Math.floor(easeProgress * (numEnd - numStart) + numStart);
      obj.innerText = isPercent ? current + '%' : current;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        obj.innerText = end;
      }
    };
    window.requestAnimationFrame(step);
  };

  /* ---------- LANDING STATS & USER STATE RENDERER ---------- */
  window.renderLandingStats = async function () {
    if (typeof appState === 'undefined') return;

    try {
      const res = await fetch('backend/complaints/list.php?public=1');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        appState.complaints = data.data;
      }
    } catch (e) {}

    const total = (appState.complaints || []).length;
    const cleared = (appState.complaints || []).filter(c => c.status === 'Completed' || c.status === 'Perfectly Completed' || c.stage === 7).length;
    
    const statTotal = document.getElementById('lStatTotal');
    const statCleared = document.getElementById('lStatCleared');
    
    if (statTotal) window.animateValue(statTotal, 0, total, 1000);
    if (statCleared) {
      const pct = total ? Math.round((cleared / total) * 100) + '%' : '100%';
      window.animateValue(statCleared, 0, pct, 1200);
    }

    const banner = document.getElementById('loggedInHomeBanner');
    const navSlot = document.getElementById('navRightAuthSlot');
    const userChip = document.getElementById('userChip');

    if (typeof currentSession !== 'undefined' && currentSession) {
      if (banner) banner.classList.remove('hidden');
      if (navSlot) navSlot.classList.add('hidden');
      if (userChip) {
        userChip.classList.remove('hidden');
        userChip.classList.add('flex');
      }
      
      const bannerName = document.getElementById('bannerUserName');
      const bannerRole = document.getElementById('bannerUserRole');
      if (bannerName) bannerName.innerText = currentSession.name;
      if (bannerRole) bannerRole.innerText = (currentSession.role || '').toUpperCase();
    }
  };

  /* ---------- DOM READY INITIALIZATION ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    refreshAnimatedElements();
    window.init3DTiltCards();
    window.renderLandingStats();
    wakeScrollEngine();

    // Re-index dynamically rendered items (e.g. public feed, dashboard tabs)
    setTimeout(() => {
      refreshAnimatedElements();
      wakeScrollEngine();
    }, 400);
  });

})();

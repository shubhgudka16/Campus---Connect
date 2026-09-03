/* ==========================================================================
   Campus Connect - Ronnsquare-Grade Cinematic Motion & Animation Engine
   Stack: GSAP 3 + ScrollTrigger + Lenis Smooth Scroll
   js/animations.js
   ========================================================================== */

(function () {
  'use strict';

  // Global Engine References
  let lenis = null;
  let isReducedMotion = false;
  let isMobile = false;
  let isTablet = false;
  let hasGSAP = false;
  let hasScrollTrigger = false;
  let hasLenis = false;
  let scrollTriggersList = [];

  /* ---------- DEVICE & CAPABILITY INSPECTOR ---------- */
  function updateCapabilities() {
    isReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    isMobile = window.innerWidth < 768;
    isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    hasGSAP = typeof gsap !== 'undefined';
    hasScrollTrigger = typeof ScrollTrigger !== 'undefined';
    hasLenis = typeof Lenis !== 'undefined';
  }

  /* ---------- LENIS SMOOTH SCROLL FOUNDATION ---------- */
  function initLenisSmoothScroll() {
    if (isReducedMotion || !hasLenis) return null;

    try {
      lenis = new Lenis({
        duration: isMobile ? 0.9 : 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Silky exponential ease-out
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        mouseMultiplier: isMobile ? 0.8 : 1,
        smoothTouch: false, // Maintain native responsive touch feel on touch screens
        touchMultiplier: 1.5,
        infinite: false
      });

      window.campusLenis = lenis;

      // Coordinate Lenis with GSAP ScrollTrigger ticker
      if (hasGSAP && hasScrollTrigger) {
        lenis.on('scroll', ScrollTrigger.update);

        gsap.ticker.add((time) => {
          lenis.raf(time * 1000);
        });

        gsap.ticker.lagSmoothing(0);
      } else {
        // Fallback standalone RAF loop for Lenis
        function raf(time) {
          lenis.raf(time);
          requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
      }

      // Pause Lenis when modal overlays are active to allow seamless modal-internal scrolling
      const modalObserver = new MutationObserver(() => {
        const anyModalOpen = document.querySelector(
          '#modalProfile:not(.hidden), #modalComplaint:not(.hidden), #modalImg:not(.hidden), #modalRegister:not(.hidden)'
        );
        if (anyModalOpen) {
          lenis.stop();
        } else {
          lenis.start();
        }
      });
      modalObserver.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });

      return lenis;
    } catch (e) {
      console.warn('Campus Connect: Lenis init fallback', e);
      return null;
    }
  }

  /* ---------- PAGE ENTRANCE CHOREOGRAPHY (RONNSQUARE LOAD) ---------- */
  function runPageEntranceAnimations() {
    if (isReducedMotion) {
      document.querySelectorAll('.reveal-on-scroll, .reveal-scale, .reveal-slide-left, .reveal-slide-right').forEach(el => {
        el.classList.add('is-visible');
      });
      return;
    }

    if (!hasGSAP) {
      // Graceful fallback: reveal all immediately
      document.querySelectorAll('.reveal-on-scroll, .reveal-scale, .reveal-slide-left, .reveal-slide-right').forEach(el => {
        el.classList.add('is-visible');
      });
      return;
    }

    // Mark HTML as GSAP-managed to prevent CSS transition conflicts
    document.documentElement.classList.add('gsap-loaded');

    const entranceTl = gsap.timeline({
      defaults: { ease: 'power3.out' }
    });

    // 1. Navigation Header entrance
    const header = document.getElementById('main-header');
    if (header) {
      entranceTl.fromTo(header,
        { y: -18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.65 },
        0
      );
    }

    // 2. Logged-in session banner (if visible)
    const sessionBanner = document.getElementById('loggedInHomeBanner');
    if (sessionBanner && !sessionBanner.classList.contains('hidden')) {
      entranceTl.fromTo(sessionBanner,
        { y: 20, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.7 },
        0.1
      );
    }

    // 3. Hero Section Lead Elements (index.html)
    const heroLeftCol = document.querySelector('#view-landing .lg\\:col-span-7');
    if (heroLeftCol) {
      const heroTagBadge = heroLeftCol.querySelector('.animate-border');
      const heroLeadText = heroLeftCol.querySelector('p');
      const heroButtons = heroLeftCol.querySelectorAll('.btn-animate');
      const hazardCard = heroLeftCol.querySelector('.bg-amber-500\\/10');

      if (heroTagBadge) {
        entranceTl.fromTo(heroTagBadge,
          { y: 14, opacity: 0, scale: 0.94 },
          { y: 0, opacity: 1, scale: 1, duration: 0.6 },
          0.12
        );
      }

      if (heroLeadText) {
        entranceTl.fromTo(heroLeadText,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.75 },
          0.25
        );
      }

      if (heroButtons && heroButtons.length) {
        entranceTl.fromTo(heroButtons,
          { y: 16, opacity: 0, scale: 0.96 },
          { y: 0, opacity: 1, scale: 1, duration: 0.65, stagger: 0.08 },
          0.35
        );
      }

      if (hazardCard) {
        entranceTl.fromTo(hazardCard,
          { y: 22, opacity: 0, scale: 0.97 },
          { y: 0, opacity: 1, scale: 1, duration: 0.7 },
          0.45
        );
      }
    }

    // 4. Hero Right Graphic Card (index.html)
    const heroRightCol = document.querySelector('#view-landing .lg\\:col-span-5');
    if (heroRightCol) {
      const heroCard = heroRightCol.querySelector('.card-3d');
      if (heroCard) {
        entranceTl.fromTo(heroCard,
          { y: 35, opacity: 0, scale: 0.94, rotationY: isMobile ? 0 : 5 },
          { y: 0, opacity: 1, scale: 1, rotationY: 0, duration: 0.9, ease: 'power3.out' },
          0.25
        );
      }
    }

    // 5. Page Views for other pages (portal.html, feed.html, roles.html, login.html)
    const activePageView = document.querySelector('.page-view:not(#view-landing)');
    if (activePageView) {
      entranceTl.fromTo(activePageView,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.65 },
        0.05
      );
    }
  }

  /* ---------- SCROLLTRIGGER REVEAL SYSTEM (PROGRESSIVE & STAGGERED) ---------- */
  function initScrollReveals() {
    if (isReducedMotion || !hasGSAP || !hasScrollTrigger) {
      document.querySelectorAll('.reveal-on-scroll, .reveal-scale, .reveal-slide-left, .reveal-slide-right').forEach(el => {
        el.classList.add('is-visible');
      });
      return;
    }

    // Clean up prior triggers to prevent duplication during dynamic route/tab changes
    scrollTriggersList.forEach(t => t.kill());
    scrollTriggersList = [];

    // --- A. Grid Groups with Natural Stagger ---
    const gridContainers = [
      '#landingStatsGrid',
      '#section-matrix .grid',
      '#publicFeedGrid',
      '#section-roles .grid',
      '.role-select-grid'
    ];

    gridContainers.forEach(gridSel => {
      const container = document.querySelector(gridSel);
      if (!container || container.offsetParent === null) return;

      const children = Array.from(container.children).filter(child => child.nodeType === 1);
      if (!children.length) return;

      // Mark children as visible class for CSS fallback stability
      children.forEach(c => c.classList.add('is-visible'));

      const st = ScrollTrigger.create({
        trigger: container,
        start: 'top 88%',
        once: false,
        onEnter: () => {
          gsap.fromTo(children,
            {
              opacity: 0,
              y: isMobile ? 18 : 32,
              scale: 0.96,
              rotateX: isMobile ? 0 : 3
            },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              rotateX: 0,
              duration: 0.8,
              stagger: isMobile ? 0.05 : 0.09,
              ease: 'power3.out',
              overwrite: 'auto'
            }
          );
        },
        onLeaveBack: () => {
          gsap.to(children, {
            opacity: 0,
            y: isMobile ? 14 : 24,
            scale: 0.97,
            duration: 0.5,
            stagger: 0.04,
            ease: 'power2.in',
            overwrite: 'auto'
          });
        }
      });
      scrollTriggersList.push(st);
    });

    // --- B. Individual Section & Card Scroll Reveals ---
    const revealSelectors = [
      '.reveal-on-scroll',
      '.reveal-scale',
      '.reveal-slide-left',
      '.reveal-slide-right'
    ];

    const allRevealElements = document.querySelectorAll(revealSelectors.join(', '));

    allRevealElements.forEach((el) => {
      // Skip elements that are children of staggered grids already handled above
      if (el.closest('#landingStatsGrid, #section-matrix .grid, #publicFeedGrid')) return;
      if (el.offsetParent === null) return; // Hidden tabs

      el.classList.add('is-visible');

      let fromVars = { opacity: 0, y: isMobile ? 18 : 30, scale: 0.98 };
      if (el.classList.contains('reveal-scale')) {
        fromVars = { opacity: 0, scale: 0.92, y: 15 };
      } else if (el.classList.contains('reveal-slide-left')) {
        fromVars = { opacity: 0, x: isMobile ? -16 : -32 };
      } else if (el.classList.contains('reveal-slide-right')) {
        fromVars = { opacity: 0, x: isMobile ? 16 : 32 };
      }

      const st = ScrollTrigger.create({
        trigger: el,
        start: 'top 87%',
        onEnter: () => {
          gsap.fromTo(el,
            fromVars,
            {
              opacity: 1,
              x: 0,
              y: 0,
              scale: 1,
              duration: 0.85,
              ease: 'power3.out',
              overwrite: 'auto'
            }
          );
        },
        onLeaveBack: () => {
          gsap.to(el, {
            ...fromVars,
            duration: 0.45,
            ease: 'power2.in',
            overwrite: 'auto'
          });
        }
      });
      scrollTriggersList.push(st);
    });

    // --- C. Text Reveal on Major Headings ---
    const headings = document.querySelectorAll('main h2, #section-matrix h2, #section-live-feed h2, .cta-banner h2');
    headings.forEach((heading) => {
      if (heading.offsetParent === null || heading.dataset.textRevealInit) return;
      heading.dataset.textRevealInit = 'true';

      const st = ScrollTrigger.create({
        trigger: heading,
        start: 'top 90%',
        onEnter: () => {
          gsap.fromTo(heading,
            { opacity: 0, y: 22 },
            { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out', overwrite: 'auto' }
          );
        }
      });
      scrollTriggersList.push(st);
    });

    // --- D. Image Reveal Micro-Effects ---
    const cardImages = document.querySelectorAll('.card-3d img, .feed-item-card img, .step-card-3d img, .img-zoom');
    cardImages.forEach((img) => {
      if (img.offsetParent === null || img.dataset.imgRevealInit) return;
      img.dataset.imgRevealInit = 'true';

      const st = ScrollTrigger.create({
        trigger: img,
        start: 'top 92%',
        onEnter: () => {
          gsap.fromTo(img,
            { scale: 1.07, opacity: 0.82 },
            { scale: 1, opacity: 1, duration: 1.1, ease: 'power2.out', overwrite: 'auto' }
          );
        }
      });
      scrollTriggersList.push(st);
    });

    // --- E. Desktop Multi-Layer Background Parallax ---
    const bg = document.getElementById('bc-bg');
    if (bg && !isMobile && !isTablet) {
      const bgSt = ScrollTrigger.create({
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,
        onUpdate: (self) => {
          const yOffset = self.progress * -80;
          bg.style.transform = `translate3d(0, ${yOffset.toFixed(1)}px, 0)`;
        }
      });
      scrollTriggersList.push(bgSt);
    }
  }

  /* ---------- 3D CARD TILT & SPECULAR GLARE (GSAP-ENHANCED) ---------- */
  window.init3DTiltCards = function () {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const isTouchMobile = ('ontouchstart' in window) && window.innerWidth < 768;
    if (isTouchMobile) return; // Native, clean touch experience on mobile

    const tiltTargets = document.querySelectorAll(
      '.card-3d, [data-tilt], .stat-card-3d, .step-card-3d, .role-select-card, .feed-item-card'
    );

    tiltTargets.forEach(card => {
      if (card.dataset.tiltInitialized) return;
      card.dataset.tiltInitialized = 'true';

      let rect = card.getBoundingClientRect();

      // Specular glare overlay
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
        if (glare) glare.style.opacity = '1';
      }

      function onPointerMove(e) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const maxTilt = card.dataset.tiltMax ? parseFloat(card.dataset.tiltMax) : 6.5;
        const rotateX = ((y - centerY) / centerY) * -maxTilt;
        const rotateY = ((x - centerX) / centerX) * maxTilt;

        if (hasGSAP) {
          gsap.to(card, {
            rotationX: rotateX,
            rotationY: rotateY,
            z: 8,
            scale: 1.015,
            duration: 0.22,
            ease: 'power2.out',
            transformPerspective: 1000,
            transformStyle: 'preserve-3d',
            overwrite: 'auto'
          });
        } else {
          card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(8px) scale3d(1.015, 1.015, 1.015)`;
        }

        if (glare) {
          const glareX = (x / rect.width) * 100;
          const glareY = (y / rect.height) * 100;
          const isDark = document.documentElement.classList.contains('dark');
          glare.style.background = isDark
            ? `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(34, 211, 238, 0.16) 0%, rgba(124, 58, 237, 0.08) 40%, rgba(0,0,0,0) 70%)`
            : `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 65%)`;
        }
      }

      function onPointerLeave() {
        delete card.dataset.pointerHovered;
        if (glare) glare.style.opacity = '0';

        if (hasGSAP) {
          gsap.to(card, {
            rotationX: 0,
            rotationY: 0,
            z: 0,
            scale: 1,
            duration: 0.65,
            ease: 'power3.out',
            transformPerspective: 1000,
            overwrite: 'auto'
          });
        } else {
          card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
          card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)';
        }
      }

      card.addEventListener('pointerenter', onPointerEnter, { passive: true });
      card.addEventListener('pointermove', onPointerMove, { passive: true });
      card.addEventListener('pointerleave', onPointerLeave, { passive: true });
    });
  };

  /* ---------- SMOOTH STAT COUNTER ---------- */
  window.animateValue = function (obj, start, end, duration) {
    if (!obj) return;
    const isPercent = String(end).includes('%');
    const numEnd = parseInt(end, 10) || 0;
    const numStart = parseInt(start, 10) || 0;

    if (hasGSAP && !isReducedMotion) {
      const counter = { val: numStart };
      gsap.to(counter, {
        val: numEnd,
        duration: (duration || 1000) / 1000,
        ease: 'power3.out',
        onUpdate: () => {
          obj.innerText = isPercent ? Math.round(counter.val) + '%' : Math.round(counter.val);
        },
        onComplete: () => {
          obj.innerText = end;
        }
      });
      return;
    }

    // Fallback smooth RAF counter
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
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

  /* ---------- COMPATIBILITY HOOK FOR DYNAMIC CONTENT RE-INDEXING ---------- */
  window.initScrollObserver = function () {
    updateCapabilities();
    initScrollReveals();
    if (hasScrollTrigger) {
      ScrollTrigger.refresh();
    }
  };

  /* ---------- INITIALIZATION PIPELINE ---------- */
  function startAnimationEngine() {
    updateCapabilities();

    // Register GSAP plugins
    if (hasGSAP && hasScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
    }

    // Launch Lenis smooth scroll
    initLenisSmoothScroll();

    // Run page entrance
    runPageEntranceAnimations();

    // Run ScrollTrigger reveals
    initScrollReveals();

    // Initialize 3D tilt
    window.init3DTiltCards();

    // Render landing live stats
    window.renderLandingStats();

    // Re-check ScrollTrigger once layout has settled
    setTimeout(() => {
      if (hasScrollTrigger) ScrollTrigger.refresh();
    }, 250);
  }

  // Handle DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startAnimationEngine);
  } else {
    startAnimationEngine();
  }

  // Handle Resize
  window.addEventListener('resize', () => {
    updateCapabilities();
    if (hasScrollTrigger) ScrollTrigger.refresh();
  }, { passive: true });

})();

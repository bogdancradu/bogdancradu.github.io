// Theme functionality
class NomadTheme {
  constructor() {
    this.init();
  }

  init() {
    this.setupNavigation();
    this.setupParticles();
    this.setupAccessibility();
    this.setupTouchGestures();
    this.setupLightbox();
  }

  // Navigation
  setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-links a');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinksContainer = document.querySelector('.nav-links');

    // Mobile menu toggle
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', () => {
        navLinksContainer.classList.toggle('active');
        const isOpen = navLinksContainer.classList.contains('active');
        mobileMenuBtn.setAttribute('aria-expanded', isOpen);
        mobileMenuBtn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
      });
    }

    // Navigation links - no SPA behavior, just mobile menu handling
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        // Close mobile menu on navigation
        navLinksContainer.classList.remove('active');
        if (mobileMenuBtn) {
          mobileMenuBtn.setAttribute('aria-expanded', 'false');
        }
      });
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        navLinksContainer.classList.remove('active');
        if (mobileMenuBtn) {
          mobileMenuBtn.setAttribute('aria-expanded', 'false');
        }
      }
    });
  }

  showSection(sectionId) {
    const sections = document.querySelectorAll('.content-section, .hero');
    
    sections.forEach(section => {
      section.classList.remove('active');
      section.style.display = 'none';
      section.setAttribute('aria-hidden', 'true');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
      if (sectionId === 'home') {
        targetSection.style.display = 'flex';
      } else {
        targetSection.style.display = 'block';
        targetSection.classList.add('active');
      }
      targetSection.setAttribute('aria-hidden', 'false');
      
      // Focus management
      const firstFocusable = targetSection.querySelector('a, button, input, [tabindex]:not([tabindex="-1"])');
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
  }

  updateActiveNav(activeLink) {
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.classList.remove('active');
      link.setAttribute('aria-current', 'false');
    });
    activeLink.classList.add('active');
    activeLink.setAttribute('aria-current', 'page');
  }

  // Lazy-loaded particles
  setupParticles() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;

    // Intersection Observer for lazy loading
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.createParticles();
          observer.disconnect();
        }
      });
    });
    const heroEl = document.querySelector('.hero');
    if (heroEl) {
      observer.observe(heroEl);
    }
  }

  createParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = window.innerWidth < 768 ? 25 : 50; // Fewer on mobile
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.classList.add('particle');
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 6 + 's';
      particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
      particlesContainer.appendChild(particle);
    }
  }

  // Accessibility improvements
  setupAccessibility() {
    // Skip link
    const skipLink = document.createElement('a');
    skipLink.href = '#main';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: var(--primary-color);
      color: white;
      padding: 8px;
      text-decoration: none;
      border-radius: 4px;
      z-index: 1001;
      transition: top 0.3s;
    `;
    
    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);

    // ARIA labels for interactive elements
    document.querySelectorAll('.category-btn').forEach(btn => {
      btn.setAttribute('role', 'button');
      btn.setAttribute('aria-pressed', btn.classList.contains('active'));
    });

    // Live region for dynamic content
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(liveRegion);
    this.liveRegion = liveRegion;
  }

  // Touch gestures for mobile
  setupTouchGestures() {
    let startX = 0;
    let startY = 0;
    
    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
      if (!startX || !startY) return;
      
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      
      const diffX = startX - endX;
      const diffY = startY - endY;
      
      // Horizontal swipe detection
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        if (diffX > 0) {
          // Swipe left - next section
          this.navigateSection('next');
        } else {
          // Swipe right - previous section
          this.navigateSection('prev');
        }
      }
      
      startX = 0;
      startY = 0;
    }, { passive: true });
  }

  navigateSection(direction) {
    const sections = ['home', 'social', 'blog', 'portfolio'];
    const currentSection = document.querySelector('.hero:not([style*="display: none"]), .content-section.active');
    const currentId = currentSection ? currentSection.id : 'home';
    const currentIndex = sections.indexOf(currentId);
    
    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % sections.length;
    } else {
      nextIndex = (currentIndex - 1 + sections.length) % sections.length;
    }
    
    this.showSection(sections[nextIndex]);
    
    // Update live region
    if (this.liveRegion) {
      this.liveRegion.textContent = `Navigated to ${sections[nextIndex]} section`;
    }
  }

  // Simple lightbox for image previews
  setupLightbox() {
    console.log('NomadTheme: setupLightbox initialized');
    // Inject minimal styles
    const style = document.createElement('style');
    style.textContent = `
      .lightbox-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:10000;opacity:0;transition:opacity .18s;flex-direction:column}
      .lightbox-overlay.visible{opacity:1}
      .lightbox-img{max-width:92%;max-height:80vh;box-shadow:0 8px 24px rgba(0,0,0,.6);border-radius:6px}
      .lightbox-caption{color:#ddd;margin-top:12px;font-size:14px;text-align:center;max-width:92%;line-height:1.4}
      .lightbox-close{position:fixed;top:18px;right:18px;color:#fff;font-size:28px;background:transparent;border:none;cursor:pointer;z-index:10001}
      img.lightbox-enabled{cursor:zoom-in}
    `;
    document.head.appendChild(style);

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-hidden','true');
    overlay.style.display = 'none';

    const img = document.createElement('img');
    img.className = 'lightbox-img';
    img.alt = '';

    const caption = document.createElement('div');
    caption.className = 'lightbox-caption';
    caption.style.display = 'none';

    const close = document.createElement('button');
    close.className = 'lightbox-close';
    close.innerHTML = '&times;';
    close.setAttribute('aria-label','Close image preview');

    overlay.appendChild(img);
    overlay.appendChild(caption);
    // Put the close button inside the overlay so it is hidden/shown with it
    close.style.display = 'none';
    overlay.appendChild(close);
    document.body.appendChild(overlay);

    function open(src, alt, captionText) {
      img.src = src;
      img.alt = alt || '';
      if (captionText) {
        caption.textContent = captionText;
        caption.style.display = 'block';
      } else {
        caption.textContent = '';
        caption.style.display = 'none';
      }
      overlay.style.display = 'flex';
      // small timeout to allow transition
      requestAnimationFrame(() => overlay.classList.add('visible'));
      overlay.setAttribute('aria-hidden','false');
      close.style.display = 'block';
      close.focus();
    }

    function closeOverlay() {
      overlay.classList.remove('visible');
      overlay.setAttribute('aria-hidden','true');
      close.style.display = 'none';
      // wait for transition then hide
      setTimeout(() => { overlay.style.display = 'none'; img.src = ''; }, 200);
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeOverlay();
    });
    close.addEventListener('click', closeOverlay);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOverlay(); });

    // Enable on useful images: thumbnails and post content images
    const enableLightboxOn = () => {
      // Only enable lightbox for images inside a single post content
      document.querySelectorAll('.post-article__content img').forEach(el => {
        if (el.classList.contains('no-lightbox')) return;
        if (el.classList.contains('lightbox-enabled')) return;
        el.classList.add('lightbox-enabled');
        el.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const src = el.getAttribute('data-large-src') || el.src;
          const captionText = el.getAttribute('data-caption') || el.alt || el.title || '';
          open(src, el.alt || el.title || '', captionText);
        });
      });
    };

    // Run once now and when DOM changes (e.g., lazy load)
    enableLightboxOn();
    const observer = new MutationObserver(enableLightboxOn);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Blog post filtering
  filterPosts(category) {
    const posts = document.querySelectorAll('.blog-post');
    const buttons = document.querySelectorAll('.category-btn');
    
    buttons.forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    });
    
    event.target.classList.add('active');
    event.target.setAttribute('aria-pressed', 'true');
    
    let visibleCount = 0;
    posts.forEach(post => {
      const categories = post.dataset.categories;
      if (category === 'all' || categories.includes(category)) {
        post.style.display = 'block';
        visibleCount++;
      } else {
        post.style.display = 'none';
      }
    });
    
    // Update live region
    if (this.liveRegion) {
      this.liveRegion.textContent = `Filtered to ${category} category, showing ${visibleCount} posts`;
    }
  }
}

// Initialize theme when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.nomadTheme = new NomadTheme();
});

// Global function for template compatibility
function toggleMobileMenu() {
  window.nomadTheme?.setupNavigation();
}

function showSection(sectionId) {
  window.nomadTheme?.showSection(sectionId);
}

function filterPosts(category) {
  window.nomadTheme?.filterPosts(category);
}
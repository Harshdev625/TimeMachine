document.addEventListener('DOMContentLoaded', function () {
    const themeToggleInput = document.getElementById('toggle');
    const themeToggleButton = document.getElementById('theme-toggle-button');

    if (themeToggleInput && themeToggleButton) {
        const savedTheme = localStorage.getItem('theme');
        const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

        if (savedTheme === 'light' || (!savedTheme && prefersLight)) {
            document.body.classList.add('light-theme');
            themeToggleInput.checked = false;
        } else {
            document.body.classList.remove('light-theme');
            themeToggleInput.checked = true;
        }

        themeToggleInput.addEventListener('change', () => {
            if (themeToggleInput.checked) {
                document.body.classList.remove('light-theme');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.add('light-theme');
                localStorage.setItem('theme', 'light');
            }
        });
    }


    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            if (navLinks) navLinks.classList.toggle('active');
            mobileMenuBtn.classList.toggle('active');
        });
    }

    const heroCard = document.querySelector('.hero-card');
    const cardGlow = heroCard?.querySelector('.card-glow');

    if (heroCard && cardGlow) {
        heroCard.addEventListener('mousemove', (e) => {
            const rect = heroCard.getBoundingClientRect();
            const cardCenterX = rect.left + rect.width / 2;
            const cardCenterY = rect.top + rect.height / 2;
            const deltaX = e.clientX - cardCenterX;
            const deltaY = e.clientY - cardCenterY;

            const moveX = -deltaX * 0.6;
            const moveY = -deltaY * 0.6;

            const glowX = deltaX * 0.03;
            const glowY = deltaY * 0.03;

            heroCard.style.transform = `translateX(calc(-80px + ${moveX}px)) translateY(${moveY}px) scale(0.97) rotateY(-8deg)`;
            cardGlow.style.transform = `translate(calc(-50% + ${glowX}px), calc(-50% + ${glowY}px))`;
        });

        heroCard.addEventListener('mouseleave', () => {
            heroCard.style.transform = 'translateX(0px) translateY(0px) scale(1) rotateY(0deg)';
            cardGlow.style.transform = 'translate(-50%, -50%)';
        });
    }



    const navLinksElements = document.querySelectorAll('.nav-link[href^="#"]');
    navLinksElements.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });


    const lottieAnimations = [
        { id: 'lottie-tracking', path: 'assets/lottie/timeTracker.json' },
        { id: 'lottie-focus', path: 'assets/lottie/target.json' },
        { id: 'lottie-block', path: 'assets/lottie/block.json' },
        { id: 'lottie-report', path: 'assets/lottie/report.json' },
        { id: 'lottie-palette', path: 'assets/lottie/palette.json' },
        { id: 'lottie-privacy', path: 'assets/lottie/Privacy.json' }
    ];

    lottieAnimations.forEach(a => {
        const el = document.getElementById(a.id);
        if (el) {
            lottie.loadAnimation({
                container: el,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                path: a.path
            });
        }
    });



    const navbar = document.querySelector('.navbar');

    function updateNavbar() {
        if (!navbar) return;
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }

    // ensure correct initial state
    updateNavbar();

    window.addEventListener('scroll', updateNavbar);


    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);


    const animateElements = document.querySelectorAll('.feature-card, .screenshot-item, .section-header');
    animateElements.forEach(el => observer.observe(el));


    const hero = document.querySelector('.hero');


    const downloadBtns = document.querySelectorAll('a[href*="chromewebstore"]');
    downloadBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            // You can add Google Analytics or other tracking here
            if (typeof gtag !== 'undefined') {
                gtag('event', 'click', {
                    event_category: 'Download',
                    event_label: 'Chrome Web Store'
                });
            }
        });
    });

    // Add loading animation for external images
    const images = document.querySelectorAll('img[src*="assets/"]');
    images.forEach(img => {
        // Handle error state - show fallback instead of hiding
        img.addEventListener('error', function () {
            console.warn('Failed to load image:', this.src);
            // Don't hide the image, let onerror attribute handle fallback
        });
    });

    // Fullscreen Carousel Functionality
    const carousel = {
        container: document.querySelector('.carousel-slides'),
        slides: document.querySelectorAll('.carousel-slide'),
        dots: document.querySelectorAll('.dot'),
        prevBtn: document.querySelector('.carousel-nav.prev'),
        nextBtn: document.querySelector('.carousel-nav.next'),
        currentSlide: 0,
        totalSlides: 0,
        totalItems: 0,           // totalSlides + cloned items
        slideWidthPercent: 0,    // computed percent width per slide
        isAnimating: false,
        autoplayInterval: null,
        autoplayDelay: 5000,

        init() {
            if (!this.container) return;

            // compute real total slides from initial DOM
            this.totalSlides = this.slides.length || 0;
            if (this.totalSlides === 0) return;
            this.setupInfiniteLoop();
            this.bindEvents();
            this.updateCarousel();
            this.startAutoplay();

            // Recompute sizes on resize/orientation change to avoid cropping (zoom, ctrl+)
            const recomputeHandler = this.recomputeWidths.bind(this);
            window.addEventListener('resize', recomputeHandler);
            window.addEventListener('orientationchange', recomputeHandler);
            // call once to ensure correct sizing
            this.recomputeWidths();
        },

        setupInfiniteLoop() {
            // Clone first and last slides for seamless infinite loop
            const firstSlideClone = this.slides[0].cloneNode(true);
            const lastSlideClone = this.slides[this.totalSlides - 1].cloneNode(true);

            // Add cloned slides (last clone before first, first clone after last)
            this.container.insertBefore(lastSlideClone, this.container.firstChild);
            this.container.appendChild(firstSlideClone);

            // Use centralized recompute to set widths and start position
            this.recomputeWidths();
            this.currentSlide = 1;
            // position without transition
            this.container.style.transition = 'none';
            this.container.style.transform = `translateX(-${this.currentSlide * this.slideWidthPercent}%)`;
        },

        // Recalculate slide/container widths and re-position carousel (safe to call on resize/zoom)
        recomputeWidths() {
            if (!this.container) return;
            const allSlides = this.container.querySelectorAll('.carousel-slide');
            this.totalItems = allSlides.length || 0;
            if (this.totalItems === 0) return;
            // container width is number of items * 100%
            this.container.style.width = (this.totalItems * 100) + '%';
            this.slideWidthPercent = 100 / this.totalItems;
            allSlides.forEach(slide => {
                slide.style.width = this.slideWidthPercent + '%';
            });
            // Reposition to currentSlide using the updated percent
            // Use no-transition to avoid visible jump on resize
            const prevTransition = this.container.style.transition;
            this.container.style.transition = 'none';
            this.container.style.transform = `translateX(-${this.currentSlide * this.slideWidthPercent}%)`;
            // Force reflow then restore transition setting
            // eslint-disable-next-line no-unused-expressions
            this.container.offsetHeight;
            this.container.style.transition = prevTransition || 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
        },

        bindEvents() {
            // Navigation buttons
            if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.prevSlide());
            if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.nextSlide());

            // Dots navigation
            this.dots.forEach((dot, index) => {
                dot.addEventListener('click', () => this.goToSlide(index));
            });

            // Keyboard navigation
            document.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') this.prevSlide();
                if (e.key === 'ArrowRight') this.nextSlide();
            });

            // Pause autoplay on hover
            const carouselContainer = document.querySelector('.screenshot-carousel');
            carouselContainer?.addEventListener('mouseenter', () => this.stopAutoplay());
            carouselContainer?.addEventListener('mouseleave', () => this.startAutoplay());

            // Touch/swipe support
            this.addTouchSupport();
        },

        updateCarousel(skipTransition = false) {
            if (this.isAnimating || !this.container) return;

            this.isAnimating = true;
            // use precomputed slideWidthPercent (kept up-to-date by recomputeWidths)
            if (!this.slideWidthPercent) {
                this.recomputeWidths();
            }
            const slideWidth = this.slideWidthPercent;
            const translateX = -this.currentSlide * slideWidth;

            // Apply or skip transition
            if (skipTransition) {
                this.container.style.transition = 'none';
            } else {
                this.container.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
            }

            this.container.style.transform = `translateX(${translateX}%)`;

            // Update dots (convert carousel index to real slide index)
            const realSlideIndex = this.getRealSlideIndex();
            this.dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === realSlideIndex);
            });

            // Handle infinite loop positioning
            if (!skipTransition) {
                setTimeout(() => {
                    // If we're at a cloned slide, jump to the real slide
                    if (this.currentSlide === 0) {
                        // At cloned last slide, jump to real last slide (index = totalSlides)
                        this.currentSlide = this.totalSlides;
                        // ensure widths still correct then jump
                        this.recomputeWidths();
                        this.updateCarousel(true);
                    } else if (this.currentSlide === this.totalSlides + 1) {
                        // At cloned first slide, jump to real first slide
                        this.currentSlide = 1;
                        this.recomputeWidths();
                        this.updateCarousel(true);
                    }
                    this.isAnimating = false;
                }, 600);
            } else {
                this.isAnimating = false;
            }

        },

        getRealSlideIndex() {
            // Convert carousel index to real slide index (0..totalSlides-1)
            if (this.currentSlide === 0) return this.totalSlides - 1; // cloned last
            if (this.currentSlide === this.totalSlides + 1) return 0; // cloned first
            return this.currentSlide - 1;
        },

        nextSlide() {
            if (this.isAnimating) return;
            this.currentSlide++;
            this.updateCarousel();
        },

        prevSlide() {
            if (this.isAnimating) return;
            this.currentSlide--;
            this.updateCarousel();
        },

        goToSlide(index) {
            if (this.isAnimating) return;
            this.currentSlide = index + 1; // Convert real index to carousel index
            this.updateCarousel();
        },

        startAutoplay() {
            this.stopAutoplay();
            this.autoplayInterval = setInterval(() => {
                this.nextSlide();
            }, this.autoplayDelay);
        },

        stopAutoplay() {
            if (this.autoplayInterval) {
                clearInterval(this.autoplayInterval);
                this.autoplayInterval = null;
            }
        },

        addTouchSupport() {
            let startX = 0;
            let endX = 0;
            const threshold = 50;

            this.container?.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
            });

            this.container?.addEventListener('touchend', (e) => {
                endX = e.changedTouches[0].clientX;
                const diff = startX - endX;

                if (Math.abs(diff) > threshold) {
                    if (diff > 0) {
                        this.nextSlide();
                    } else {
                        this.prevSlide();
                    }
                }
            });
        }
    };

    // Initialize carousel
    carousel.init();

    // Get the button elements from the HTML
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    const scrollBottomBtn = document.getElementById('scrollBottomBtn');

    // Function to handle the visibility of both scroll buttons
    const handleScrollButtons = () => {
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;
        const scrollPosition = window.scrollY;

        // --- Scroll to Top Button Logic ---
        // Show the button if user has scrolled down more than 300px
        if (scrollTopBtn) {
            if (scrollPosition > 300) {
                scrollTopBtn.classList.add('visible');
            } else {
                scrollTopBtn.classList.remove('visible');
            }
        }

        // --- Scroll to Bottom Button Logic ---
        const isNearBottom = scrollPosition + clientHeight >= scrollHeight - 300;
        if (scrollBottomBtn) {
            if (scrollPosition > 100 && !isNearBottom) {
                scrollBottomBtn.classList.add('visible');
            } else {
                scrollBottomBtn.classList.remove('visible');
            }
        }
    };

    // --- Click Event Listeners ---
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    if (scrollBottomBtn) {
        scrollBottomBtn.addEventListener('click', () => {
            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: 'smooth'
            });
        });
    }

    // Add a scroll event listener to the window to check button visibility
    window.addEventListener('scroll', handleScrollButtons);

    // Initial check when the page loads
    handleScrollButtons();
});

// Add some CSS classes for enhanced animations
const style = document.createElement('style');
style.textContent = `
    .nav-links.active {
        display: flex;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--bg-color);
        color: var(--text-color);
        flex-direction: column;
        padding: 1rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    @media (min-width: 768px) {
        .nav-links.active {
            position: static;
            flex-direction: row;
            padding: 0;
            box-shadow: none;
            background: transparent;
            color: inherit;
        }
    }

    .mobile-menu-btn.active span:nth-child(1) {
        transform: rotate(45deg) translate(5px, 5px);
    }

    .mobile-menu-btn.active span:nth-child(2) {
        opacity: 0;
    }

    .mobile-menu-btn.active span:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -6px);
    }

    .animate-in {
        animation: fadeInUp 0.6s ease forwards;
    }

    img {
        opacity: 1;
        transition: opacity 0.3s ease;
    }

    /* Smooth transitions for better UX */
    .hero-card,
    .feature-card,
    .screenshot-item {
        will-change: transform;
    }
`;

document.head.appendChild(style);

// Register GSAP Plugin
if (window.gsap && window.Physics2DPlugin) {
    gsap.registerPlugin(Physics2DPlugin);
} else if (window.gsap) {
    // Fallback: If Physics2DPlugin is not available, create a simple fallback
    console.warn('Physics2DPlugin not available, using fallback animation');
}

document.querySelectorAll('.btn').forEach(button => {
    const icon = button.querySelector('.icon');
    if (!icon) return;
    const line = icon.querySelector('.line');
    const svgPath = new Proxy({ y: null }, {
        set(target, key, value) {
            target[key] = value;
            if (target.y !== null) {
                line.innerHTML = getPath(target.y, .25);
            }
            return true;
        }
    });

    svgPath.y = 12;

    const tl = gsap.timeline({ paused: true });
    tl.to(icon, {
        '--arrow-y': 6,
        '--arrow-rotate': 150,
        ease: "elastic.in(1.1, .8)",
        duration: .7,
        onComplete() { particles(icon, 6, 10, 18, -60, -120); }
    }).to(icon, {
        '--arrow-y': 0,
        '--arrow-rotate': 135,
        ease: "elastic.out(1.1, .8)",
        duration: .7
    });

    tl.to(svgPath, { y: 15, duration: .15 }, .65)
        .to(svgPath, { y: 12, ease: "elastic.out(1.2, .7)", duration: .6 }, .8);

    let interval;
    button.addEventListener('mouseover', () => {
        tl.restart();
        interval = setInterval(() => tl.restart(), 1500);
    });
    button.addEventListener('mouseout', () => clearInterval(interval));

    window.addEventListener('load', () => {
        tl.restart();
        setInterval(() => tl.restart(), 1500); // repeat every 1.5s
    });


    function getPath(update, smoothing) {
        const points = [[5, 12], [12, update], [19, 12]];
        const d = points.reduce((acc, point, i, a) =>
            i === 0 ? `M ${point[0]},${point[1]}` : `${acc} ${getPoint(point, i, a, smoothing)}`, '');
        return `<path d="${d}" />`;
    }

    function getPoint(point, i, a, smoothing) {
        const cp = (current, previous, next, reverse) => {
            const p = previous || current;
            const n = next || current;
            const o = {
                length: Math.sqrt(Math.pow(n[0] - p[0], 2) + Math.pow(n[1] - p[1], 2)),
                angle: Math.atan2(n[1] - p[1], n[0] - p[0])
            };
            const angle = o.angle + (reverse ? Math.PI : 0);
            const length = o.length * smoothing;
            return [current[0] + Math.cos(angle) * length, current[1] + Math.sin(angle) * length];
        };
        const cps = cp(a[i - 1], a[i - 2], point, false);
        const cpe = cp(point, a[i - 1], a[i + 1], true);
        return `C ${cps[0]},${cps[1]} ${cpe[0]},${cpe[1]} ${point[0]},${point[1]}`;
    }

    function particles(parent, quantity, x, y, minAngle, maxAngle) {
        const minScale = .07, maxScale = .5;
        for (let i = quantity - 1; i >= 0; i--) {
            const angle = minAngle + Math.random() * (maxAngle - minAngle);
            const scale = minScale + Math.random() * (maxScale - minScale);
            const velocity = 60 + Math.random() * (80 - 60);
            const dot = document.createElement('div');
            dot.className = 'dot';
            parent.appendChild(dot);
            gsap.set(dot, { opacity: 1, x, y, scale });

            // Use physics2D if available, otherwise fallback to simple animation
            if (window.Physics2DPlugin && gsap.plugins.physics2D) {
                gsap.timeline({ onComplete: () => dot.remove() })
                    .to(dot, 1.2, { physics2D: { angle, velocity, gravity: 20 } })
                    .to(dot, .4, { opacity: 0 }, .8);
            } else {
                // Fallback animation without physics2D
                const radians = angle * Math.PI / 180;
                const endX = x + Math.cos(radians) * velocity * 2;
                const endY = y + Math.sin(radians) * velocity * 2;
                gsap.timeline({ onComplete: () => dot.remove() })
                    .to(dot, 1.2, { x: endX, y: endY, ease: "power2.out" })
                    .to(dot, .4, { opacity: 0 }, .8);
            }
        }
    }
});
/*
==============================================
PRELYCT WEBSITE JAVASCRIPT
==============================================
Table of Contents:
1. DOM Content Loaded
2. Navigation Functions
3. Mobile Menu Toggle
4. Smooth Scrolling
5. Active Navigation State
6. Dropdown Menu Functionality
7. Contact Form Handling
8. Portfolio Filtering
9. FAQ Accordion
10. Scroll Animations
11. Utility Functions
==============================================
*/

// ==============================================
// 1. DOM CONTENT LOADED
// ==============================================
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeMobileMenu();
    initializeSmoothScrolling();
    initializeActiveNavigation();
    initializeDropdowns();
    initializeContactForm();
    initializePortfolioFilter();
    initializeFAQ();
    initializeScrollAnimations();
    initializeScrollToTop();
    initializePerformanceOptimizations();
    initializeLoadingStates();
    initializeAnalytics();
    initializePowerPointOrderForm();
});

// ==============================================
// 2. NAVIGATION FUNCTIONS
// ==============================================
function initializeNavigation() {
    const navbar = document.getElementById('navbar');
    
    // Add scroll effect to navbar
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// ==============================================
// 3. MOBILE MENU TOGGLE
// ==============================================
function initializeMobileMenu() {
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navbar = document.getElementById('navbar');
    
    function closeMenu() {
        navMenu.classList.remove('active');
        mobileToggle.classList.remove('active');
        document.body.classList.remove('menu-open');
        document.body.style.overflow = '';
        if (navbar) {
            navbar.classList.remove('menu-open');
        }
    }
    
    function openMenu() {
        navMenu.classList.add('active');
        mobileToggle.classList.add('active');
        document.body.classList.add('menu-open');
        document.body.style.overflow = 'hidden';
        if (navbar) {
            navbar.classList.add('menu-open');
        }
    }
    
    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', function() {
            if (navMenu.classList.contains('active')) {
                closeMenu();
            } else {
                openMenu();
            }
        });
        
        // Close menu when clicking on a link (but not dropdown toggles)
        const navLinks = navMenu.querySelectorAll('.nav-link:not(.dropdown-toggle)');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth <= 767) {
                    closeMenu();
                }
            });
        });
        
        // Close menu when clicking on backdrop
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 767 && navMenu.classList.contains('active')) {
                // Close if clicking outside the menu and not on the toggle button
                if (!navMenu.contains(e.target) && !mobileToggle.contains(e.target)) {
                    closeMenu();
                }
            }
        });
    }
}

// ==============================================
// 4. SMOOTH SCROLLING
// ==============================================
function initializeSmoothScrolling() {
    // Handle smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Skip if it's just "#"
            if (href === '#') return;
            
            const target = document.querySelector(href);
            
            if (target) {
                e.preventDefault();
                
                const offsetTop = target.offsetTop - 80; // Account for fixed navbar
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ==============================================
// 5. ACTIVE NAVIGATION STATE
// ==============================================
function initializeActiveNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');
    
    // Function to update active navigation
    function updateActiveNavigation() {
        const scrollPos = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }
    
    // Update on scroll
    window.addEventListener('scroll', throttle(updateActiveNavigation, 100));
    
    // Update on page load
    updateActiveNavigation();
}

// ==============================================
// 6. DROPDOWN MENU FUNCTIONALITY
// ==============================================
function initializeDropdowns() {
    const dropdowns = document.querySelectorAll('.nav-dropdown');
    
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu');
        
        if (toggle && menu) {
            // Prevent default link behavior
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
            });
            
            // Desktop hover behavior (only for desktop navbar, not mobile menu)
            dropdown.addEventListener('mouseenter', function() {
                const isMobileMenu = dropdown.closest('.nav-menu');
                if (window.innerWidth > 767 && !isMobileMenu) {
                    menu.style.opacity = '1';
                    menu.style.visibility = 'visible';
                    menu.style.transform = 'translateY(0)';
                }
            });
            
            dropdown.addEventListener('mouseleave', function() {
                const isMobileMenu = dropdown.closest('.nav-menu');
                if (window.innerWidth > 767 && !isMobileMenu) {
                    menu.style.opacity = '0';
                    menu.style.visibility = 'hidden';
                    menu.style.transform = 'translateY(-10px)';
                }
            });
            
            // Click behavior (for mobile and mobile menu)
            toggle.addEventListener('click', function(e) {
                const isMobileMenu = dropdown.closest('.nav-menu');
                const isMobile = window.innerWidth <= 767;
                
                // Always use click for mobile menu dropdowns, or for mobile screens
                if (isMobile || isMobileMenu) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Close other dropdowns in the same container
                    const container = dropdown.closest('.nav-menu') || dropdown.closest('.navbar');
                    const allDropdowns = container ? container.querySelectorAll('.nav-dropdown') : dropdowns;
                    
                    allDropdowns.forEach(otherDropdown => {
                        if (otherDropdown !== dropdown) {
                            otherDropdown.classList.remove('active');
                            const otherMenu = otherDropdown.querySelector('.dropdown-menu');
                            if (otherMenu) {
                                otherMenu.style.maxHeight = '0';
                                otherMenu.style.opacity = '0';
                                otherMenu.style.visibility = 'hidden';
                            }
                        }
                    });
                    
                    // Toggle current dropdown
                    const isActive = dropdown.classList.contains('active');
                    dropdown.classList.toggle('active');
                    
                    if (isActive) {
                        menu.style.maxHeight = '0';
                        menu.style.opacity = '0';
                        menu.style.visibility = 'hidden';
                    } else {
                        menu.style.maxHeight = '500px';
                        menu.style.opacity = '1';
                        menu.style.visibility = 'visible';
                    }
                }
            });
        }
    });
}

// ==============================================
// 7. CONTACT FORM HANDLING
// ==============================================
function initializeContactForm() {
    const contactForm = document.getElementById('contact-form');
    
    if (contactForm) {
        // Form validation
        const inputs = contactForm.querySelectorAll('input[required], textarea[required]');
        const emailInput = contactForm.querySelector('input[type="email"]');
        const messageTextarea = contactForm.querySelector('textarea[name="message"]');
        const charCounter = document.getElementById('char-count');
        const submitBtn = document.getElementById('submit-btn');
        const formMessage = document.getElementById('form-message');
        
        // Real-time validation
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateField(this);
            });
            
            input.addEventListener('input', function() {
                clearFieldError(this);
            });
        });
        
        // Email validation
        if (emailInput) {
            emailInput.addEventListener('input', function() {
                validateEmail(this);
            });
        }
        
        // Character counter for message
        if (messageTextarea && charCounter) {
            messageTextarea.addEventListener('input', function() {
                const count = this.value.length;
                charCounter.textContent = count;
                
                if (count > 2000) {
                    this.value = this.value.substring(0, 2000);
                    charCounter.textContent = 2000;
                }
            });
        }
        
        // Form submission
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (validateForm()) {
                submitForm();
            }
        });
        
        // Validation functions
        function validateField(field) {
            const value = field.value.trim();
            const fieldName = field.name;
            const errorElement = document.getElementById(`${fieldName}-error`);
            
            if (!value) {
                showFieldError(field, 'This field is required');
                return false;
            }
            
            if (fieldName === 'email' && !isValidEmail(value)) {
                showFieldError(field, 'Please enter a valid email address');
                return false;
            }
            
            if (fieldName === 'name' && value.length < 2) {
                showFieldError(field, 'Name must be at least 2 characters long');
                return false;
            }
            
            clearFieldError(field);
            return true;
        }
        
        function validateEmail(field) {
            const value = field.value.trim();
            const errorElement = document.getElementById('email-error');
            
            if (value && !isValidEmail(value)) {
                showFieldError(field, 'Please enter a valid email address');
                return false;
            } else {
                clearFieldError(field);
                return true;
            }
        }
        
        function validateForm() {
            let isValid = true;
            
            inputs.forEach(input => {
                if (!validateField(input)) {
                    isValid = false;
                }
            });
            
            return isValid;
        }
        
        function showFieldError(field, message) {
            const errorElement = document.getElementById(`${field.name}-error`);
            if (errorElement) {
                errorElement.textContent = message;
                errorElement.style.display = 'block';
            }
            field.style.borderColor = '#ef4444';
        }
        
        function clearFieldError(field) {
            const errorElement = document.getElementById(`${field.name}-error`);
            if (errorElement) {
                errorElement.textContent = '';
                errorElement.style.display = 'none';
            }
            field.style.borderColor = '';
        }
        
        function isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }
        
        function submitForm() {
            const formData = new FormData(contactForm);
            const submitBtnText = submitBtn.querySelector('.btn-text');
            const submitBtnLoading = submitBtn.querySelector('.btn-loading');
            
            // Show loading state
            submitBtnText.style.display = 'none';
            submitBtnLoading.style.display = 'flex';
            submitBtn.disabled = true;
            
            // Clear previous messages
            formMessage.style.display = 'none';
            
            // Submit form
            fetch(contactForm.action, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showFormMessage('Thank you for your message! We\'ll get back to you soon.', 'success');
                    contactForm.reset();
                    if (charCounter) charCounter.textContent = '0';
                } else {
                    showFormMessage(data.message || 'There was an error sending your message. Please try again.', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showFormMessage('There was an error sending your message. Please try again.', 'error');
            })
            .finally(() => {
                // Hide loading state
                submitBtnText.style.display = 'block';
                submitBtnLoading.style.display = 'none';
                submitBtn.disabled = false;
            });
        }
        
        function showFormMessage(message, type) {
            formMessage.textContent = message;
            formMessage.className = `form-message ${type}`;
            formMessage.style.display = 'block';
            
            // Scroll to message
            formMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Hide message after 5 seconds
            setTimeout(() => {
                formMessage.style.display = 'none';
            }, 5000);
        }
    }
}

// ==============================================
// 8. PORTFOLIO FILTERING
// ==============================================
function initializePortfolioFilter() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    
    if (filterButtons.length > 0 && portfolioItems.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                const filter = this.getAttribute('data-filter');
                
                // Update active button
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                // Filter portfolio items
                portfolioItems.forEach(item => {
                    const category = item.getAttribute('data-category');
                    
                    if (filter === 'all' || category === filter) {
                        item.style.display = 'block';
                        item.style.animation = 'fadeInUp 0.6s ease-out';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });
    }
}

// ==============================================
// 9. FAQ ACCORDION
// ==============================================
function initializeFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        
        if (question && answer) {
            question.addEventListener('click', function() {
                const isActive = item.classList.contains('active');
                
                // Close all other FAQ items
                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('active');
                        const otherAnswer = otherItem.querySelector('.faq-answer');
                        if (otherAnswer) {
                            otherAnswer.style.maxHeight = null;
                        }
                    }
                });
                
                // Toggle current item
                if (isActive) {
                    item.classList.remove('active');
                    answer.style.maxHeight = null;
                } else {
                    item.classList.add('active');
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                }
            });
        }
    });
}

// ==============================================
// 10. SCROLL ANIMATIONS
// ==============================================
function initializeScrollAnimations() {
    // Enhanced scroll animations with intersection observer
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const animationType = element.dataset.animation || 'fade-in-up';
                const delay = parseInt(element.dataset.delay) || 0;
                
                setTimeout(() => {
                    element.classList.add('animated', animationType);
                }, delay);
                
                observer.unobserve(element);
            }
        });
    }, observerOptions);

    // Observe elements that should animate on scroll
    const animatedElements = document.querySelectorAll('.animate-on-scroll, .solution-card, .feature-card, .testimonial-card-large, .portfolio-item, .case-study');
    animatedElements.forEach(el => {
        el.classList.add('animate-on-scroll');
        observer.observe(el);
    });

    // Add floating animation to hero elements
    const heroElements = document.querySelectorAll('.hero-content, .hero-image');
    heroElements.forEach((el, index) => {
        el.classList.add('float');
        el.style.animationDelay = `${index * 0.5}s`;
    });

    // Add hover lift effect to cards
    const cards = document.querySelectorAll('.solution-card, .testimonial-card, .portfolio-item');
    cards.forEach(card => {
        card.classList.add('hover-lift');
    });

    // Counter animation for statistics
    const counters = document.querySelectorAll('.counter');
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(counter.dataset.target);
                const duration = 2000; // 2 seconds
                const increment = target / (duration / 16); // 60fps
                let current = 0;
                
                const updateCounter = () => {
                    current += increment;
                    if (current < target) {
                        counter.textContent = Math.floor(current);
                        requestAnimationFrame(updateCounter);
                    } else {
                        counter.textContent = target;
                    }
                };
                
                updateCounter();
                counterObserver.unobserve(counter);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => counterObserver.observe(counter));
}

// ==============================================
// 11. SCROLL TO TOP BUTTON
// ==============================================
function initializeScrollToTop() {
    // Create scroll to top button
    const scrollToTopBtn = document.createElement('button');
    scrollToTopBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18,15 12,9 6,15"/>
        </svg>
    `;
    scrollToTopBtn.className = 'scroll-to-top';
    scrollToTopBtn.setAttribute('aria-label', 'Scroll to top');
    
    // Add styles
    scrollToTopBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        background: var(--primary);
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        box-shadow: var(--shadow-lg);
        transition: var(--transition-normal);
        z-index: 1000;
    `;
    
    document.body.appendChild(scrollToTopBtn);
    
    // Show/hide button based on scroll position
    window.addEventListener('scroll', function() {
        if (window.scrollY > 300) {
            scrollToTopBtn.style.display = 'flex';
        } else {
            scrollToTopBtn.style.display = 'none';
        }
    });
    
    // Scroll to top functionality
    scrollToTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Hover effect
    scrollToTopBtn.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px)';
        this.style.background = 'var(--primary-dark)';
    });
    
    scrollToTopBtn.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.background = 'var(--primary)';
    });
}

// ==============================================
// 12. UTILITY FUNCTIONS
// ==============================================

// Throttle function to limit function calls
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Debounce function to delay function calls
function debounce(func, wait, immediate) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

// Check if element is in viewport
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Format phone number
function formatPhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
        return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    return phoneNumber;
}

// Validate phone number
function isValidPhoneNumber(phoneNumber) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
}

// Sanitize HTML input
function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// Copy text to clipboard
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function() {
            console.log('Text copied to clipboard');
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    }
}

// Show notification
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease-out;
    `;
    
    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.background = '#10b981';
            break;
        case 'error':
            notification.style.background = '#ef4444';
            break;
        case 'warning':
            notification.style.background = '#f59e0b';
            break;
        default:
            notification.style.background = '#2563eb';
    }
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after duration
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}

// ==============================================
// 13. ERROR HANDLING
// ==============================================
window.addEventListener('error', function(e) {
    console.error('JavaScript error:', e.error);
    // You can add error reporting here
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    // You can add error reporting here
});

// ==============================================
// 14. PERFORMANCE OPTIMIZATION
// ==============================================

// Lazy load images
function initializeLazyLoading() {
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }
}

// Preload critical resources
function preloadCriticalResources() {
    const criticalImages = [
        'images/logo.png',
        'images/hero-bg.jpg'
    ];
    
    criticalImages.forEach(src => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
    });
}

// ==============================================
// 15. ACCESSIBILITY ENHANCEMENTS
// ==============================================

// Keyboard navigation for dropdowns
function initializeKeyboardNavigation() {
    const dropdowns = document.querySelectorAll('.nav-dropdown');
    
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu');
        
        if (toggle && menu) {
            toggle.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    menu.classList.toggle('active');
                }
            });
        }
    });
}

// Focus management for mobile menu
function initializeFocusManagement() {
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', function() {
            if (navMenu.classList.contains('active')) {
                // Focus first link when menu opens
                const firstLink = navMenu.querySelector('.nav-link');
                if (firstLink) {
                    setTimeout(() => firstLink.focus(), 100);
                }
            }
        });
    }
}

// ==============================================
// 16. ANALYTICS AND TRACKING
// ==============================================

// Track form submissions
function trackFormSubmission(formName) {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'form_submit', {
            'form_name': formName
        });
    }
}

// Track button clicks
function trackButtonClick(buttonName) {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'click', {
            'button_name': buttonName
        });
    }
}

// ==============================================
// 13. PERFORMANCE OPTIMIZATIONS
// ==============================================
function initializePerformanceOptimizations() {
    // Lazy loading for images
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('loading');
                img.classList.add('loaded');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => {
        img.classList.add('loading');
        imageObserver.observe(img);
    });

    // Preload critical resources
    const criticalResources = [
        'css/styles.css',
        'js/script.js'
    ];

    criticalResources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource;
        link.as = resource.endsWith('.css') ? 'style' : 'script';
        document.head.appendChild(link);
    });
}

// ==============================================
// 14. LOADING STATES
// ==============================================
function initializeLoadingStates() {
    // Add loading state to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.type === 'submit') {
                this.classList.add('loading');
                setTimeout(() => {
                    this.classList.remove('loading');
                }, 2000);
            }
        });
    });

    // Add skeleton loading for dynamic content
    const skeletonElements = document.querySelectorAll('.skeleton');
    skeletonElements.forEach(element => {
        element.classList.add('loading');
    });
}

// ==============================================
// 16. ANALYTICS & TRACKING
// ==============================================
function initializeAnalytics() {
    // Track form submissions
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function() {
            // Track form submission
            if (typeof gtag !== 'undefined') {
                gtag('event', 'form_submit', {
                    'form_name': this.name || 'contact_form'
                });
            }
        });
    });

    // Track button clicks
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            if (typeof gtag !== 'undefined') {
                gtag('event', 'button_click', {
                    'button_text': this.textContent.trim(),
                    'button_class': this.className
                });
            }
        });
    });
}

// ==============================================
// 17. POWERPOINT ORDER FORM
// ==============================================
function initializePowerPointOrderForm() {
    // Handle main order form (if exists)
    const orderForm = document.getElementById('powerpoint-order-form');
    const mainAddonContainers = orderForm ? orderForm.querySelectorAll('.addon-group') : [];
    if (orderForm) {
        orderForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleOrderFormSubmit(this);
        });

        const packageSelect = orderForm.querySelector('#package');
        if (packageSelect) {
            packageSelect.addEventListener('change', function() {
                updateVisibleAddons(this.value, mainAddonContainers);
            });
        }
    }
    
    // Handle modal order form
    const modalOrderForm = document.getElementById('modal-order-form');
    if (modalOrderForm) {
        modalOrderForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleOrderFormSubmit(this);
        });
    }
    
    // Handle "Order Now" buttons on pricing cards
    const orderNowButtons = document.querySelectorAll('.order-now-btn');
    orderNowButtons.forEach(button => {
        button.addEventListener('click', function() {
            const packageValue = this.getAttribute('data-package');
            openOrderModal(packageValue);
        });
    });
    
    // Handle modal close
    const modal = document.getElementById('order-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalClose = document.getElementById('modal-close');
    
    if (modal && modalOverlay && modalClose) {
        modalClose.addEventListener('click', closeOrderModal);
        modalOverlay.addEventListener('click', closeOrderModal);
        
        // Close on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeOrderModal();
            }
        });
    }
}

function openOrderModal(packageValue) {
    const modal = document.getElementById('order-modal');
    const packageDisplay = document.getElementById('selected-package-display');
    const packageInput = document.getElementById('modal-package');
    const addonContainers = document.querySelectorAll('.addon-group');
    
    if (modal && packageDisplay && packageInput) {
        packageDisplay.textContent = packageValue;
        packageInput.value = packageValue;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        updateVisibleAddons(packageValue, addonContainers);
        
        // Focus on first input
        const firstInput = modal.querySelector('input, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function closeOrderModal() {
    const modal = document.getElementById('order-modal');
    const modalForm = document.getElementById('modal-order-form');
    
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Reset form
        if (modalForm) {
            modalForm.reset();
        }
    }
}

function handleOrderFormSubmit(form) {
    // Get form data
    const packageValue = form.querySelector('[name="package"]')?.value || 
                        form.querySelector('#package')?.value || 
                        form.querySelector('#modal-package')?.value;
    const topic = form.querySelector('[name="topic"]')?.value || 
                 form.querySelector('#topic')?.value || 
                 form.querySelector('#modal-topic')?.value;
    const name = form.querySelector('[name="name"]')?.value || 
                form.querySelector('#name')?.value || 
                form.querySelector('#modal-name')?.value;
    const email = form.querySelector('[name="email"]')?.value || 
                 form.querySelector('#email')?.value || 
                 form.querySelector('#modal-email')?.value;
    const phone = form.querySelector('[name="phone"]')?.value || 
                 form.querySelector('#phone')?.value || 
                 form.querySelector('#modal-phone')?.value;
    const deadline = form.querySelector('[name="deadline"]')?.value || 
                    form.querySelector('#deadline')?.value || 
                    form.querySelector('#modal-deadline')?.value;
    const notes = form.querySelector('[name="notes"]')?.value || 
                form.querySelector('#notes')?.value || 
                form.querySelector('#modal-notes')?.value;
    
    // Get selected add-ons
    const addonCheckboxes = form.querySelectorAll('input[name="addons[]"]:checked');
    const addons = Array.from(addonCheckboxes).map(cb => cb.value);
    
    // Validate required fields
    if (!packageValue || !topic || !name || !email || !phone) {
        alert('Please fill in all required fields.');
        return;
    }
    
    // Build WhatsApp message
    let message = `Hello Prelyct! I would like to place an order for PowerPoint design services.\n\n`;
    message += `📦 *Package:*\n${packageValue}\n\n`;
    
    if (addons.length > 0) {
        message += `➕ *Add-ons:*\n${addons.join('\n')}\n\n`;
    }
    
    message += `📝 *Topic/Outline:*\n${topic}\n\n`;
    message += `👤 *Contact Information:*\n`;
    message += `Name: ${name}\n`;
    message += `Email: ${email}\n`;
    message += `Phone: ${phone}\n\n`;
    
    if (deadline) {
        message += `⏰ *Preferred Deadline:*\n${deadline}\n\n`;
    }
    
    if (notes) {
        message += `📋 *Additional Notes:*\n${notes}\n\n`;
    }
    
    message += `Please send me a quote and payment link. Thank you!`;
    
    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // WhatsApp number (without + sign for wa.me links)
    const whatsappNumber = '79966632943';
    
    // Open WhatsApp
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    
    // Close modal if open
    closeOrderModal();
    
    // Show success message
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '✓ Order Sent! Opening WhatsApp...';
        submitBtn.disabled = true;
        
        // Reset button after 3 seconds
        setTimeout(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }, 3000);
    }
}

function updateVisibleAddons(selectedPackage, addonContainers) {
    if (!selectedPackage || !addonContainers?.length) return;

    const normalized = selectedPackage.toLowerCase();
    const category = normalized.includes('word') ? 'word' :
                     normalized.includes('excel') ? 'excel' :
                     'powerpoint';

    addonContainers.forEach(group => {
        const target = group.getAttribute('data-category');
        const shouldShow = target === 'all' || target === category;
        group.style.display = shouldShow ? '' : 'none';
        if (!shouldShow) {
            const checkbox = group.querySelector('input[type="checkbox"]');
            if (checkbox) checkbox.checked = false;
        }
    });
}

// ==============================================
// END OF JAVASCRIPT
// ==============================================

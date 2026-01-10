// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add scroll effect to navbar
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
    } else {
        navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    }
    
    lastScroll = currentScroll;
});

// Animate elements on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeInUp 0.8s ease-out forwards';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe feature cards and contact cards
document.querySelectorAll('.feature-card, .guide-section, .version-item, .contact-card, .architecture-card, .benchmark-card, .protocol-card, .manual-card, .roadmap-card, .deep-card').forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
});

// Download button click tracking
document.querySelectorAll('.btn-download').forEach(button => {
    button.addEventListener('click', (e) => {
        // Check if file exists
        const href = button.getAttribute('href');
        if (href && !href.startsWith('http')) {
            // File might not exist yet
            console.log('Download clicked:', href);
        }
    });
});

// Add active state to navigation
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (scrollY >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.style.color = '';
        if (link.getAttribute('href') === `#${current}`) {
            link.style.color = 'var(--primary-color)';
        }
    });
});

// Add copy to clipboard functionality for code snippets
document.querySelectorAll('code').forEach(code => {
    code.style.cursor = 'pointer';
    code.title = 'Click to copy';
    
    code.addEventListener('click', () => {
        const text = code.textContent;
        navigator.clipboard.writeText(text).then(() => {
            const originalText = code.textContent;
            code.textContent = 'Copied!';
            code.style.backgroundColor = 'var(--success-color)';
            code.style.color = 'white';
            
            setTimeout(() => {
                code.textContent = originalText;
                code.style.backgroundColor = '';
                code.style.color = '';
            }, 1000);
        });
    });
});

// Console message
console.log('%cSLightSFTP', 'font-size: 24px; font-weight: bold; color: #2563eb;');
console.log('%cLightweight SFTP & FTP Server', 'font-size: 14px; color: #64748b;');
console.log('Version 1.1.0');

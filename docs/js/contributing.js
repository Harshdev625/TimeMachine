// Smooth scroll behavior
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

// Add animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '0';
            entry.target.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                entry.target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, 100);
            
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe all content sections
document.querySelectorAll('.content-section').forEach(section => {
    observer.observe(section);
});

// Add hover effect to code blocks
document.querySelectorAll('.code-block').forEach(codeBlock => {
    codeBlock.addEventListener('click', function() {
        // Copy to clipboard functionality
        const code = this.querySelector('code').textContent;
        navigator.clipboard.writeText(code).then(() => {
            // Show feedback
            const originalBg = this.style.background;
            this.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            
            setTimeout(() => {
                this.style.background = originalBg;
            }, 300);
        });
    });
    
    // Add cursor pointer on hover
    codeBlock.style.cursor = 'pointer';
    codeBlock.title = 'Click to copy';
});
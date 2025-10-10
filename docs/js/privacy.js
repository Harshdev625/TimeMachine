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
document.querySelectorAll('.content-section').forEach((section, index) => {
    section.style.animationDelay = `${index * 0.1}s`;
    observer.observe(section);
});

// Observe summary section
const summarySection = document.querySelector('.summary-section');
if (summarySection) {
    observer.observe(summarySection);
}

// Observe transparency section
const transparencySection = document.querySelector('.transparency-section');
if (transparencySection) {
    observer.observe(transparencySection);
}

// Add print functionality
const addPrintButton = () => {
    const printBtn = document.createElement('button');
    printBtn.className = 'print-btn';
    printBtn.innerHTML = '🖨️ Print Policy';
    printBtn.onclick = () => window.print();
    
    const printStyles = document.createElement('style');
    printStyles.textContent = `
        .print-btn {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: linear-gradient(135deg, var(--primary-500), var(--secondary-500));
            color: white;
            border: none;
            padding: 1rem 1.5rem;
            border-radius: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
            transition: all 0.3s ease;
            z-index: 100;
        }
        
        .print-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 40px rgba(59, 130, 246, 0.4);
        }
        
        @media print {
            .print-btn {
                display: none;
            }
        }
        
        @media (max-width: 768px) {
            .print-btn {
                bottom: 1rem;
                right: 1rem;
                padding: 0.75rem 1rem;
                font-size: 0.875rem;
            }
        }
    `;
    document.head.appendChild(printStyles);
    document.body.appendChild(printBtn);
};

addPrintButton();

// Copy email to clipboard
document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
    link.addEventListener('click', (e) => {
        if (e.shiftKey) {
            e.preventDefault();
            const email = link.href.replace('mailto:', '');
            navigator.clipboard.writeText(email).then(() => {
                // Show tooltip
                const tooltip = document.createElement('div');
                tooltip.textContent = 'Email copied!';
                tooltip.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 1rem 2rem;
                    border-radius: 0.5rem;
                    font-size: 1rem;
                    z-index: 1000;
                    animation: fadeOut 2s ease;
                `;
                document.body.appendChild(tooltip);
                
                setTimeout(() => {
                    tooltip.remove();
                }, 2000);
            });
        }
    });
    
    // Add hint
    link.title = 'Click to open, Shift+Click to copy';
});

// Add fade out animation
const fadeOutStyle = document.createElement('style');
fadeOutStyle.textContent = `
    @keyframes fadeOut {
        0% { opacity: 1; }
        70% { opacity: 1; }
        100% { opacity: 0; }
    }
`;
document.head.appendChild(fadeOutStyle);

// Add reading progress indicator
const progressBar = document.createElement('div');
progressBar.className = 'reading-progress';
const progressStyles = document.createElement('style');
progressStyles.textContent = `
    .reading-progress {
        position: fixed;
        top: 64px;
        left: 0;
        width: 0%;
        height: 3px;
        background: linear-gradient(90deg, var(--primary-500), var(--secondary-500));
        z-index: 100;
        transition: width 0.1s ease;
    }
    
    @media print {
        .reading-progress {
            display: none;
        }
    }
`;
document.head.appendChild(progressStyles);
document.body.appendChild(progressBar);

const updateProgress = () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    progressBar.style.width = scrolled + '%';
};

window.addEventListener('scroll', updateProgress);

// Highlight tables on hover
document.querySelectorAll('.data-table tbody tr').forEach(row => {
    row.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.01)';
        this.style.transition = 'transform 0.2s ease';
    });
    
    row.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
    });
});

// Add share functionality
const addShareButton = () => {
    const shareBtn = document.createElement('button');
    shareBtn.className = 'share-btn';
    shareBtn.innerHTML = '🔗 Share';
    shareBtn.onclick = () => {
        if (navigator.share) {
            navigator.share({
                title: 'TimeMachine Privacy Policy',
                text: 'Check out TimeMachine\'s Privacy Policy',
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(window.location.href).then(() => {
                const tooltip = document.createElement('div');
                tooltip.textContent = 'Link copied!';
                tooltip.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 1rem 2rem;
                    border-radius: 0.5rem;
                    font-size: 1rem;
                    z-index: 1000;
                    animation: fadeOut 2s ease;
                `;
                document.body.appendChild(tooltip);
                
                setTimeout(() => {
                    tooltip.remove();
                }, 2000);
            });
        }
    };
    
    const shareStyles = document.createElement('style');
    shareStyles.textContent = `
        .share-btn {
            position: fixed;
            bottom: 6rem;
            right: 2rem;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.9));
            color: var(--primary-600);
            border: 2px solid var(--primary-500);
            padding: 0.75rem 1.25rem;
            border-radius: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            z-index: 100;
            backdrop-filter: blur(10px);
        }
        
        .share-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            background: linear-gradient(135deg, var(--primary-500), var(--secondary-500));
            color: white;
        }
        
        @media print {
            .share-btn {
                display: none;
            }
        }
        
        @media (max-width: 768px) {
            .share-btn {
                bottom: 5rem;
                right: 1rem;
                padding: 0.625rem 1rem;
                font-size: 0.875rem;
            }
        }
    `;
    document.head.appendChild(shareStyles);
    document.body.appendChild(shareBtn);
};

addShareButton();
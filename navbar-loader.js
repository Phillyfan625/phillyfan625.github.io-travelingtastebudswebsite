// Navbar Loader - Centralized Navigation Component
// This script loads the navbar on every page automatically

(function() {
    // Fetch and inject the navbar
    fetch('/Navbar/navbar.html')
        .then(response => response.text())
        .then(data => {
            // Create a temporary container to parse the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = data;
            
            // Insert the navbar at the beginning of the body
            const navbar = tempDiv.querySelector('nav');
            if (navbar && document.body) {
                document.body.insertBefore(navbar, document.body.firstChild);
            }
            
            // Insert the link tags into the head
            const links = tempDiv.querySelectorAll('link');
            links.forEach(link => {
                // Check if link doesn't already exist in head
                const existingLink = document.querySelector(`link[href="${link.getAttribute('href')}"]`);
                if (!existingLink) {
                    document.head.appendChild(link.cloneNode(true));
                }
            });

            // Wait for Bootstrap to initialize, then setup menu close
            // Try multiple times to ensure Bootstrap is ready
            let attempts = 0;
            let checkBootstrap = setInterval(() => {
                attempts++;
                if (window.bootstrap || document.querySelectorAll('.navbar-toggler').length > 0) {
                    clearInterval(checkBootstrap);
                    initMobileMenuClose();
                } else if (attempts > 40) {
                    // Stop after 2 seconds (40 * 50ms)
                    clearInterval(checkBootstrap);
                    console.warn('Bootstrap not detected, setting up menu close anyway');
                    initMobileMenuClose();
                }
            }, 50);
        })
        .catch(error => console.error('Error loading navbar:', error));
})();

// Function to handle mobile menu closing
function initMobileMenuClose() {
    const maxAttempts = 10;
    let attempts = 0;

    function trySetup() {
        attempts++;
        
        // Get all navigation links
        const navLinks = document.querySelectorAll('.modern-navbar .nav-link');
        const navbarCollapse = document.querySelector('#navbarContent');
        const navbarToggler = document.querySelector('.navbar-toggler');
        
        // If elements aren't ready, try again
        if ((!navLinks.length || !navbarCollapse || !navbarToggler) && attempts < maxAttempts) {
            setTimeout(trySetup, 100);
            return;
        }

        if (!navLinks.length || !navbarCollapse || !navbarToggler) {
            console.warn('Navbar elements not found after multiple attempts');
            return;
        }

        console.log('Setting up navbar close handlers');

        // Add click event to each navigation link (excluding social links)
        navLinks.forEach(link => {
            // Skip social media links
            if (link.classList.contains('social-link')) {
                return;
            }

            link.addEventListener('click', function(e) {
                console.log('Nav link clicked');
                
                // Check if we're on mobile (menu is collapsible)
                if (window.innerWidth < 992) {
                    // Small delay to allow navigation to start
                    setTimeout(() => {
                        const bsCollapse = window.bootstrap?.Collapse?.getInstance(navbarCollapse);
                        if (bsCollapse) {
                            bsCollapse.hide();
                        } else {
                            // Manually close
                            navbarCollapse.classList.remove('show');
                            navbarToggler.classList.add('collapsed');
                            navbarToggler.setAttribute('aria-expanded', 'false');
                        }
                    }, 150);
                }
            });
        });

        // Also handle clicks on the mobile logo
        const mobileLogo = document.querySelector('.modern-navbar .mobile-logo');
        if (mobileLogo) {
            mobileLogo.addEventListener('click', function() {
                console.log('Mobile logo clicked');
                
                if (window.innerWidth < 992) {
                    setTimeout(() => {
                        const bsCollapse = window.bootstrap?.Collapse?.getInstance(navbarCollapse);
                        if (bsCollapse) {
                            bsCollapse.hide();
                        } else {
                            navbarCollapse.classList.remove('show');
                            navbarToggler.classList.add('collapsed');
                            navbarToggler.setAttribute('aria-expanded', 'false');
                        }
                    }, 150);
                }
            });
        }
    }

    // Start trying to setup
    trySetup();
}


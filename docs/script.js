// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      const offset = 80; // Account for fixed navbar
      const targetPosition =
        target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({
        top: targetPosition,
        behavior: "smooth",
      });
    }
  });
});

// Download button handler
document.addEventListener("DOMContentLoaded", function () {
  const downloadBtn = document.getElementById("downloadBtn");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", function (e) {
      e.preventDefault();
      // Download the extension zip file
      const link = document.createElement("a");
      link.href = "slop-block-extension.zip";
      link.download = "slop-block-extension.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }
});

// Show notification function
function showNotification(message) {
  const notification = document.createElement("div");
  notification.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: linear-gradient(135deg, #0077b5 0%, #005885 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        font-weight: 500;
    `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease";
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// Add CSS for notification animations
const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Count-up animation for category count
function animateCountUp(element, target, duration = 1000) {
  const start = 0;
  const increment = target / (duration / 16); // 60fps
  let current = start;
  
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      element.textContent = target;
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(current);
    }
  }, 16);
}

// Initialize count-up when section is visible
const categoryCountElement = document.querySelector(".category-count");
if (categoryCountElement) {
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.getAttribute("data-target"));
        animateCountUp(entry.target, target);
        countObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  
  countObserver.observe(categoryCountElement);
}

// Intersection Observer for scroll animations with staggered delays
if (
  "IntersectionObserver" in window &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  }, observerOptions);

  // Observe feature cards and pipeline steps
  document
    .querySelectorAll(".feature-card, .pipeline-step")
    .forEach((el) => {
      observer.observe(el);
    });

  // Staggered animations for category items
  const categoryObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !entry.target.classList.contains("visible")) {
        const categoryItems = Array.from(
          document.querySelectorAll(".category-item")
        );
        const index = categoryItems.indexOf(entry.target);
        
        // Stagger the animation with delays
        setTimeout(() => {
          entry.target.classList.add("visible");
        }, index * 50); // 50ms delay between each item
        
        categoryObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -100px 0px" });

  // Observe all category items
  document.querySelectorAll(".category-item").forEach((el) => {
    categoryObserver.observe(el);
  });
}


// Navbar background on scroll
let lastScroll = 0;
window.addEventListener("scroll", () => {
  const navbar = document.querySelector(".navbar");
  const currentScroll = window.pageYOffset;

  if (currentScroll > 100) {
    navbar.style.background = "rgba(10, 10, 15, 0.95)";
  } else {
    navbar.style.background = "rgba(10, 10, 15, 0.8)";
  }

  lastScroll = currentScroll;
});

// Parallax effect for hero orbs
window.addEventListener("scroll", () => {
  const scrolled = window.pageYOffset;
  const orbs = document.querySelectorAll(".gradient-orb");

  orbs.forEach((orb, index) => {
    const speed = (index + 1) * 0.5;
    orb.style.transform = `translate(${scrolled * speed * 0.1}px, ${
      scrolled * speed * 0.1
    }px)`;
  });
});

// Add active state to nav links on scroll
const sections = document.querySelectorAll("section[id]");
const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

window.addEventListener("scroll", () => {
  let current = "";
  const scrollPosition = window.pageYOffset + 150;

  sections.forEach((section) => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    if (
      scrollPosition >= sectionTop &&
      scrollPosition < sectionTop + sectionHeight
    ) {
      current = section.getAttribute("id");
    }
  });

  navLinks.forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("href") === `#${current}`) {
      link.classList.add("active");
    }
  });
});

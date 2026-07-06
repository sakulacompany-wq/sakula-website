// Opt in to hide-then-reveal animations only when JS is actually running,
// and only when IntersectionObserver exists to un-hide things again.
if ("IntersectionObserver" in window) {
  document.body.classList.add("js");
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============ Mobile navigation ============ */
const navToggle = document.getElementById("navToggle");
const siteNav = document.getElementById("siteNav");

navToggle.addEventListener("click", () => {
  const open = siteNav.classList.toggle("open");
  navToggle.classList.toggle("open", open);
  navToggle.setAttribute("aria-expanded", String(open));
});

siteNav.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    siteNav.classList.remove("open");
    navToggle.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

/* ============ Header elevation + scroll progress + back to top + parallax ============ */
const header = document.querySelector(".site-header");
const progressBar = document.getElementById("scrollProgress");
const backToTop = document.getElementById("backToTop");
const heroBg = document.getElementById("heroBg");

function onScroll() {
  const y = window.scrollY;
  header.classList.toggle("scrolled", y > 10);

  const max = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = max > 0 ? (y / max) * 100 + "%" : "0%";

  backToTop.hidden = y < 600;

  if (heroBg && !prefersReducedMotion && y < window.innerHeight * 1.5) {
    heroBg.style.transform = `translateY(${y * 0.25}px)`;
  }
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
});

/* ============ Observer-driven features (skipped gracefully if unsupported) ============ */
if ("IntersectionObserver" in window) {
  /* Scroll-reveal animations (staggered per group) */
  document.querySelectorAll("[data-reveal-group]").forEach((group) => {
    group.querySelectorAll("[data-reveal]").forEach((el, i) => {
      el.style.transitionDelay = i * 90 + "ms";
    });
  });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll("[data-reveal]").forEach((el) => revealObserver.observe(el));

  /* Animated stat counters */
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        counterObserver.unobserve(el);

        const target = parseInt(el.dataset.count, 10);
        if (prefersReducedMotion) {
          el.textContent = target;
          return;
        }
        const duration = 1400;
        const start = performance.now();
        function tick(now) {
          const t = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = Math.round(eased * target);
          if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    },
    { threshold: 0.6 }
  );
  document.querySelectorAll("[data-count]").forEach((el) => counterObserver.observe(el));

  /* Active nav link highlighting */
  const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"]:not(.btn)')];
  const sectionsById = navLinks
    .map((a) => document.getElementById(a.hash.slice(1)))
    .filter(Boolean);

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) =>
          a.classList.toggle("active", a.hash === "#" + entry.target.id)
        );
      });
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );
  sectionsById.forEach((s) => sectionObserver.observe(s));
} else {
  // No IntersectionObserver: show final counter values immediately.
  document.querySelectorAll("[data-count]").forEach((el) => {
    el.textContent = el.dataset.count;
  });
}

/* ============ Card spotlight follows the mouse ============ */
document.querySelectorAll(".card, .record-card").forEach((card) => {
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mx", e.clientX - rect.left + "px");
    card.style.setProperty("--my", e.clientY - rect.top + "px");
  });
});

/* ============ Gallery lightbox ============ */
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxCaption = document.getElementById("lightboxCaption");
const galleryItems = [...document.querySelectorAll("#gallery .gallery-item")];
let lightboxIndex = 0;

function openLightbox(i) {
  lightboxIndex = (i + galleryItems.length) % galleryItems.length;
  const img = galleryItems[lightboxIndex].querySelector("img");
  const caption = galleryItems[lightboxIndex].querySelector("figcaption");
  lightboxImg.src = img.src;
  lightboxImg.alt = img.alt;
  lightboxCaption.textContent = caption ? caption.textContent : "";
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.style.overflow = "";
}

galleryItems.forEach((item, i) => {
  item.addEventListener("click", () => openLightbox(i));
});

document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
document.getElementById("lightboxPrev").addEventListener("click", (e) => {
  e.stopPropagation();
  openLightbox(lightboxIndex - 1);
});
document.getElementById("lightboxNext").addEventListener("click", (e) => {
  e.stopPropagation();
  openLightbox(lightboxIndex + 1);
});
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if (lightbox.hidden) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") openLightbox(lightboxIndex - 1);
  if (e.key === "ArrowRight") openLightbox(lightboxIndex + 1);
});

/* ============ Contact form: opens a pre-filled email ============ */
const form = document.getElementById("contactForm");
const note = document.getElementById("formNote");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  if (!form.reportValidity()) return;

  const data = new FormData(form);
  const subject = `Security inquiry from ${data.get("name")}`;
  const body = [
    `Name: ${data.get("name")}`,
    `Phone: ${data.get("phone") || "-"}`,
    `Email: ${data.get("email")}`,
    `Service: ${data.get("service") || "-"}`,
    "",
    data.get("message"),
  ].join("\n");

  window.location.href =
    "mailto:sakula.company@gmail.com" +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  note.textContent =
    "Your email app should open with the inquiry pre-filled. If not, email us at sakula.company@gmail.com.";
  note.hidden = false;
});

/* ============ Footer year ============ */
document.getElementById("year").textContent = new Date().getFullYear();

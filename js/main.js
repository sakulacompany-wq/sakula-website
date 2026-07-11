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

/* ============ Header elevation + scroll progress + back to top ============ */
const header = document.querySelector(".site-header");
const progressBar = document.getElementById("scrollProgress");
const backToTop = document.getElementById("backToTop");

function chromeTick() {
  const y = window.scrollY;
  header.classList.toggle("scrolled", y > 10);

  const max = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = max > 0 ? (y / max) * 100 + "%" : "0%";

  backToTop.hidden = y < 600;
}

backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
});

/* ============ Parallax: pictures float and fade as you scroll ============ */
const parallaxEls = [...document.querySelectorAll("[data-parallax]")];

function parallaxTick() {
  if (prefersReducedMotion) return;
  const vh = window.innerHeight;
  parallaxEls.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.bottom < -200 || r.top > vh + 200) return; // off-screen: skip
    const rel = (r.top + r.height / 2 - vh / 2) / (vh / 2); // -1 top .. 1 bottom
    const speed = parseFloat(el.dataset.parallax) || 0.5;
    const rot = parseFloat(el.dataset.rot) || 0;
    let t = `translateY(${(-rel * speed * 60).toFixed(1)}px)`;
    if (rot) t += ` rotate(${(rel * rot).toFixed(2)}deg)`;
    el.style.transform = t;
    if (el.hasAttribute("data-fade")) {
      el.style.opacity = Math.max(0, Math.min(1, 1.35 - Math.abs(rel) * 0.95)).toFixed(3);
    }
  });
}

/* ============ Scroll story: the guard stands watch ============ */
const story = document.getElementById("story");
const storyStage = story ? story.querySelector(".story-stage") : null;
const storyGuard = document.getElementById("storyGuard");
const storySteps = story ? [...story.querySelectorAll(".story-step")] : [];
const storyDots = story ? [...story.querySelectorAll(".story-dots .dot")] : [];
const storyDesktop = window.matchMedia("(min-width: 821px)");

function storyTick() {
  if (!story || !storyGuard) return;
  if (prefersReducedMotion || !storyDesktop.matches) {
    storyGuard.style.opacity = "";
    storyGuard.style.transform = "";
    return;
  }

  const rect = story.getBoundingClientRect();
  const total = rect.height - window.innerHeight;
  if (total <= 0) return;
  const p = Math.min(Math.max(-rect.top / total, 0), 1);

  // Guard slides in from the right, stands watch, eases out at the very end
  const enter = Math.min(p * 5, 1);
  const exit = p > 0.94 ? (p - 0.94) / 0.06 : 0;
  storyGuard.style.opacity = (enter * (1 - exit * 0.9)).toFixed(3);
  storyGuard.style.transform = `translateX(${((1 - enter) * 70).toFixed(1)}%)`;

  // Which chapter of the story are we in?
  const idx = p < 0.34 ? 0 : p < 0.68 ? 1 : 2;
  storySteps.forEach((s, i) => s.classList.toggle("active", i === idx));
  storyDots.forEach((d, i) => d.classList.toggle("active", i === idx));
  if (storyStage) storyStage.className = "story-stage s" + idx;
}

/* ============ One rAF-throttled scroll loop for everything ============ */
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    chromeTick();
    parallaxTick();
    storyTick();
    ticking = false;
  });
}
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll, { passive: true });
onScroll();

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

  /* Construction scene: buildings rise when the section arrives */
  const constructionSec = document.querySelector(".construction");
  if (constructionSec) {
    const buildObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            constructionSec.classList.add("built");
            buildObserver.disconnect();
          }
        });
      },
      { threshold: 0.25 }
    );
    buildObserver.observe(constructionSec);
  }

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
  // No IntersectionObserver: show final counter values and the skyline immediately.
  document.querySelectorAll("[data-count]").forEach((el) => {
    el.textContent = el.dataset.count;
  });
  const constructionSec = document.querySelector(".construction");
  if (constructionSec) constructionSec.classList.add("built");
}

/* ============ Card spotlight + subtle 3D tilt ============ */
document.querySelectorAll(".card, .record-card").forEach((card) => {
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mx", x + "px");
    card.style.setProperty("--my", y + "px");

    if (prefersReducedMotion) return;
    const rx = (y / rect.height - 0.5) * -4;
    const ry = (x / rect.width - 0.5) * 4;
    card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
  });
  card.addEventListener("mouseleave", () => {
    card.style.transform = "";
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

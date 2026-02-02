// assets/js/main.js

const getValue = (obj, rawPath) => {
  if (!rawPath) return undefined;
  const parts = rawPath.split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    const key = part.match(/^\d+$/) ? Number(part) : part;
    current = current[key];
  }
  return current;
};

const resolveString = (value, data) => {
  if (typeof value !== "string") return value;
  let result = value;
  for (let i = 0; i < 5; i += 1) {
    const next = result.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (_, key) => {
      const resolved = getValue(data, key);
      return resolved ?? "";
    });
    if (next === result) break;
    result = next;
  }
  return result;
};

const applyTextBindings = (root, data) => {
  root.querySelectorAll("[data-text]").forEach((el) => {
    const key = el.dataset.text;
    const value = getValue(data, key);
    el.textContent = resolveString(value ?? "", data);
  });
};

const applyHtmlBindings = (root, data) => {
  root.querySelectorAll("[data-html]").forEach((el) => {
    const key = el.dataset.html;
    const value = getValue(data, key);
    el.innerHTML = resolveString(value ?? "", data);
  });
};

const applyAttrBindings = (root, data) => {
  root.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (!attr.name.startsWith("data-attr-")) return;
      const attrName = attr.name.replace("data-attr-", "");
      const raw = attr.value;
      const [key, transform] = raw.split("|");
      let value = getValue(data, key);
      value = resolveString(value ?? "", data);
      if (transform === "mailto" && value) {
        value = `mailto:${value}`;
      }
      if (transform === "tel" && value) {
        value = `tel:${value}`;
      }
      if (value === undefined || value === null || value === "") {
        el.removeAttribute(attrName);
      } else {
        el.setAttribute(attrName, String(value));
      }
    });
  });
};

const buildHeroKpis = (container, items, data) => {
  if (!container) return;
  container.innerHTML = (items || [])
    .map(
      (item) => `
      <div class="kpi">
        <strong>${resolveString(item.title, data)}</strong>
        <span>${resolveString(item.text, data)}</span>
      </div>`
    )
    .join("");
};

const buildCards = (container, cards, data) => {
  if (!container) return;
  container.innerHTML = (cards || [])
    .map(
      (card) => `
      <article class="card">
        <h3>${resolveString(card.title, data)}</h3>
        <p>${resolveString(card.text, data)}</p>
        ${
          card.list
            ? `<ul class="list">${card.list
                .map((item) => `<li>${resolveString(item, data)}</li>`)
                .join("")}</ul>`
            : ""
        }
      </article>`
    )
    .join("");
};

const buildProjects = (container, sections, data) => {
  if (!container) return;
  const orderedSections = Object.values(sections || {}).sort(
    (a, b) => a.order - b.order
  );
  container.innerHTML = orderedSections
    .map((section) => {
      const projects = Object.values(section.projects || {}).sort(
        (a, b) => a.order - b.order
      );
      const thumbs = projects
        .map(
          (project) => `
            <div class="thumb">
              <img
                src="${project.image}"
                alt="${resolveString(project.alt, data)}"
                loading="lazy"
                decoding="async"
              />
            </div>`
        )
        .join("");
      return `
        <section class="card" aria-label="${resolveString(
          section.aria_label,
          data
        )}">
          <div class="category">
            <h3 class="category-title">${resolveString(section.title, data)}</h3>
          </div>
          <p class="category-desc">${resolveString(section.description, data)}</p>
          <div class="thumbs" aria-label="${resolveString(
            section.gallery_label,
            data
          )}">
            ${thumbs}
          </div>
        </section>`;
    })
    .join("");
};

const buildNews = (container, items, data) => {
  if (!container) return;
  container.innerHTML = (items || [])
    .map(
      (item) => `
      <article class="card news-item">
        <time datetime="${item.date}">${item.date_label}</time>
        <h3 class="news-title">${resolveString(item.title, data)}</h3>
        <p>${resolveString(item.text, data)}</p>
      </article>`
    )
    .join("");
};

const buildContactLocations = (container, locations, data) => {
  if (!container) return;
  container.innerHTML = (locations || [])
    .map((location, index) => {
      const wrapperClass = index === 0 ? "mt-075" : "mt-09";
      return `
        <div class="${wrapperClass}">
          <h4 class="location-title">${resolveString(location.label, data)}</h4>
          <p class="m-0 text-muted">${resolveString(
            location.contact_line,
            data
          )}</p>
        </div>`;
    })
    .join("");
};

const buildFooterLocations = (container, locations, data) => {
  if (!container) return;
  container.innerHTML = (locations || [])
    .map((location) => {
      const lines = (location.footer_lines || [])
        .map((line) => `<p class="footer-text">${resolveString(line, data)}</p>`)
        .join("");
      return `
        <div class="footer-location">
          <h3 class="footer-subtitle">${resolveString(location.label, data)}</h3>
          ${lines}
        </div>`;
    })
    .join("");
};

const buildLegalParagraphs = (container, paragraphs, data) => {
  if (!container) return;
  container.innerHTML = (paragraphs || [])
    .map((paragraph) => `<p>${resolveString(paragraph, data)}</p>`)
    .join("");
};

let runtimeContent = null;
let runtimeConfig = null;

const renderRuntimeContent = async () => {
  const [site, company, projects] = await Promise.all([
    fetch("assets/config/es.site.json").then((res) => res.json()),
    fetch("assets/config/es.company.json").then((res) => res.json()),
    fetch("assets/config/es.projects.json").then((res) => res.json())
  ]);

  const data = {
    site,
    infrastructure: site.infrastructure,
    company
  };

  runtimeContent = site.infrastructure;
  runtimeConfig = company;

  document.documentElement.lang = site.infrastructure?.lang || "es";

  applyTextBindings(document, data);
  applyHtmlBindings(document, data);
  applyAttrBindings(document, data);

  buildHeroKpis(
    document.getElementById("kpis"),
    company.hero.kpis,
    data
  );
  buildCards(
    document.getElementById("about-cards"),
    company.about.cards,
    data
  );
  buildCards(
    document.getElementById("services-cards"),
    company.services.cards,
    data
  );
  buildProjects(document.getElementById("projects-grid"), projects.sections, data);
  buildNews(document.getElementById("news-grid"), company.news.items, data);
  buildFooterLocations(
    document.getElementById("footer-locations"),
    company.locations,
    data
  );
  buildLegalParagraphs(
    document.getElementById("legal-modal-desc"),
    site.infrastructure?.legal?.paragraphs,
    data
  );

  // JSON-LD removed by request
};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await renderRuntimeContent();
  } catch (err) {
    console.warn("Runtime content render failed:", err);
  }

  const year = document.getElementById("year");
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  const DEFAULT_WA_TEXT = runtimeConfig?.contact_info?.whatsapp_text || "";
  document.querySelectorAll("[data-wa-phone]").forEach((node) => {
    if (node.tagName !== "A") return;
    const rawPhone = node.dataset.waPhone;
    if (!rawPhone) return;
    const phone = rawPhone.replace(/\s+/g, "").replace(/^\+/, "");
    const text = node.dataset.waText || DEFAULT_WA_TEXT;
    const encodedText = encodeURIComponent(text);
    node.setAttribute("href", `https://wa.me/${phone}?text=${encodedText}`);
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener");
  });

  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.getElementById("site-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute(
        "aria-label",
        isOpen ? runtimeContent?.ui?.nav_close || "" : runtimeContent?.ui?.nav_open || ""
      );
    });

    nav.querySelectorAll("[data-nav-link]").forEach((link) => {
      link.addEventListener("click", () => {
        if (nav.classList.contains("is-open")) {
          nav.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
          toggle.setAttribute("aria-label", runtimeContent?.ui?.nav_open || "");
        }
      });
    });
  }

  // Accessible modal handling (focus trap, ESC, persistent consent).
  const focusableSelector =
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
  let activeModal = null;
  let lastFocused = null;

  const getFocusable = (modal) =>
    Array.from(modal.querySelectorAll(focusableSelector)).filter(
      (el) => !el.hasAttribute("disabled")
    );

  const trapFocus = (event) => {
    if (!activeModal || event.key !== "Tab") return;
    const focusable = getFocusable(activeModal);
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const isShift = event.shiftKey;

    if (isShift && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!isShift && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const closeActiveModal = () => {
    if (!activeModal) return;
    activeModal.hidden = true;
    document.body.classList.remove("is-modal-open");
    document.removeEventListener("keydown", onKeydown);
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
    activeModal = null;
  };

  const openModal = (modal) => {
    if (!modal || activeModal === modal) return;
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("is-modal-open");
    activeModal = modal;
    document.addEventListener("keydown", onKeydown);
    const focusable = getFocusable(modal);
    const initial = focusable[0] || modal;
    initial.focus({ preventScroll: true });
  };

  const setConsent = (value) => {
    try {
      localStorage.setItem("fs_cookie_consent", value);
    } catch (err) {
      // If storage is blocked, we still respect the session decision.
    }
  };

  const onKeydown = (event) => {
    if (!activeModal) return;
    if (event.key === "Escape") {
      if (activeModal.id === "cookie-modal") {
        setConsent("rejected");
      }
      closeActiveModal();
      return;
    }
    trapFocus(event);
  };

  document.addEventListener("click", (event) => {
    const opener = event.target.closest("[data-modal-target]");
    if (opener) {
      if (opener.tagName === "A") {
        event.preventDefault();
      }
      const targetId = opener.getAttribute("data-modal-target");
      openModal(document.getElementById(targetId));
      return;
    }
    const closer = event.target.closest("[data-modal-close]");
    if (closer) {
      closeActiveModal();
    }
  });

  const cookieModal = document.getElementById("cookie-modal");
  if (cookieModal) {
    const stored = (() => {
      try {
        return localStorage.getItem("fs_cookie_consent");
      } catch (err) {
        return null;
      }
    })();
    if (!stored) {
      openModal(cookieModal);
    }

    const acceptBtn = cookieModal.querySelector("[data-cookie-accept]");
    const rejectBtn = cookieModal.querySelector("[data-cookie-reject]");

    if (acceptBtn) {
      acceptBtn.addEventListener("click", () => {
        setConsent("accepted");
        closeActiveModal();
      });
    }
    if (rejectBtn) {
      rejectBtn.addEventListener("click", () => {
        setConsent("rejected");
        closeActiveModal();
      });
    }
  }

  const form = document.querySelector(".contact-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const statusEl = form.querySelector(".form-status");
    const submitBtn = form.querySelector('button[type="submit"]');
    if (!statusEl || !submitBtn) return;

    submitBtn.disabled = true;
    statusEl.textContent = runtimeContent?.ui?.form?.sending || "";
    statusEl.className = "form-status";

    try {
      const res = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        form.reset();
        statusEl.textContent = runtimeContent?.ui?.form?.success || "";
        statusEl.classList.add("is-ok");
      } else {
        statusEl.textContent = runtimeContent?.ui?.form?.error || "";
        statusEl.classList.add("is-error");
      }
    } catch (err) {
      statusEl.textContent = runtimeContent?.ui?.form?.error || "";
      statusEl.classList.add("is-error");
    } finally {
      submitBtn.disabled = false;
    }
  });
});

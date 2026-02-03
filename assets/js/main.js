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

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const warnRuntime = (message) => {
  console.warn(`[RuntimeValidation] ${message}`);
};

const renderDetailCard = (detail, data) => {
  const title = resolveString(detail.name, data);
  const description = resolveString(detail.description || "", data);
  const briefing = resolveString(detail.briefing || "", data);
  const image = resolveString(detail.image || "", data);
  const alt = resolveString(detail.alt || "", data);
  const dateValue = resolveString(detail.date || "", data);
  const dateLabel = resolveString(detail.date_label || "", data);
  const showImage = isNonEmptyString(image);
  const showTime = isNonEmptyString(dateLabel || dateValue);
  const showDescription = isNonEmptyString(description);
  const showBriefing = isNonEmptyString(briefing);

  return `
      <article class="card">
        ${
          showImage
            ? `<img class="card-media" src="${image}" alt="${alt}" loading="lazy" decoding="async" />`
            : ""
        }
        ${showTime ? `<time class="card-meta" datetime="${dateValue}">${dateLabel || dateValue}</time>` : ""}
        <h3>${title}</h3>
        ${showDescription ? `<p class="card-desc">${description}</p>` : ""}
        ${showBriefing ? `<p class="card-brief">${briefing}</p>` : ""}
      </article>`;
};

const validateProjects = (projects) => {
  if (!projects || typeof projects !== "object") {
    warnRuntime("projects payload missing or invalid.");
    return;
  }

  const sections = Array.isArray(projects.sections) ? projects.sections : [];
  if (!sections.length) {
    warnRuntime("projects.sections is empty.");
  }

  const sectionIds = new Set();
  const sectionSlugs = new Set();
  const detailSlugsBySection = new Map();
  const detailIdsBySection = new Map();

  sections.forEach((section, index) => {
    const prefix = `projects.sections[${index}]`;
    if (!section || typeof section !== "object") {
      warnRuntime(`${prefix} is not an object.`);
      return;
    }

    if (typeof section.id !== "number") {
      warnRuntime(`${prefix}.id is required and must be a number.`);
    } else if (sectionIds.has(section.id)) {
      warnRuntime(`${prefix}.id ${section.id} is duplicated.`);
    } else {
      sectionIds.add(section.id);
    }

    if (!isNonEmptyString(section.name)) {
      warnRuntime(`${prefix}.name is required.`);
    }

    if (!isNonEmptyString(section.slug)) {
      warnRuntime(`${prefix}.slug is required.`);
    } else if (sectionSlugs.has(section.slug)) {
      warnRuntime(`${prefix}.slug "${section.slug}" is duplicated.`);
    } else {
      sectionSlugs.add(section.slug);
    }

    const details = Array.isArray(section.details) ? section.details : [];
    if (!details.length) {
      warnRuntime(`${prefix}.details is empty.`);
    }

    details.forEach((detail, detailIndex) => {
      const detailPrefix = `${prefix}.details[${detailIndex}]`;
      if (!detail || typeof detail !== "object") {
        warnRuntime(`${detailPrefix} is not an object.`);
        return;
      }

      if (typeof detail.id !== "number") {
        warnRuntime(`${detailPrefix}.id is required and must be a number.`);
      } else {
        const seenIds = detailIdsBySection.get(section.id) || new Set();
        if (seenIds.has(detail.id)) {
          warnRuntime(
            `${detailPrefix}.id ${detail.id} is duplicated in section ${section.id}.`
          );
        }
        seenIds.add(detail.id);
        detailIdsBySection.set(section.id, seenIds);
      }

      if (typeof detail.section_id !== "number") {
        warnRuntime(`${detailPrefix}.section_id is required and must be a number.`);
      } else if (typeof section.id === "number" && detail.section_id !== section.id) {
        warnRuntime(
          `${detailPrefix}.section_id ${detail.section_id} does not match section ${section.id}.`
        );
      }

      if (!isNonEmptyString(detail.name)) {
        warnRuntime(`${detailPrefix}.name is required.`);
      }

      if (!isNonEmptyString(detail.slug)) {
        warnRuntime(`${detailPrefix}.slug is required.`);
      } else {
        const seenSlugs = detailSlugsBySection.get(section.id) || new Set();
        if (seenSlugs.has(detail.slug)) {
          warnRuntime(
            `${detailPrefix}.slug "${detail.slug}" is duplicated in section ${section.id}.`
          );
        }
        seenSlugs.add(detail.slug);
        detailSlugsBySection.set(section.id, seenSlugs);
      }

      if (!isNonEmptyString(detail.image)) {
        warnRuntime(`${detailPrefix}.image is required.`);
      } else if (
        /^https?:\/\//i.test(detail.image) ||
        /^\/\//.test(detail.image) ||
        /^data:/i.test(detail.image)
      ) {
        warnRuntime(`${detailPrefix}.image must be relative.`);
      } else if (detail.image.startsWith("/")) {
        warnRuntime(`${detailPrefix}.image is root-relative; prefer relative paths.`);
      }

      if (!isNonEmptyString(detail.alt)) {
        warnRuntime(`${detailPrefix}.alt is required.`);
      }
    });
  });
};

const validateDatasetMeta = (dataset, label, companyId) => {
  if (!dataset || typeof dataset !== "object") {
    warnRuntime(`${label} payload missing or invalid.`);
    return;
  }
  if (typeof dataset.company_id !== "number") {
    warnRuntime(`${label}.company_id is required and must be a number.`);
  } else if (typeof companyId === "number" && dataset.company_id !== companyId) {
    warnRuntime(
      `${label}.company_id ${dataset.company_id} does not match company.id ${companyId}.`
    );
  }
};

const validateRuntimeContent = (site, company, projects) => {
  if (!site?.infrastructure) {
    warnRuntime("site.infrastructure is required.");
  }
  if (!company || typeof company !== "object") {
    warnRuntime("company payload missing or invalid.");
  } else {
    if (typeof company.id !== "number") {
      warnRuntime("company.id is required and must be a number.");
    }
    if (!isNonEmptyString(company?.brand?.name)) {
      warnRuntime("company.brand.name is required.");
    }
    if (!isNonEmptyString(company?.brand?.logo_src)) {
      warnRuntime("company.brand.logo_src is required.");
    }
  }
  validateProjects(projects);
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

const getGridClass = (count) => {
  if (count <= 1) return "grid-1";
  if (count === 2) return "grid-2";
  return "grid-3";
};

const buildServices = (container, sections, data) => {
  if (!container) return;
  const orderedSections = (sections || []).slice().sort(
    (a, b) => (a.id ?? 0) - (b.id ?? 0)
  );
  const details = orderedSections.flatMap((section) =>
    (section.details || []).slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
  );
  container.classList.remove("grid-1", "grid-2", "grid-3");
  container.classList.add(getGridClass(details.length));
  container.innerHTML = details.map((detail) => renderDetailCard(detail, data)).join("");
};

const buildProjects = (container, sections, data) => {
  if (!container) return;
  const orderedSections = (sections || []).slice().sort(
    (a, b) => (a.id ?? 0) - (b.id ?? 0)
  );
  container.innerHTML = orderedSections
    .map((section) => {
      const projects = (section.details || []).slice().sort(
        (a, b) => (a.id ?? 0) - (b.id ?? 0)
      );
      const cards = projects
        .map((project) => renderDetailCard(project, data))
        .join("");
      const sectionDesc = resolveString(section.description || "", data);
      return `
        <section class="card" aria-label="${resolveString(
          section.name,
          data
        )}">
          <div class="category">
            <h3 class="category-title">${resolveString(section.name, data)}</h3>
          </div>
          ${sectionDesc ? `<p class="category-desc">${sectionDesc}</p>` : ""}
          <div class="grid grid-3" aria-label="${resolveString(
            section.name,
            data
          )}">
            ${cards}
          </div>
        </section>`;
    })
    .join("");
};

const buildNews = (container, sections, data) => {
  if (!container) return;
  const orderedSections = (sections || []).slice().sort(
    (a, b) => (a.id ?? 0) - (b.id ?? 0)
  );
  const details = orderedSections.flatMap((section) =>
    (section.details || []).slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
  );
  container.classList.remove("grid-1", "grid-2", "grid-3");
  container.classList.add(getGridClass(details.length));
  container.innerHTML = details.map((detail) => renderDetailCard(detail, data)).join("");
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
  const [site, company, projects, services, news] = await Promise.all([
    fetch("assets/config/es.site.json").then((res) => res.json()),
    fetch("assets/config/es.company.json").then((res) => res.json()),
    fetch("assets/config/es.projects.json").then((res) => res.json()),
    fetch("assets/config/es.services.json").then((res) => res.json()),
    fetch("assets/config/es.news.json").then((res) => res.json())
  ]);

  validateRuntimeContent(site, company, projects);
  validateDatasetMeta(services, "services", company?.id);
  validateDatasetMeta(news, "news", company?.id);

  const data = {
    site,
    infrastructure: site.infrastructure,
    company,
    services,
    news
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
  buildServices(
    document.getElementById("services-cards"),
    services.sections,
    data
  );
  buildProjects(document.getElementById("projects-grid"), projects.sections, data);
  buildNews(document.getElementById("news-grid"), news.sections, data);
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
    const navLinks = Array.from(nav.querySelectorAll("[data-nav-link]"));
    const linkById = new Map(
      navLinks
        .map((link) => {
          const targetId = (link.getAttribute("href") || "").replace("#", "");
          return targetId ? [targetId, link] : null;
        })
        .filter(Boolean)
    );

    const setActiveLink = (activeId) => {
      navLinks.forEach((link) => {
        link.classList.toggle("is-active", linkById.get(activeId) === link);
      });
    };

    const sections = Array.from(document.querySelectorAll("main section[id]"));
    if (sections.length) {
      const updateActiveByScroll = () => {
        const marker = window.innerHeight * 0.35;
        let bestId = null;
        let bestDistance = Infinity;
        sections.forEach((section) => {
          const rect = section.getBoundingClientRect();
          const within = rect.top <= marker && rect.bottom >= marker;
          const distance = Math.abs(rect.top - marker);
          if (within && distance < bestDistance) {
            bestId = section.id;
            bestDistance = distance;
          } else if (!within && distance < bestDistance) {
            bestId = section.id;
            bestDistance = distance;
          }
        });
        if (bestId) setActiveLink(bestId);
      };

      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          if (visible.length) {
            setActiveLink(visible[0].target.id);
          }
        },
        { rootMargin: "-25% 0px -55% 0px", threshold: [0.1, 0.25, 0.5, 0.75] }
      );

      sections.forEach((section) => observer.observe(section));

      let scrollTick = null;
      const onScroll = () => {
        if (scrollTick) return;
        scrollTick = requestAnimationFrame(() => {
          scrollTick = null;
          updateActiveByScroll();
        });
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      updateActiveByScroll();
    }

    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute(
        "aria-label",
        isOpen ? runtimeContent?.ui?.nav_close || "" : runtimeContent?.ui?.nav_open || ""
      );
    });

    document.addEventListener("click", (event) => {
      if (!nav.classList.contains("is-open")) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (nav.contains(target) || toggle.contains(target)) return;
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", runtimeContent?.ui?.nav_open || "");
    });

    nav.querySelectorAll("[data-nav-link]").forEach((link) => {
      link.addEventListener("click", () => {
        const targetId = (link.getAttribute("href") || "").replace("#", "");
        if (targetId) setActiveLink(targetId);
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

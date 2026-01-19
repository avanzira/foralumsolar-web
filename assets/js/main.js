// assets/js/main.js

document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  const DEFAULT_WA_TEXT =
    "Hola Foralum Solar, me gustaría pedir información sobre una instalación fotovoltaica.";
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
      toggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
    });

    nav.querySelectorAll("[data-nav-link]").forEach((link) => {
      link.addEventListener("click", () => {
        if (nav.classList.contains("is-open")) {
          nav.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
          toggle.setAttribute("aria-label", "Abrir menú");
        }
      });
    });
  }

  const currentUrl = window.location.pathname;
  let currentPath = currentUrl;
  if (currentPath === "/") {
    currentPath = "/index.html";
  } else if (currentPath.endsWith("/")) {
    currentPath = `${currentPath}index.html`;
  }

  const navLinks = document.querySelectorAll("header nav a[href]");
  navLinks.forEach((link) => {
    const rawHref = link.getAttribute("href");
    if (!rawHref || rawHref.startsWith("http")) return;
    if (link.matches("[data-wa-phone], .btn-whatsapp")) return;

    let linkPath = new URL(rawHref, window.location.href).pathname;
    if (linkPath === "/") {
      linkPath = "/index.html";
    } else if (linkPath.endsWith("/")) {
      linkPath = `${linkPath}index.html`;
    }

    if (linkPath === currentPath) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }
  });

  const form = document.querySelector(".contact-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const statusEl = form.querySelector(".form-status");
    const submitBtn = form.querySelector('button[type="submit"]');
    if (!statusEl || !submitBtn) return;

    submitBtn.disabled = true;
    statusEl.textContent = "Enviando...";
    statusEl.className = "form-status";

    try {
      const res = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        form.reset();
        statusEl.textContent =
          "Mensaje enviado correctamente. Te responderemos lo antes posible.";
        statusEl.classList.add("is-ok");
      } else {
        statusEl.textContent =
          "No se pudo enviar el mensaje. Inténtalo de nuevo en unos minutos.";
        statusEl.classList.add("is-error");
      }
    } catch (err) {
      statusEl.textContent =
        "No se pudo enviar el mensaje. Inténtalo de nuevo en unos minutos.";
      statusEl.classList.add("is-error");
    } finally {
      submitBtn.disabled = false;
    }
  });
});

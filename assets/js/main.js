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

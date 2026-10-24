/* Progressive enhancements only. Documentation needs no JavaScript or network. */
"use strict";

const copyStatus = document.getElementById("copy-status");
document.querySelectorAll("[data-copy]").forEach((button) => {
  button.hidden = false;
  let resetTimer;
  button.addEventListener("click", async () => {
    const source = document.getElementById(button.dataset.copy);
    if (!source) return;
    clearTimeout(resetTimer);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(source.textContent);
      button.textContent = "Copied";
      copyStatus.textContent = "Copied to clipboard.";
    } catch {
      // Local file previews and restricted browsers may deny clipboard access.
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(source);
      selection.removeAllRanges();
      selection.addRange(range);
      button.textContent = "Selected";
      copyStatus.textContent = "Clipboard unavailable. Text selected; use your browser's Copy command.";
    }
    resetTimer = setTimeout(() => { button.textContent = "Copy"; }, 2400);
  });
});

// An illustrative local demo, not a client for the real game's backend.
const activate = document.getElementById("demo-activate");
const reset = document.getElementById("demo-reset");
const coins = document.getElementById("demo-coins");
const demoState = document.getElementById("demo-state");
const device = document.querySelector(".device");
if (activate && reset && coins && demoState && device) {
  activate.hidden = false;
  reset.hidden = false;
  activate.addEventListener("click", () => {
    coins.textContent = "10";
    activate.textContent = "Beacon active · reward claimed";
    activate.disabled = true;
    demoState.textContent = "Tutorial complete. Reward granted once.";
    device.classList.add("is-active");
  });
  reset.addEventListener("click", () => {
    coins.textContent = "0";
    activate.textContent = "Activate beacon · +10 coins";
    activate.disabled = false;
    demoState.textContent = "Example reset. Try the first action again.";
    device.classList.remove("is-active");
  });
}

// Track the current guide without a scroll handler or changing browser history.
if ("IntersectionObserver" in window) {
  const guideLinks = Array.from(document.querySelectorAll(".sidebar nav a"));
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      guideLinks.forEach((link) => {
        if (link.hash === `#${entry.target.id}`) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }
  }, { rootMargin: "-5% 0px -65% 0px", threshold: 0 });
  document.querySelectorAll(".doc-section").forEach((section) => observer.observe(section));
}

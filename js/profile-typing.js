/* Header-only typing loop; navigation re-renders do not recreate this timer. */
(() => {
  "use strict";
  const text = document.getElementById("profileTypingText");
  if (!text) return;
  const phrases = ["用数据理解问题", "用技术实现想法", "在实践中持续成长"];
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let timer = null;
  let phrase = 0;
  let count = 0;
  let deleting = false;

  function step() {
    if (motion.matches) return;
    const current = phrases[phrase];
    count += deleting ? -1 : 1;
    text.textContent = current.slice(0, count);
    let delay = deleting ? 50 : 90;
    if (!deleting && count === current.length) {
      deleting = true;
      delay = 2500;
    } else if (deleting && count === 0) {
      deleting = false;
      phrase = (phrase + 1) % phrases.length;
      delay = 400;
    }
    timer = setTimeout(step, delay);
  }

  function configure() {
    clearTimeout(timer);
    timer = null;
    if (motion.matches) {
      text.textContent = "用技术实现想法";
      return;
    }
    phrase = 0;
    count = 0;
    deleting = false;
    text.textContent = "";
    timer = setTimeout(step, 90);
  }
  motion.addEventListener("change", configure);
  configure();
})();

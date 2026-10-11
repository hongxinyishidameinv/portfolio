(function () {
  "use strict";

  const desktop = matchMedia("(hover: hover) and (pointer: fine)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const canvas = document.createElement("canvas");
  canvas.className = "cursor-trail";
  canvas.setAttribute("aria-hidden", "true");
  const context = canvas.getContext("2d");
  if (!context) return;

  // Tune the effect here without changing rendering or page styles.
  const CONFIG = {
    color: "#22D3EE",
    brightness: 0.62,
    glowBrightness: 0.22,
    length: 145,
    lifetime: 520,
    lineWidth: 2.6,
    dotRadius: 2.4,
    glowBlur: 7,
    maxPoints: 48,
    maxDots: 8,
    maxDpr: 2,
  };
  const points = [];
  const particles = [];
  let frame = 0;
  let enabled = false;
  let previous = null;
  let lastEmission = 0;
  let width = 0;
  let height = 0;

  function clear() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    points.length = 0;
    particles.length = 0;
    previous = null;
    lastEmission = 0;
    context.clearRect(0, 0, width, height);
  }

  function resize() {
    clear();
    width = innerWidth;
    height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, CONFIG.maxDpr);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function trim(now) {
    while (points.length && now - points[0].born >= CONFIG.lifetime) points.shift();
    let distance = 0;
    for (let index = points.length - 1; index > 0; index--) {
      const older = points[index - 1], newer = points[index];
      const segment = Math.hypot(newer.x - older.x, newer.y - older.y);
      if (distance + segment > CONFIG.length) {
        const fraction = (CONFIG.length - distance) / segment;
        points[index - 1] = {
          x: newer.x + (older.x - newer.x) * fraction,
          y: newer.y + (older.y - newer.y) * fraction,
          born: older.born,
        };
        points.splice(0, index - 1);
        break;
      }
      distance += segment;
    }
    for (let index = particles.length - 1; index >= 0; index--) {
      const dot = particles[index];
      if (now - dot.born >= CONFIG.lifetime || (previous &&
          Math.hypot(dot.x - previous.x, dot.y - previous.y) > CONFIG.length)) particles.splice(index, 1);
    }
  }

  function draw(now) {
    frame = 0;
    context.clearRect(0, 0, width, height);
    trim(now);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = CONFIG.color;
    context.fillStyle = CONFIG.color;
    context.shadowColor = CONFIG.color;
    for (let index = 1; index < points.length; index++) {
      const older = points[index - 1], newer = points[index];
      const age = Math.max(0, 1 - (now - older.born) / CONFIG.lifetime);
      const taper = index / (points.length - 1);
      const strength = age * (0.15 + 0.85 * taper);
      context.lineWidth = CONFIG.lineWidth * (0.2 + 0.8 * taper) * age;
      context.beginPath();
      context.moveTo(older.x, older.y);
      context.lineTo(newer.x, newer.y);
      // A subdued glow pass followed by a crisp, narrow core.
      context.shadowBlur = CONFIG.glowBlur;
      context.globalAlpha = CONFIG.glowBrightness * strength;
      context.stroke();
      context.shadowBlur = 0;
      context.globalAlpha = CONFIG.brightness * strength;
      context.stroke();
    }
    for (const dot of particles) {
      const fade = Math.max(0, 1 - (now - dot.born) / CONFIG.lifetime);
      context.globalAlpha = CONFIG.brightness * 0.65 * fade * fade;
      context.shadowBlur = CONFIG.glowBlur * 0.5;
      context.beginPath();
      context.arc(dot.x, dot.y, CONFIG.dotRadius * fade, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    context.shadowBlur = 0;
    if ((points.length || particles.length) && enabled && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function move(event) {
    if (!enabled || document.hidden || event.pointerType !== "mouse") return;
    // Native modal dialogs occupy the browser top layer, above the canvas.
    if (document.querySelector("dialog[open]")) {
      clear();
      return;
    }
    const now = performance.now();
    const point = { x: event.clientX, y: event.clientY, born: now };
    const distance = previous ? Math.hypot(point.x - previous.x, point.y - previous.y) : 0;
    if (distance < 1 && previous) return;
    points.push(point);
    if (points.length > CONFIG.maxPoints) points.splice(0, points.length - CONFIG.maxPoints);
    if (previous && now - lastEmission >= 65 && distance >= 3) {
      particles.push(point);
      if (particles.length > CONFIG.maxDots) particles.shift();
      lastEmission = now;
    }
    previous = point;
    trim(now);
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function update() {
    enabled = desktop.matches && !reduced.matches && !document.hidden;
    clear();
    if (enabled) {
      if (!canvas.isConnected) document.body.appendChild(canvas);
      resize();
    } else {
      canvas.remove();
    }
  }

  desktop.addEventListener("change", update);
  reduced.addEventListener("change", update);
  document.addEventListener("visibilitychange", update);
  document.addEventListener("pointermove", move, { passive: true });
  document.documentElement.addEventListener("pointerleave", clear);
  window.addEventListener("blur", clear);
  window.addEventListener("pagehide", clear);
  window.addEventListener("resize", resize, { passive: true });
  update();
})();

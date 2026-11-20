"use strict";

const catAnimations = ["./cat-1.gif", "./cat-2.gif", "./cat-3.gif"];

function startCat(image, button) {
  const interval = 3 * 60 * 1000;
  const startedAt = Date.now();
  let current = 0;

  function update() {
    const next = Math.floor((Date.now() - startedAt) / interval) % catAnimations.length;
    if (next === current) return;
    image.src = catAnimations[next];
    current = next;
  }

  window.setInterval(update, interval);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) update();
  });
  let effectFile;
  let playing = false;
  button.addEventListener("click", async () => {
    if (playing) return;
    playing = true;
    const path = "./cat-effect.gif";
    effectFile ??= fetch(path).then((response) => response.ok ? response.blob() : null).catch(() => null);
    const file = await effectFile;
    const source = file ? URL.createObjectURL(file) : path;
    const effect = new Image();
    effect.className = "cat-effect";
    effect.alt = "";
    effect.src = source;
    try {
      await effect.decode();
      button.append(effect);
      button.classList.add("is-playing");
      await new Promise((resolve) => window.setTimeout(resolve, 540));
    } catch {
      // Keep the current animation visible if the click effect cannot load.
    } finally {
      effect.remove();
      button.classList.remove("is-playing");
      if (file) URL.revokeObjectURL(source);
      playing = false;
    }
  });
}

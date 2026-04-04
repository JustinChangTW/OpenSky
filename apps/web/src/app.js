function createBootMarkup() {
  return `
    <main class="boot-shell">
      <section class="boot-card">
        <h1>OpenSky</h1>
        <p>
          Greenfield workspace bootstrap is active. The frontend shell, layout system,
          auth flow, browse flow, and transfer features are attached in later slices.
        </p>
        <div class="boot-grid">
          <article class="boot-panel">
            <strong>Frontend</strong>
            <span>GitHub Pages static shell placeholder is ready.</span>
          </article>
          <article class="boot-panel">
            <strong>Backend</strong>
            <span>Render service bootstrap and contracts are wired.</span>
          </article>
          <article class="boot-panel">
            <strong>Policy</strong>
            <span>Allowlist matcher package is available for service routing.</span>
          </article>
        </div>
      </section>
    </main>
  `;
}

export function bootApplication(documentRef = globalThis.document) {
  const mountNode = documentRef?.getElementById?.("app");
  if (!mountNode) {
    return;
  }

  mountNode.innerHTML = createBootMarkup();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => bootApplication(document));
}

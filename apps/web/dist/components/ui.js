export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buttonClasses({ emphasized = false } = {}) {
  return emphasized ? "osk-btn osk-btn-primary" : "osk-btn";
}

export function renderBanner(banner) {
  if (!banner) {
    return "";
  }

  return `
    <section class="osk-banner osk-banner-${escapeHtml(banner.tone ?? "info")}" data-banner>
      <div>
        <strong>${escapeHtml(banner.title)}</strong>
        <p>${escapeHtml(banner.message)}</p>
      </div>
      <button class="osk-btn" data-action="clear-banner" type="button">Dismiss</button>
    </section>
  `;
}

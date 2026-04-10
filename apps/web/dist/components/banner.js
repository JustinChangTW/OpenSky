import { createTranslator, normalizeLocale } from "../i18n-runtime.js";
import { escapeHtml } from "./ui.js";

export function createBannerMarkup(banners, locale = "en") {
  const t = createTranslator(normalizeLocale(locale));

  if (!banners.length) {
    return '<div class="banner-stack banner-stack--empty" aria-live="polite"></div>';
  }

  return `
    <div class="banner-stack" aria-live="polite">
      ${banners.map((banner) => `
        <article class="banner banner--${banner.tone}">
          <div>
            <strong>${escapeHtml(banner.title ?? "")}</strong>
            <p>${escapeHtml(banner.message ?? "")}</p>
          </div>
          <div class="stack-actions">
            ${banner.action?.type ? `
              <button
                type="button"
                class="ghost-button"
                data-action="${escapeHtml(banner.action.type)}"
                ${banner.action.url ? `data-url="${escapeHtml(banner.action.url)}"` : ""}
              >${escapeHtml(banner.action.label ?? "")}</button>
            ` : ""}
            <button type="button" class="banner__dismiss" data-action="dismiss-banner" data-banner-id="${escapeHtml(banner.id)}">
              ${t("banner.dismiss")}
            </button>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

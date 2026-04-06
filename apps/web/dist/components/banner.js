import { createTranslator, normalizeLocale } from "../i18n-runtime.js";

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
            <strong>${banner.title}</strong>
            <p>${banner.message}</p>
          </div>
          <button type="button" class="banner__dismiss" data-action="dismiss-banner" data-banner-id="${banner.id}">
            ${t("banner.dismiss")}
          </button>
        </article>
      `).join("")}
    </div>
  `;
}

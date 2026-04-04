export function createBannerMarkup(banners) {
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
            Dismiss
          </button>
        </article>
      `).join("")}
    </div>
  `;
}

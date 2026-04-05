import { createLocaleSwitcherMarkup, createTranslator, normalizeLocale } from "../../i18n-runtime.js";

export function createSignInMarkup({ bannerMarkup, statusMessage, loading, locale = "en" }) {
  const resolvedLocale = normalizeLocale(locale);
  const t = createTranslator(resolvedLocale);

  return `
    <main class="auth-shell">
      <section class="auth-card">
        <header class="auth-card__header">
          <p class="eyebrow">${t("auth.eyebrow")}</p>
          <h1>${t("app.name")}</h1>
          <p class="auth-card__lede">
            ${t("auth.lede")}
          </p>
          ${createLocaleSwitcherMarkup(resolvedLocale)}
        </header>
        ${bannerMarkup}
        <form class="auth-form" data-sign-in-form>
          <label class="auth-form__field">
            <span>${t("auth.username")}</span>
            <input name="username" type="text" autocomplete="username" placeholder="${t("auth.usernamePlaceholder")}" required />
          </label>
          <label class="auth-form__field">
            <span>${t("auth.password")}</span>
            <input name="password" type="password" autocomplete="current-password" placeholder="${t("auth.passwordPlaceholder")}" required />
          </label>
          <button type="submit" class="primary-button" ${loading ? "disabled" : ""}>
            ${loading ? t("auth.checkingSession") : t("auth.signIn")}
          </button>
        </form>
        <p class="auth-status">${statusMessage}</p>
      </section>
    </main>
  `;
}

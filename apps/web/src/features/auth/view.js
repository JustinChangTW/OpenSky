export function createSignInMarkup({ bannerMarkup, statusMessage, loading }) {
  return `
    <main class="auth-shell">
      <section class="auth-card">
        <header class="auth-card__header">
          <p class="eyebrow">Single-user allowlisted workspace</p>
          <h1>OpenSky</h1>
          <p class="auth-card__lede">
            Sign in to restore your projects, tabs, notes, and layout preferences.
          </p>
        </header>
        ${bannerMarkup}
        <form class="auth-form" data-sign-in-form>
          <label class="auth-form__field">
            <span>Username</span>
            <input name="username" type="text" autocomplete="username" placeholder="owner-admin" required />
          </label>
          <label class="auth-form__field">
            <span>Password</span>
            <input name="password" type="password" autocomplete="current-password" placeholder="Owner password" required />
          </label>
          <button type="submit" class="primary-button" ${loading ? "disabled" : ""}>
            ${loading ? "Checking session..." : "Sign in"}
          </button>
        </form>
        <p class="auth-status">${statusMessage}</p>
      </section>
    </main>
  `;
}

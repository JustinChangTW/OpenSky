import { reduceLayoutState } from "./state.js";
import { createTranslator, normalizeLocale } from "../../i18n-runtime.js";

function createFullscreenFailureBanner(title, message) {
  return {
    id: crypto.randomUUID(),
    tone: "warning",
    title,
    message
  };
}

export async function attemptFullscreen({ enterFullscreen, exitFullscreen, isFullscreenActive, onFailure }) {
  try {
    await enterFullscreen();
    return {
      viewMode: "fullscreen"
    };
  } catch (error) {
    if (isFullscreenActive()) {
      await exitFullscreen().catch(() => undefined);
    }

    const banner = {
      id: crypto.randomUUID(),
      tone: "warning",
      title: "Fullscreen unavailable",
      message: error.message
    };

    onFailure?.(banner);

    return {
      viewMode: "maximized",
      banner
    };
  }
}

export async function requestFullscreenWithFallback({ documentRef, targetElement, layout, locale = "en" }) {
  const t = createTranslator(normalizeLocale(locale));
  const result = await attemptFullscreen({
    enterFullscreen: async () => {
      if (!targetElement?.requestFullscreen) {
        throw new Error(t("error.FULLSCREEN_NOT_AVAILABLE.message"));
      }

      await targetElement.requestFullscreen();
    },
    exitFullscreen: async () => documentRef?.exitFullscreen?.(),
    isFullscreenActive: () => Boolean(documentRef?.fullscreenElement),
    onFailure: undefined
  });

  if (result.viewMode === "fullscreen") {
    return {
      layout: reduceLayoutState(layout, {
        type: "set-view-mode",
        viewMode: "fullscreen"
      }),
      banner: null
    };
  }

  return {
    layout: reduceLayoutState(layout, {
      type: "set-view-mode",
      viewMode: "maximized"
    }),
    banner: result.banner
      ? {
          ...result.banner,
          title: t("error.FULLSCREEN_NOT_AVAILABLE.title"),
          message: result.banner.message || t("error.FULLSCREEN_NOT_AVAILABLE.message")
        }
      : createFullscreenFailureBanner(
          t("error.FULLSCREEN_NOT_AVAILABLE.title"),
          t("error.FULLSCREEN_NOT_AVAILABLE.message")
        )
  };
}

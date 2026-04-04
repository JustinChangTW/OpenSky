import { reduceLayoutState } from "./state.js";

function createFullscreenFailureBanner(message) {
  return {
    id: crypto.randomUUID(),
    tone: "warning",
    title: "FULLSCREEN_NOT_AVAILABLE",
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

export async function requestFullscreenWithFallback({ documentRef, targetElement, layout }) {
  const result = await attemptFullscreen({
    enterFullscreen: async () => {
      if (!targetElement?.requestFullscreen) {
        throw new Error("Fullscreen is not available in this environment.");
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
          title: "FULLSCREEN_NOT_AVAILABLE"
        }
      : createFullscreenFailureBanner("Fullscreen is not available in this environment.")
  };
}

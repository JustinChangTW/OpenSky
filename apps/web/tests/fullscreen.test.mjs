import test from "node:test";
import assert from "node:assert/strict";
import { attemptFullscreen } from "../src/features/layout/fullscreen.js";

test("attemptFullscreen returns fullscreen mode on success", async () => {
  const result = await attemptFullscreen({
    enterFullscreen: async () => {},
    exitFullscreen: async () => {},
    isFullscreenActive: () => false
  });

  assert.equal(result.viewMode, "fullscreen");
});

test("attemptFullscreen falls back to maximized when browser fullscreen fails", async () => {
  let bannerTitle = null;
  const result = await attemptFullscreen({
    enterFullscreen: async () => {
      throw new Error("FULLSCREEN_NOT_AVAILABLE");
    },
    exitFullscreen: async () => {},
    isFullscreenActive: () => false,
    onFailure: (banner) => {
      bannerTitle = banner.title;
    }
  });

  assert.equal(result.viewMode, "maximized");
  assert.equal(bannerTitle, "Fullscreen unavailable");
});

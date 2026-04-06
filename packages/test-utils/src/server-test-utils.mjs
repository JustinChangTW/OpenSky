import { createServiceContext } from "../../../apps/service/src/common/service-context.mjs";
import { createServiceHandler } from "../../../apps/service/src/app.mjs";

export function createTestClient(options = {}) {
  const mergedEnv = {
    OPEN_SKY_ENABLE_DEMO_PRESET: options.enableDemoPreset ? "true" : "false",
    ...(options.env ?? {})
  };
  const context = createServiceContext({
    ...options,
    env: mergedEnv
  });
  const handler = createServiceHandler(context);

  return {
    context,
    async request(pathname, init = {}) {
      const request = new Request(`http://localhost${pathname}`, init);
      return handler.handle(request);
    }
  };
}

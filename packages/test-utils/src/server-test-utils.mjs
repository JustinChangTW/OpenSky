import { createServiceContext } from "../../../apps/service/src/common/service-context.mjs";
import { createServiceHandler } from "../../../apps/service/src/app.mjs";

export function createTestClient() {
  const context = createServiceContext();
  const handler = createServiceHandler(context);

  return {
    context,
    async request(pathname, init = {}) {
      const request = new Request(`http://localhost${pathname}`, init);
      return handler.handle(request);
    }
  };
}

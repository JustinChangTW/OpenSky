import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { createServiceHandler } from "./app.mjs";
import { createServiceContext } from "./common/service-context.mjs";
import { formatStartupLog } from "./common/service-config.mjs";

export function startServer(port = Number(process.env.PORT ?? "8787"), options = {}) {
  const context = createServiceContext(options);
  const handler = createServiceHandler(context);

  const server = createServer(async (incomingMessage, serverResponse) => {
    const requestUrl = new URL(incomingMessage.url ?? "/", `http://${incomingMessage.headers.host ?? "localhost"}`);
    const request = new Request(requestUrl, {
      method: incomingMessage.method,
      headers: incomingMessage.headers,
      body: incomingMessage.method === "GET" || incomingMessage.method === "HEAD" ? undefined : incomingMessage
    });

    const response = await handler.handle(request);
    serverResponse.statusCode = response.status;
    response.headers.forEach((value, key) => {
      serverResponse.setHeader(key, value);
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    serverResponse.end(buffer);
  });

  server.listen(port, () => {
    console.log(`OpenSky service listening on http://localhost:${port}`);
    console.log(formatStartupLog(context.runtime));
  });

  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}

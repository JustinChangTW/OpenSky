import { createServer } from "node:http";
import { createServiceHandler } from "./app.mjs";
import { createServiceContext } from "./common/service-context.mjs";

const port = Number(process.env.PORT ?? "8787");
const handler = createServiceHandler(createServiceContext());

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
});

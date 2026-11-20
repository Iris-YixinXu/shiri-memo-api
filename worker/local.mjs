import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { apiProvider } from "./model.mjs";
import worker from "./index.mjs";
import { createLocalDataStore } from "./local-data.mjs";
import { createLocalQuote } from "./local-quote.mjs";
import { generateWeekSummary, weeklyFacts, weekEndDate } from "./week-summary.mjs";
import { createLocalChatHistory } from "./chat-history.mjs";

const host = "127.0.0.1";
const port = 8767;
const address = `${host}:${port}`;
const origin = `http://${address}`;
const dataDirectory = fileURLToPath(new URL("../data/", import.meta.url));
const data = createLocalDataStore(dataDirectory);
const chatHistory = createLocalChatHistory(dataDirectory);
const localQuote = createLocalQuote(new URL("../data/daily-quote.json", import.meta.url));
const secretsFile = new URL("./.dev.vars", import.meta.url);
await data.prepare();
try {
  await writeFile(secretsFile, "API_BASE_URL=\nAPI_MODEL=\nAPI_KEY=\n", { flag: "wx", mode: 0o600 });
} catch (error) {
  if (error.code !== "EEXIST") throw error;
}
const mimeTypes = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  gif: "image/gif",
};

async function readProvider() {
  try {
    const stored = parseEnv(await readFile(secretsFile, "utf8"));
    return apiProvider({ ...process.env, ...stored });
  } catch {
    return null;
  }
}

let requestMinute = 0;
let requestCount = 0;
const env = {
  WEB_ORIGIN: origin,
  CAT_ACCESS_CODE: randomBytes(24).toString("hex"),
  CHAT_RATE_LIMIT: {
    async rate() {
      const minute = Math.floor(Date.now() / 60000);
      if (minute !== requestMinute) {
        requestMinute = minute;
        requestCount = 0;
      }
      return { success: ++requestCount <= 10 };
    },
  },
};

async function respond(request) {
  const url = new URL(request.url, origin);
  if (request.headers.host !== address || url.origin !== origin) {
    return new Response("请通过本机地址访问拾日。", { status: 403 });
  }

  if (url.pathname === "/api/records" || url.pathname.startsWith("/api/photos/")) {
    if (request.headers["sec-fetch-site"] === "cross-site" ||
      (request.headers.origin && request.headers.origin !== origin) ||
      (request.method === "PUT" && request.headers.origin !== origin)) {
      return new Response(null, { status: 403 });
    }
    if (url.pathname === "/api/records") return data.records(request);
    if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405 });
    const [, date, file] = url.pathname.match(/^\/api\/photos\/([^/]+)\/([^/]+)$/) ?? [];
    return date ? data.photo(date, file) : new Response(null, { status: 404 });
  }

  if (url.pathname === "/api/chat") {
    if (request.method !== "POST") return new Response(null, { status: 405 });
    if (request.headers.origin !== origin) return new Response(null, { status: 403 });

    const headers = new Headers({
      Origin: origin,
      Authorization: `Bearer ${env.CAT_ACCESS_CODE}`,
    });
    const sentAt = new Date();
    if (request.headers["content-type"]) headers.set("Content-Type", request.headers["content-type"]);
    return worker.fetch(new Request(url, {
      method: "POST",
      headers,
      body: request,
      duplex: "half",
    }), {
      ...env,
      MODEL_PROVIDER: await readProvider(),
      RECORD_CHAT: (message, reply) => chatHistory.append(sentAt, message, reply),
    });
  }

  if (url.pathname === "/api/chat-history") {
    if (request.headers["sec-fetch-site"] === "cross-site" ||
      (request.headers.origin && request.headers.origin !== origin) ||
      (request.method === "DELETE" && request.headers.origin !== origin)) {
      return new Response(null, { status: 403 });
    }
    if (request.method === "GET") {
      const turns = await chatHistory.read();
      return Response.json({ messages: turns.slice(-5).flatMap(({ user, assistant }) => [
        { role: "user", content: user },
        { role: "assistant", content: assistant },
      ]) });
    }
    if (request.method !== "DELETE") return new Response(null, { status: 405 });
    await chatHistory.clear();
    return new Response(null, { status: 204 });
  }

  if (url.pathname === "/api/week-summary") {
    if (request.method !== "POST") return new Response(null, { status: 405 });
    if (request.headers.origin !== origin) return new Response(null, { status: 403 });
    const start = url.searchParams.get("week");
    const end = weekEndDate(start);
    if (!end) return Response.json({ error: "请选择有效的一周。" }, { status: 400 });
    const key = await readProvider();
    if (!key) return Response.json({ error: "请先在本机设置 模型 API。" }, { status: 503 });
    const [{ state, revision }, turns] = await Promise.all([data.read(), chatHistory.read()]);
    const facts = weeklyFacts(state?.records ?? [], start, end, turns);
    if (!facts) return Response.json({ error: "这一周还没有可总结的记录或对话。" }, { status: 422 });
    if (!(await env.CHAT_RATE_LIMIT.rate()).success) {
      return Response.json({ error: "小猫忙不过来啦，等一分钟再试喵。" }, { status: 429 });
    }
    try {
      const summary = await generateWeekSummary(key, facts);
      if (summary) return Response.json({ summary: summary.slice(0, 480), revision });
    } catch {
      // Keep the manual recap available when DeepSeek cannot reply.
    }
    return Response.json({ error: "小猫暂时没能写出小结，请稍后再试。" }, { status: 502 });
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405 });
  }
  if (url.pathname === "/daily-quote.json") {
    if (request.method === "HEAD") return new Response(null, { headers: { "Content-Type": "application/json" } });
    if (request.headers["sec-fetch-site"] === "cross-site" ||
      (request.headers.origin && request.headers.origin !== origin)) {
      return new Response(null, { status: 403 });
    }
    return Response.json(await localQuote(await readProvider()));
  }
  if (url.pathname === "/chat-config.js") {
    const endpoint = await readProvider() ? `${origin}/api/chat` : "";
    return new Response(`const CAT_CHAT_ENDPOINT = ${JSON.stringify(endpoint)};\nconst SHIRI_FILE_STORAGE = true;\n`, {
      headers: { "Content-Type": "text/javascript; charset=utf-8" },
    });
  }

  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const match = pathname.match(/^\/([a-z][a-z0-9-]*\.(html|css|js|json|gif))$/);
  if (!match) return new Response(null, { status: 404 });
  try {
    const file = await readFile(new URL(`../memo/${match[1]}`, import.meta.url));
    return new Response(file, {
      headers: { "Content-Type": mimeTypes[match[2]] },
    });
  } catch (error) {
    if (error.code === "ENOENT") return new Response(null, { status: 404 });
    throw error;
  }
}

const server = createServer(async (request, response) => {
  try {
    const result = await respond(request);
    response.writeHead(result.status, {
      ...Object.fromEntries(result.headers),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Cross-Origin-Resource-Policy": "same-origin",
    });
    response.end(request.method === "HEAD" ? undefined : Buffer.from(await result.arrayBuffer()));
  } catch {
    if (!response.headersSent) response.writeHead(500, { "Cache-Control": "no-store" });
    response.end();
  }
});
server.listen(port, host, () => {
  console.log(`拾日已在本机启动：${origin}/`);
  console.log("在 worker/.dev.vars 设置 API_BASE_URL、API_MODEL 和 API_KEY，保存后刷新浏览器即可。");
});

server.on("error", (error) => {
  if (error.code !== "EADDRINUSE") throw error;
  console.error(`本机地址 ${origin} 已被占用。请先关闭使用该地址的程序，再启动拾日。`);
  process.exitCode = 1;
});

export { server };

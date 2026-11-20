import { CAT_PROMPT } from "./cat-prompt.mjs";
import { completeModel } from "./model.mjs";

const MAX_MESSAGES = 11;
const MAX_USER_LENGTH = 1800;
const MAX_ASSISTANT_LENGTH = 4000;
const MAX_BODY_BYTES = 48 * 1024;

function json(data, status, headers) {
  return Response.json(data, { status, headers });
}

async function codeMatches(supplied, expected) {
  if (!supplied || supplied.length > 120) return false;
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([supplied, expected].map(async (code) =>
    new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(code)))));
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function readMessages(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  for (let part = await reader.read(); !part.done; part = await reader.read()) {
    bytes += part.value.byteLength;
    if (bytes > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(part.value, { stream: true });
  }
  const { messages } = JSON.parse(text + decoder.decode()) ?? {};
  if (!Array.isArray(messages) || !messages.length || messages.length > MAX_MESSAGES || messages.length % 2 === 0) return null;
  return messages.map((message, index) => {
    const role = index % 2 === 0 ? "user" : "assistant";
    const limit = role === "user" ? MAX_USER_LENGTH : MAX_ASSISTANT_LENGTH;
    if (message?.role !== role || typeof message.content !== "string" || message.content.length > limit || !message.content.trim()) {
      throw new Error("Invalid chat message");
    }
    return { role, content: message.content.trim() };
  });
}

export default {
  async fetch(request, env) {
    const headers = new Headers({ "Cache-Control": "no-store", "Vary": "Origin" });
    if (new URL(request.url).pathname !== "/api/chat") return json({ error: "路由不存在。" }, 404, headers);
    if (!env.WEB_ORIGIN || request.headers.get("Origin") !== env.WEB_ORIGIN) {
      return json({ error: "此网站无法访问聊天接口。" }, 403, headers);
    }
    headers.set("Access-Control-Allow-Origin", env.WEB_ORIGIN);
    if (request.method === "OPTIONS") {
      headers.set("Access-Control-Allow-Methods", "POST");
      headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== "POST") return json({ error: "请求方式不支持。" }, 405, headers);
    if (!env.MODEL_PROVIDER || !/^[!-~]{16,120}$/.test(env.CAT_ACCESS_CODE ?? "") || !env.CHAT_RATE_LIMIT) {
      return json({ error: "聊天服务还需要完成配置。" }, 503, headers);
    }

    const { success } = await env.CHAT_RATE_LIMIT.rate({ key: request.headers.get("CF-Connecting-IP") || "unknown" });
    if (!success) {
      headers.set("Retry-After", "60");
      return json({ error: "消息发得有点快，等一分钟再试。" }, 429, headers);
    }

    const authorization = request.headers.get("Authorization") ?? "";
    if (!authorization.startsWith("Bearer ") || !await codeMatches(authorization.slice(7), env.CAT_ACCESS_CODE)) {
      return json({ error: "聊天口令有误，请重新输入。" }, 401, headers);
    }
    if (request.headers.get("Content-Type")?.split(";")[0].trim() !== "application/json") {
      return json({ error: "请求格式有误。" }, 415, headers);
    }

    let messages;
    try {
      messages = await readMessages(request);
    } catch {
      return json({ error: "消息格式有误或内容过长。" }, 400, headers);
    }
    if (!messages) return json({ error: "消息格式有误或内容过长。" }, 400, headers);

    try {
      const answer = await completeModel(env.MODEL_PROVIDER, [{ role: "system", content: CAT_PROMPT }, ...messages], 450);
      if (!answer) return json({ error: "这次没有收到小猫的回复，请稍后再试。" }, 502, headers);
      const result = { reply: answer.slice(0, MAX_ASSISTANT_LENGTH) };
      if (typeof env.RECORD_CHAT === "function") {
        try {
          result.historySaved = await env.RECORD_CHAT(messages.at(-1).content, result.reply);
        } catch {
          result.historySaved = false;
        }
      }
      return json(result, 200, headers);
    } catch {
      return json({ error: "小猫暂时连不上 模型 API，请稍后再试。" }, 502, headers);
    }
  },
};

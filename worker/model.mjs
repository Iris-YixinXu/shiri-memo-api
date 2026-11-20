export function apiProvider(values) {
  if (!values.API_BASE_URL?.trim() || !values.API_MODEL?.trim()) return null;
  const url = new URL(values.API_BASE_URL.trim());
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
      url.username || url.password || url.search || url.hash) throw new Error("Invalid API endpoint");
  const key = values.API_KEY?.trim();
  if (!key && !local) return null;
  url.pathname = url.pathname.replace(/\/+$/, "");
  if (!url.pathname.endsWith("/chat/completions")) url.pathname += "/chat/completions";
  const tokenField = values.API_TOKEN_FIELD === "max_completion_tokens" ||
    (!values.API_TOKEN_FIELD && url.hostname === "api.openai.com") ? "max_completion_tokens" : "max_tokens";
  return { endpoint: url.href, key, model: values.API_MODEL.trim(), tokenField };
}

export async function completeModel(provider, messages, maxTokens, timeout = 24000) {
  const headers = { "Content-Type": "application/json" };
  if (provider.key) headers.Authorization = "Bearer " + provider.key;
  const body = { model: provider.model, messages, [provider.tokenField]: maxTokens };
  if (new URL(provider.endpoint).hostname === "api.deepseek.com") body.thinking = { type: "disabled" };
  const response = await fetch(provider.endpoint, {
    method: "POST", headers, body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout), redirect: "error",
  });
  if (!response.ok) return null;
  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() || null : null;
}

import { readFile, writeFile } from "node:fs/promises";
import { completeModel } from "./model.mjs";

export function createLocalQuote(quoteFile) {
  let pending;
  let lastAttempt = 0;

  return async function localQuote(key) {
    const date = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
    try {
      const saved = JSON.parse(await readFile(quoteFile, "utf8"));
      if (saved.date === date && typeof saved.quote === "string" && saved.quote.trim()) return saved;
    } catch {
      // Missing or incomplete cache is rebuilt on demand.
    }
    if (!key) return {};
    if (pending) return pending;
    if (Date.now() - lastAttempt < 10 * 60000) return {};
    lastAttempt = Date.now();
    pending = generateQuote(key, date, quoteFile);
    try {
      return await pending;
    } finally {
      pending = undefined;
    }
  };
}

async function generateQuote(key, date, quoteFile) {
  try {
    const quote = await completeModel(key, [
      { role: "system", content: "为中文手账网站写一句原创的每日寄语。像朋友留在便签上的一句话，具体自然，不用标题、引号或署名。只返回一行，15 到 45 个汉字。" },
      { role: "user", content: `今天是 ${date}，请写一句寄语。` },
    ], 96, 8000);
    if (!quote || quote.length > 100 || /[\r\n]/.test(quote)) return {};
    const daily = { date, quote };
    await writeFile(quoteFile, JSON.stringify(daily, null, 2) + "\n", "utf8");
    return daily;
  } catch {
    return {};
  }
}

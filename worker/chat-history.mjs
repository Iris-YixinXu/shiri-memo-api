import { randomUUID } from "node:crypto";
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { validDate } from "./local-data.mjs";

function localDate(date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((value, index) => String(value).padStart(index === 0 ? 4 : 2, "0")).join("-");
}

export function createLocalChatHistory(directory) {
  const file = join(directory, "chat-history.json");
  let pending = Promise.resolve();
  let lastCleared = 0;

  async function read() {
    try {
      const turns = JSON.parse(await readFile(file, "utf8"));
      if (!Array.isArray(turns) || turns.some((turn) => !validDate(turn?.date) ||
        typeof turn.time !== "string" || Number.isNaN(Date.parse(turn.time)) ||
        typeof turn.user !== "string" || typeof turn.assistant !== "string")) {
        throw new Error("Invalid chat history");
      }
      return turns;
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }

  async function write(turns) {
    const staged = join(directory, `chat-history-${randomUUID()}.tmp`);
    try {
      await writeFile(staged, JSON.stringify(turns, null, 2) + "\n", { flag: "wx" });
      await rename(staged, file);
    } catch (error) {
      await unlink(staged).catch(() => {});
      throw error;
    }
  }

  function queue(action) {
    const result = pending.then(action);
    pending = result.catch(() => {});
    return result;
  }

  function append(sentAt, user, assistant) {
    return queue(async () => {
      if (sentAt.getTime() <= lastCleared) return false;
      const turns = await read();
      turns.push({ date: localDate(sentAt), time: sentAt.toISOString(), user, assistant });
      turns.sort((left, right) => left.time.localeCompare(right.time));
      await write(turns);
      return true;
    });
  }

  function clear() {
    const clearedAt = Date.now();
    return queue(async () => {
      await write([]);
      lastCleared = clearedAt;
    });
  }

  return { read, append, clear };
}

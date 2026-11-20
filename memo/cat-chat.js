"use strict";

const catChatWindow = $("cat-chat-window");
const catChatForm = $("cat-chat-form");
const catChatLog = $("cat-chat-log");
const catChatInput = $("cat-chat-input");
const catChatCode = $("cat-chat-code");
const catChatGreeting = catChatLog.firstElementChild;
const catChatHistory = [];
const quickCatReplies = {
  hello: "喵喵，主人来啦。我在这儿陪你喵。",
  tired: "今天已经花了不少力气吧。先歇一会儿，喵。",
  idea: "挑一件两分钟能开始的小事就好。做一点也算前进喵。",
  hug: "蹭蹭，给你一个暖乎乎的小猫抱抱喵。",
};
const catChatLocal = location.hostname === "127.0.0.1" && CAT_CHAT_ENDPOINT === `${location.origin}/api/chat`;
let catChatUnlocked = catChatLocal;
let catChatSending = false;
let catHistoryLoading = false;

function chatEndpoint() {
  try {
    const url = new URL(CAT_CHAT_ENDPOINT);
    const local = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    if ((url.protocol === "https:" || local) && !url.username && !url.password) return url;
  } catch {
    // The public site can run before a chat endpoint is configured.
  }
  return null;
}

function setChatStatus(text) {
  const status = $("cat-chat-status");
  status.textContent = text;
  status.hidden = !text;
}

function appendChatMessage(role, content) {
  const bubble = element("p", `chat-message ${role}`, content);
  bubble.setAttribute("aria-label", role === "user" ? "你" : "小猫");
  catChatLog.append(bubble);
  catChatLog.scrollTop = catChatLog.scrollHeight;
  return bubble;
}

function setChatSending(sending) {
  catChatSending = sending;
  $("cat-chat-send").textContent = sending ? "小猫在想…" : "发送";
  $("cat-chat-send").disabled = $("cat-chat-clear").disabled = sending;
  catChatInput.readOnly = catChatCode.readOnly = sending;
}

function chatRequestBody(message) {
  const messages = [...catChatHistory.slice(-10), message];
  const encoder = new TextEncoder();
  let body = JSON.stringify({ messages });
  while (encoder.encode(body).length > 48 * 1024 && messages.length > 1) {
    messages.splice(0, 2);
    body = JSON.stringify({ messages });
  }
  return body;
}

async function sendChat(event) {
  event.preventDefault();
  if (catChatSending || catHistoryLoading) return;
  const endpoint = chatEndpoint();
  const content = catChatInput.value.trim();
  const accessCode = catChatCode.value.trim();
  if (!endpoint || !content) return;
  if (!catChatLocal && !/^[!-~]{16,120}$/.test(accessCode)) {
    setChatStatus("请输入站点管理员给你的聊天口令。");
    catChatCode.focus();
    return;
  }
  const message = { role: "user", content };
  const chatWeek = catChatLocal ? startOfWeek(dateKey(new Date())) : null;
  const bubble = appendChatMessage(message.role, message.content);
  setChatStatus("");
  setChatSending(true);
  catChatInput.value = "";
  try {
    const headers = { "Content-Type": "application/json" };
    if (!catChatLocal) headers.Authorization = `Bearer ${accessCode}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: chatRequestBody(message),
      signal: AbortSignal.timeout(28000),
      redirect: "error",
      cache: "no-store",
    });
    if (response.status === 401 && !catChatLocal) {
      catChatUnlocked = false;
      $("cat-code-field").hidden = false;
      catChatCode.value = "";
      throw new Error("聊天口令有误，请重新输入。");
    }
    let errorMessage = "小猫暂时连不上，请稍后再试。";
    if (response.status === 429) errorMessage = "消息发得有点快，等一分钟再试喵。";
    if (response.status === 503) errorMessage = "聊天服务还需要完成配置。";
    if (!response.ok) throw new Error(errorMessage);
    const { reply, historySaved } = await response.json();
    if (typeof reply !== "string" || !reply.trim()) throw new Error("这次没有收到小猫的回复，请再试一次。");
    catChatHistory.push(message, { role: "assistant", content: reply });
    appendChatMessage("assistant", reply);
    if (catChatLocal) {
      if (historySaved) invalidateWeekSummary(chatWeek);
      else setChatStatus("这条对话没有保存到本机，暂时无法用于周报。");
    }
    catChatUnlocked = true;
    $("cat-code-field").hidden = true;
  } catch (error) {
    bubble.remove();
    catChatInput.value = content;
    const knownError = error instanceof Error && !(error instanceof TypeError) &&
      !(error instanceof SyntaxError) && !(error instanceof DOMException);
    setChatStatus(knownError ? error.message : "小猫暂时连不上，请稍后再试。");
  } finally {
    setChatSending(false);
    if (catChatWindow.contains(document.activeElement)) (catChatUnlocked ? catChatInput : catChatCode).focus();
  }
}

const catChatEnabled = Boolean(chatEndpoint());
catChatForm.hidden = !catChatEnabled;
$("cat-quick-chat").hidden = catChatEnabled;
$("cat-chat-unavailable").hidden = catChatEnabled || !fileBacked;
$("cat-code-field").hidden = catChatUnlocked;

async function restoreCatChat() {
  catHistoryLoading = true;
  $("cat-chat-note").textContent = "对话保存在本机，生成周报时可使用。";
  $("cat-chat-send").disabled = $("cat-chat-clear").disabled = true;
  try {
    const response = await fetch("/api/chat-history");
    if (!response.ok) throw new Error();
    const { messages } = await response.json();
    catChatHistory.push(...messages);
    for (const message of messages) appendChatMessage(message.role, message.content);
  } catch {
    setChatStatus("暂时无法读取本机对话。");
  } finally {
    catHistoryLoading = false;
    $("cat-chat-send").disabled = $("cat-chat-clear").disabled = false;
  }
}

$("cat-quick-chat").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-chat-topic]");
  if (!button || !Object.hasOwn(quickCatReplies, button.dataset.chatTopic)) return;
  appendChatMessage("user", button.textContent);
  appendChatMessage("assistant", quickCatReplies[button.dataset.chatTopic]);
});
$("cat-chat-clear").addEventListener("click", async () => {
  if (catChatSending || catHistoryLoading) return;
  if (catChatLocal) {
    if (!window.confirm("清空本机保存的对话？之后生成的周报将无法使用这些对话。")) return;
    catHistoryLoading = true;
    $("cat-chat-send").disabled = $("cat-chat-clear").disabled = true;
    try {
      const response = await fetch("/api/chat-history", { method: "DELETE" });
      if (!response.ok) throw new Error();
      invalidateWeekSummary();
    } catch {
      setChatStatus("暂时无法清空本机对话，请稍后再试。");
      return;
    } finally {
      catHistoryLoading = false;
      $("cat-chat-send").disabled = $("cat-chat-clear").disabled = false;
    }
  }
  catChatHistory.length = 0;
  catChatLog.replaceChildren(catChatGreeting);
  catChatInput.value = "";
  setChatStatus("");
  catChatInput.focus();
});
catChatInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing || catChatSending) return;
  event.preventDefault();
  catChatForm.requestSubmit();
});
catChatForm.addEventListener("submit", sendChat);
if (catChatLocal) restoreCatChat();

"use strict";

const $ = (id) => document.getElementById(id);
const types = {
  deadline: "DDL",
  event: "活动",
  exam: "考试",
  idea: "灵感",
  journal: "日记",
  note: "备忘",
};
const drawings = {
  book: '<path d="M5 3h14v18H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm-1 15a2 2 0 0 1 2-2h13M8 7h7m-7 4h5"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19m0-14-1.5 1.5m-11 11L5 19"/>',
  cloud: '<path d="M6 18a4 4 0 0 1-.4-8A6 6 0 0 1 17 9a4.5 4.5 0 0 1 .5 9H6Z"/>',
  partly: '<path d="M5 13a4 4 0 1 1 6-5M7 2v2M2 5l1.5 1.5M2 11h1m8-7 1-1M8 20a3.5 3.5 0 0 1 0-7 5 5 0 0 1 9.5-1 4 4 0 0 1 .5 8Z"/>',
  moon: '<path d="M20.8 14.1A8.5 8.5 0 1 1 10 3.2a8 8 0 0 0 10.8 10.9ZM17 4v4m-2-2h4"/>',
  rain: '<path d="M6 15a4 4 0 0 1-.4-8A6 6 0 0 1 17 6a4.5 4.5 0 0 1 .5 9H6Zm2 3-1 3m5-3-1 3m5-3-1 3"/>',
  snow: '<path d="M12 3v18M4 7.5l16 9m0-9-16 9m5-12 3 3 3-3m-6 15 3-3 3 3M4 11l4-1-1-4m13 7-4 1 1 4m3-7-4-1 1-4M4 13l4 1-1 4"/>',
  fog: '<path d="M6 12a3.5 3.5 0 0 1 0-7 5 5 0 0 1 9.5-.5 3.8 3.8 0 0 1 2.5 7.5M3 16h18M6 20h12"/>',
  thunder: '<path d="M6 15a4 4 0 0 1-.4-8A6 6 0 0 1 17 6a4.5 4.5 0 0 1 .5 9H15m-5 0-2 4h4l-2 3"/>',
  flask: '<path d="M9 3h6m-5 0v7l-5 8a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-8V3M8 15h8"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4m8-4v4m-8 8h2m4 0h2"/>',
  left: '<path d="m15 5-7 7 7 7"/>',
  right: '<path d="m9 5 7 7-7 7"/>',
  sparkles: '<path d="M10 2l2.3 6.7L19 11l-6.7 2.3L10 20l-2.3-6.7L1 11l6.7-2.3L10 2Zm9 13v6m-3-3h6"/>',
  message: '<path d="M20 11a7 7 0 0 1-7 7H8l-4 3v-5a7 7 0 0 1 4-12h5a7 7 0 0 1 7 7Z"/><path d="M8 11h8"/>',
  list: '<path d="m3 6 1.5 1.5L7 5m-4 8 1.5 1.5L7 12m3-5h10m-10 7h10m-10 6h10"/>',
  star: '<path d="m12 3 2.6 5.6 6.1.8-4.5 4.3 1.2 6.2-5.4-3-5.4 3 1.2-6.2-4.5-4.3 6.1-.8L12 3Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  report: '<path d="M4 4v16h16M8 15v1m4-6v6m4-9v9m4-12v12"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  bulb: '<path d="M9 18h6m-5 3h4m-5-6c0-2-3-3-3-7a6 6 0 1 1 12 0c0 4-3 5-3 7H9Z"/>',
  heart: '<path d="M12 20 4.5 12.5A4.75 4.75 0 0 1 11 5.6l1 1 1-1a4.75 4.75 0 0 1 6.5 6.9L12 20Z"/>',
  photo: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m3 17 4-4 3 3 4-5 7 7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
};
const storageKey = "shiri.memo.v1";
const today = dateKey(new Date());
const currentWeek = startOfWeek(today);
const longDate = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
const shortDate = new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" });
const form = $("record-form");
const recordDialog = $("record-dialog");
const libraryDialog = $("library-dialog");
const editableTypes = new Set(["deadline", "event", "exam", "idea", "note"]);
const fileBacked = typeof SHIRI_FILE_STORAGE !== "undefined" && SHIRI_FILE_STORAGE;
let storageError = false;
let personal = readState();
const browserSnapshot = personal;
let storageRevision = null;
let notebookReady = !fileBacked;
let notebookSaving = false;
let example = exampleState();
let demo = personal === null && !storageError;
personal ??= emptyState();
let selected = today;
let month = today.slice(0, 7);
let week = currentWeek;
let editing = null;
let recordPhotos = [];
let toastTimer;
const weekSummaries = new Map();

function dateKey(date) {
  return [String(date.getFullYear()).padStart(4, "0"), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function parseDate(key) {
  return new Date(`${key}T12:00:00`);
}

function offsetDate(key, days) {
  const date = parseDate(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function daysUntil(start, end) {
  return Math.round((parseDate(end) - parseDate(start)) / 86400000);
}

function startOfWeek(key) {
  return offsetDate(key, -((parseDate(key).getDay() + 6) % 7));
}

function emptyState() {
  return { records: [], focus: {}, limit: 3 };
}

function readState() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) return null;
    const value = JSON.parse(raw);
    if (!Array.isArray(value.records) || !value.focus || !Number.isInteger(value.limit)) {
      throw new Error("Invalid memo state");
    }
    return value;
  } catch {
    storageError = true;
    return null;
  }
}

function exampleState() {
  const samples = [
    ["plan", "deadline", "提交项目阶段总结", offsetDate(today, 1), "梳理完成项和下一步计划。"],
    ["reading", "event", "傍晚的读书会", today, "带上这次读到一半的书。"],
    ["exam", "exam", "英语听力考试", today, "提前准备耳机和文具。"],
    ["idea", "idea", "给周末做一份散步地图", today, "把喜欢的书店和咖啡馆标在同一张地图上。"],
    ["journal", "journal", "在路上看到一棵金黄的树", today, "绕路走了一会儿，心情也慢慢放松下来。", "", "平静"],
    ["done", "note", "整理上周的读书笔记", today, "按主题整理并补上几句摘录。", today],
    ["idea-done", "idea", "做一张手账书签", currentWeek, "带一个能勾选阅读进度的小格子。", today],
    ["event-next", "event", "和朋友吃饭", offsetDate(today, 3), "地点待定。"],
    ["note-earlier", "note", "拍下晨光里的窗台", offsetDate(today, -2), "光落在杯沿上。"],
  ];
  return {
    records: samples.map(([id, type, title, date, body, done = "", mood = ""]) => ({ id, type, title, date, body, done, mood })),
    focus: { [today]: ["plan", "reading"] },
    limit: 3,
  };
}

function state() {
  return demo ? example : personal;
}

function notebookError(message) {
  if (recordDialog.open) {
    $("record-error").textContent = message;
    $("record-error").hidden = false;
  } else {
    showToast(message);
  }
}

async function localSnapshot(response) {
  if (!response.headers.get("Content-Type")?.includes("application/json")) {
    throw new Error("无法连接本机手账，请重新启动本机版。");
  }
  const snapshot = await response.json();
  if (!response.ok) throw new Error(snapshot.error ?? "暂时无法保存本机手账。");
  return snapshot;
}

async function saveLocalState(state, upload) {
  const snapshot = JSON.stringify({ state, revision: storageRevision, photoRecord: upload?.recordId });
  let options = { headers: { "Content-Type": "application/json" }, body: snapshot };
  if (upload?.files.length) {
    const body = new FormData();
    body.append("snapshot", snapshot);
    for (const file of upload.files) body.append("photo", file);
    options = { body };
  }
  return localSnapshot(await fetch("/api/records", { method: "PUT", ...options }));
}

async function updateState(next, inDemo = demo, upload) {
  if (!notebookReady || notebookSaving) {
    notebookError(notebookSaving ? "正在保存，请稍等。" : "本机手账尚未读入，请刷新后再试。");
    return false;
  }
  if (inDemo) {
    example = next;
  } else {
    notebookSaving = true;
    $("save-record").disabled = $("delete-record").disabled = true;
    try {
      if (fileBacked) {
        const saved = await saveLocalState(next, upload);
        personal = saved.state;
        storageRevision = saved.revision;
      } else {
        localStorage.setItem(storageKey, JSON.stringify(next));
        personal = next;
      }
    } catch (error) {
      notebookError(fileBacked ? (error instanceof TypeError ? "本机手账暂时无法连接，请重试。" : error.message) :
        "浏览器暂时无法保存记录，请检查站点存储设置。");
      return false;
    } finally {
      notebookSaving = false;
      $("save-record").disabled = $("delete-record").disabled = false;
    }
  }
  render();
  return true;
}

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function applyIcon(node, name) {
  node.dataset.icon = name;
  node.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${drawings[name]}</svg>`;
  return node;
}

function iconButton(icon, label, extraClass, action) {
  const button = applyIcon(element("button", `icon-button ${extraClass}`), icon);
  button.type = "button";
  button.setAttribute("aria-label", label);
  button.title = label;
  button.addEventListener("click", action);
  return button;
}

function typeMarker(type) {
  const marker = element("span", `marker type-${type}`);
  marker.setAttribute("aria-hidden", "true");
  return type === "idea" ? applyIcon(marker, "bulb") : marker;
}

function typeTag(type) {
  const node = element("span", `type-label type-${type}`);
  node.append(typeMarker(type), document.createTextNode(types[type]));
  return node;
}

function moveMonth(delta) {
  const date = parseDate(`${month}-01`);
  date.setMonth(date.getMonth() + delta);
  month = dateKey(date).slice(0, 7);
  renderCalendar();
}

function selectDate(key) {
  selected = key;
  month = key.slice(0, 7);
  week = startOfWeek(key);
  render();
}

function renderCalendar() {
  const start = `${month}-01`;
  const date = parseDate(start);
  $("month-title").textContent = `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
  const firstDay = offsetDate(start, -date.getDay());
  const dayTypes = new Map();
  for (const record of state().records) {
    if (!dayTypes.has(record.date)) dayTypes.set(record.date, new Set());
    dayTypes.get(record.date).add(record.type);
  }
  const buttons = [];
  for (let i = 0; i < 42; i++) {
    const key = offsetDate(firstDay, i);
    const button = element("button", "calendar-day", String(parseDate(key).getDate()));
    button.type = "button";
    if (!key.startsWith(month)) button.classList.add("outside");
    if (key === today) {
      button.classList.add("today");
      button.setAttribute("aria-current", "date");
    }
    const categories = Object.keys(types).filter((type) => dayTypes.get(key)?.has(type));
    const label = longDate.format(parseDate(key)) + (categories.length ? `，${categories.map((type) => types[type]).join("、")}` : "");
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", String(key === selected));
    const markers = element("span", "day-markers");
    markers.append(...categories.map(typeMarker));
    button.append(markers);
    button.addEventListener("click", () => {
      selectDate(key);
      $("date-grid").querySelector('[aria-pressed="true"]')?.focus();
    });
    buttons.push(button);
  }
  $("date-grid").replaceChildren(...buttons);
}

function focusIds() {
  return state().focus[selected] ?? [];
}

function toggleFocus(record) {
  const data = state();
  const ids = focusIds();
  if (!ids.includes(record.id) && ids.length >= data.limit) {
    showToast(`已选满 ${data.limit} 项，可以调整上限或取消一项。`);
    return;
  }
  const updated = ids.includes(record.id) ? ids.filter((id) => id !== record.id) : [...ids, record.id];
  updateState({ ...data, focus: { ...data.focus, [selected]: updated } });
}

function toggleDone(record) {
  const data = state();
  const changed = { ...record, done: record.done ? "" : dateKey(new Date()) };
  const records = data.records.map((item) => item.id === record.id ? changed : item);
  updateState({ ...data, records });
}

function urgency(date) {
  const days = daysUntil(selected, date);
  if (days < 0) return `逾期 ${Math.abs(days)} 天`;
  if (days === 0) return "当天截止";
  return `${days} 天后截止`;
}

function recordRow(record, urgent = false) {
  const row = element("div", "record-row");
  if (urgent) row.classList.add("urgent");
  if (record.done) row.classList.add("completed");
  if (editableTypes.has(record.type)) {
    const completion = iconButton("check", `${record.done ? "撤销完成" : record.type === "idea" ? "标为已实践" : "标为已完成"}：${record.title}`, "record-action complete-button", () => toggleDone(record));
    completion.setAttribute("aria-pressed", String(Boolean(record.done)));
    row.append(completion);
  }
  const main = element("button", "record-main");
  main.type = "button";
  main.addEventListener("click", () => openRecord(record));
  const meta = element("span", "record-meta");
  meta.append(typeTag(record.type), element("span", "", shortDate.format(parseDate(record.date))));
  if (urgent) meta.append(element("span", "urgent-time", urgency(record.date)));
  if (record.mood) meta.append(element("span", "", record.mood));
  if (record.photos?.length) meta.append(element("span", "", `${record.photos.length} 张照片`));
  main.append(element("span", "record-title", record.title), meta);
  row.append(main);
  if (editableTypes.has(record.type)) {
    const pinned = focusIds().includes(record.id);
    const focusButton = iconButton("star", `${pinned ? "取消重点" : "加入所选日期的重点事项"}：${record.title}`, "record-action", () => toggleFocus(record));
    focusButton.setAttribute("aria-pressed", String(pinned));
    row.append(focusButton);
  }
  return row;
}

function sortByDate(records) {
  return [...records].sort((a, b) => a.date.localeCompare(b.date));
}

function renderAgenda() {
  const data = state();
  $("agenda-title").textContent = selected === today ? "今日安排" : "当天安排";
  $("agenda-date").textContent = longDate.format(parseDate(selected));
  $("focus-limit").value = String(data.limit);

  const byId = new Map(data.records.map((record) => [record.id, record]));
  const focus = focusIds().map((id) => byId.get(id)).filter(Boolean);
  $("focus-list").replaceChildren(...(focus.length ? focus.map((record) => recordRow(record)) :
    [element("p", "empty-note", "点记录旁的星标，把它加入当天的重点。")]));

  const urgent = sortByDate(data.records.filter((record) => record.type === "deadline" && !record.done &&
    record.date <= offsetDate(selected, 7) && (record.date >= selected || selected === today)));
  $("urgent-section").hidden = urgent.length === 0;
  $("urgent-list").replaceChildren(...urgent.map((record) => recordRow(record, true)));
  const urgentIds = new Set(urgent.map((record) => record.id));
  const dayRecords = data.records.filter((record) => record.date === selected && !urgentIds.has(record.id));
  $("day-list").replaceChildren(...(dayRecords.length ? dayRecords.map((record) => recordRow(record)) :
    [element("p", "empty-note", urgent.some((record) => record.date === selected) ? "当天的截止任务已列在上方。" : "这一天还没有记录。")]));
}

function renderRecap(id, records, empty, status) {
  const items = records.map((record) => {
    const li = element("li");
    const button = element("button", "recap-item", record.title);
    button.type = "button";
    button.addEventListener("click", () => openRecord(record));
    li.append(button);
    if (status) {
      const label = status(record);
      if (label) li.append(element("span", "recap-state", label));
    }
    return li;
  });
  if (!items.length && empty) items.push(element("li", "", empty));
  $(id).replaceChildren(...items);
}

function renderWeekly() {
  const end = offsetDate(week, 6);
  const inWeek = (date) => date >= week && date <= end;
  const records = state().records;
  const completed = records.filter((record) => inWeek(record.done)).sort((a, b) => a.done.localeCompare(b.done));
  const ideas = sortByDate(records.filter((record) => record.type === "idea" && (inWeek(record.date) || inWeek(record.done))));
  const journals = sortByDate(records.filter((record) => record.type === "journal" && inWeek(record.date)));
  $("weekly-title").textContent = week === currentWeek ? "本周回顾" : "周回顾";
  $("week-range").textContent = `${shortDate.format(parseDate(week))} – ${shortDate.format(parseDate(end))}`;
  $("week-done").textContent = completed.length;
  $("week-ideas").textContent = ideas.filter((record) => inWeek(record.date)).length;
  $("week-journals").textContent = journals.length;
  renderRecap("week-completed-list", completed, "这周还没有标记完成的事。", (record) => shortDate.format(parseDate(record.done)));
  renderRecap("week-idea-list", ideas, "这周还没有记录或实践灵感。", (record) => record.done ? "已实践" : "待实践");
  const moods = new Map();
  for (const { mood } of journals) {
    if (mood) moods.set(mood, (moods.get(mood) ?? 0) + 1);
  }
  $("week-mood").textContent = moods.size ? [...moods].map(([mood, count]) => `${mood} ${count} 次`).join(" · ") :
    (journals.length ? "这周的日记还没有选择心情。" : "这周还没有日记。");
  renderRecap("week-journal-list", journals, "", (record) => record.mood);
  if (fileBacked) {
    renderWeekSummary();
    renderWeeklyPhotos(sortByDate(records.filter((record) => inWeek(record.date) && record.photos?.length)));
  }
}

function renderWeekSummary() {
  const enabled = Boolean(CAT_CHAT_ENDPOINT);
  const state = weekSummaries.get(week);
  const current = state?.revision === storageRevision ? state : undefined;
  const summary = !demo ? current?.summary : "";
  const button = $("generate-week-summary");
  const text = $("week-summary-text");
  const status = $("week-summary-status");
  $("week-summary").hidden = false;
  $("week-summary-range").textContent = $("week-range").textContent;
  button.disabled = Boolean(demo || !notebookReady || !enabled || state?.busy);
  button.textContent = state?.busy ? "小猫在写…" : summary ? "重新生成" : "让小猫总结";
  text.textContent = summary ?? "";
  text.hidden = !summary;
  status.textContent = !enabled ? "填好本机的 模型 API 后即可生成。" :
    demo ? "退出示例后，可以用自己的记录生成小结。" :
    current?.error ?? (summary ? "" : "点击后会发送所选周的对话摘录、事项标题、日期、状态和心情统计。");
  status.hidden = !status.textContent;
}

async function askForWeekSummary() {
  if (!fileBacked || !notebookReady || notebookSaving || demo || !CAT_CHAT_ENDPOINT) return;
  const start = week;
  const previous = weekSummaries.get(start);
  if (previous?.busy) return;
  const priorText = previous?.revision === storageRevision ? previous.summary : undefined;
  const revision = storageRevision;
  const pending = { busy: true, revision, summary: priorText };
  weekSummaries.set(start, pending);
  renderWeekSummary();
  try {
    const result = await localSnapshot(await fetch(`/api/week-summary?week=${encodeURIComponent(start)}`, { method: "POST" }));
    if (weekSummaries.get(start) !== pending) return;
    if (result.revision === storageRevision) {
      weekSummaries.set(start, { revision: result.revision, summary: result.summary });
    } else {
      weekSummaries.set(start, { revision: storageRevision, error: "记录刚刚有变动。请刷新手账后重新生成。" });
    }
  } catch (error) {
    if (weekSummaries.get(start) !== pending) return;
    const message = error instanceof TypeError ? "暂时无法连接本机小猫，请再试一次。" : error.message;
    weekSummaries.set(start, { revision, summary: priorText, error: message });
  }
  renderWeekSummary();
}

function invalidateWeekSummary(start) {
  if (start) weekSummaries.delete(start);
  else weekSummaries.clear();
  if (fileBacked) renderWeekSummary();
}

function photoTile(photo, description) {
  const tile = element("figure", "photo-tile");
  const fullSize = element("a");
  fullSize.href = `/api/photos/${encodeURIComponent(photo.date)}/${encodeURIComponent(photo.file)}`;
  fullSize.target = "_blank";
  fullSize.rel = "noopener";
  const thumbnail = element("img");
  thumbnail.src = fullSize.href;
  thumbnail.alt = description;
  thumbnail.loading = "lazy";
  fullSize.append(thumbnail);
  tile.append(fullSize);
  return tile;
}

function renderWeeklyPhotos(records) {
  $("week-photo-section").hidden = false;
  const photos = records.flatMap((record) => record.photos.map((photo) => {
    const tile = photoTile(photo, record.title);
    const description = element("figcaption", "", `${shortDate.format(parseDate(record.date))} · `);
    const entry = element("button", "text-button", record.title);
    entry.type = "button";
    entry.addEventListener("click", () => openRecord(record));
    description.append(entry);
    tile.append(description);
    return tile;
  }));
  $("week-photos").replaceChildren(...(photos.length ? photos : [element("p", "empty-note", "这周还没有照片。")]));
}

function renderRecordPhotos() {
  const tiles = recordPhotos.map((photo) => {
    const tile = photoTile(photo, photo.name);
    const description = element("figcaption");
    const remove = element("button", "text-button", "移除");
    remove.type = "button";
    remove.setAttribute("aria-label", `移除照片 ${photo.name}`);
    remove.addEventListener("click", () => {
      if (notebookSaving) return;
      recordPhotos = recordPhotos.filter((item) => item.file !== photo.file);
      renderRecordPhotos();
    });
    description.append(remove);
    tile.append(description);
    return tile;
  });
  $("record-photo-list").replaceChildren(...tiles);
}

function renderLibrary() {
  const query = $("library-query").value.trim().toLocaleLowerCase();
  const category = $("library-type").value;
  const records = sortByDate(state().records).reverse().filter((record) =>
    (!category || category === record.type) && `${record.title}\n${record.body}`.toLocaleLowerCase().includes(query));
  $("library-list").replaceChildren(...(records.length ? records.map((record) => recordRow(record)) :
    [element("p", "empty-note", "没有找到符合条件的记录。")]));
}

function render() {
  $("sample-status").hidden = !demo;
  $("demo-toggle").textContent = demo ? "退出示例" : "查看示例";
  renderCalendar();
  renderAgenda();
  renderWeekly();
  if (libraryDialog.open) renderLibrary();
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3300);
}

function updateRecordFields() {
  const category = form.elements.type.value;
  const isJournal = category === "journal";
  $("mood-field").hidden = !isJournal;
  $("record-mood").disabled = !isJournal;
  const dateLabels = { deadline: "截止日期", event: "活动日期", exam: "考试日期" };
  $("record-date-label").textContent = dateLabels[category] ?? "记录日期";
}

function openRecord(record = null, defaultDate = selected) {
  if (!notebookReady) {
    notebookError("本机手账尚未读入，请刷新后再试。");
    return;
  }
  editing = record;
  recordPhotos = record?.photos ?? [];
  form.reset();
  form.elements.title.setCustomValidity("");
  $("record-title").textContent = record ? (demo ? "编辑示例记录" : "编辑记录") : "新建记录";
  $("record-note").hidden = Boolean(record) || !demo;
  $("record-error").hidden = true;
  form.elements.title.value = record?.title ?? "";
  form.elements.type.value = record?.type ?? "note";
  form.elements.date.value = record?.date ?? defaultDate;
  form.elements.body.value = record?.body ?? "";
  form.elements.mood.value = record?.mood ?? "";
  $("delete-record").hidden = record === null;
  $("record-photo-section").hidden = !fileBacked || Boolean(record && demo);
  renderRecordPhotos();
  updateRecordFields();
  recordDialog.showModal();
}

async function saveRecord(event) {
  event.preventDefault();
  if (notebookSaving) return;
  $("record-error").hidden = true;
  const title = form.elements.title.value.trim();
  if (!title) {
    form.elements.title.setCustomValidity("请输入标题。");
    form.elements.title.reportValidity();
    return;
  }
  const type = form.elements.type.value;
  const record = {
    id: editing?.id ?? Array.from(crypto.getRandomValues(new Uint32Array(4)), (part) => part.toString(16).padStart(8, "0")).join(""),
    title,
    type,
    date: form.elements.date.value,
    body: form.elements.body.value,
    done: editableTypes.has(type) ? (editing?.done ?? "") : "",
    mood: type === "journal" ? form.elements.mood.value : "",
  };
  const inDemo = Boolean(demo && editing);
  const files = fileBacked && !inDemo ? Array.from($("record-photos").files) : [];
  if (files.length + recordPhotos.length > 6 || files.some((file) => !file.size || file.size > 10 * 1024 * 1024)) {
    notebookError("每条记录最多 6 张照片，每张最多 10 MB。");
    return;
  }
  if (fileBacked && !inDemo) record.photos = recordPhotos;
  const data = inDemo ? example : personal;
  const records = editing ? data.records.map((item) => item.id === record.id ? record : item) : [...data.records, record];
  const focus = editableTypes.has(type) ? data.focus : removeFocus(data.focus, record.id);
  if (!await updateState({ ...data, records, focus }, inDemo, { files, recordId: record.id })) return;
  demo = inDemo;
  recordDialog.close();
  selectDate(record.date);
  showToast(inDemo ? "示例已更新。" : fileBacked ? "已保存到本机手账。" : "记录已保存在此浏览器。");
}

function removeFocus(focus, id) {
  return Object.fromEntries(Object.entries(focus).map(([key, ids]) => [key, ids.filter((item) => item !== id)]));
}

async function deleteRecord() {
  if (!editing || notebookSaving) return;
  const warning = editing.photos?.length ? "及其照片" : "";
  if (!window.confirm(`删除「${editing.title}」${warning}？`)) return;
  const data = state();
  const records = data.records.filter((record) => record.id !== editing.id);
  if (!await updateState({ ...data, records, focus: removeFocus(data.focus, editing.id) })) return;
  recordDialog.close();
  showToast("已删除记录。");
}

for (const node of document.querySelectorAll("[data-icon]")) applyIcon(node, node.dataset.icon);
for (const [type, label] of Object.entries(types)) {
  const legend = element("span", "legend-item");
  legend.append(typeMarker(type), document.createTextNode(label));
  $("calendar-legend").append(legend);
  $("record-type").add(new Option(label, type));
  $("library-type").add(new Option(label, type));
}
$("today-label").textContent = longDate.format(parseDate(today));
$("previous-month").addEventListener("click", () => moveMonth(-1));
$("next-month").addEventListener("click", () => moveMonth(1));
$("back-today").addEventListener("click", () => selectDate(today));
$("previous-week").addEventListener("click", () => { week = offsetDate(week, -7); renderWeekly(); });
$("next-week").addEventListener("click", () => { week = offsetDate(week, 7); renderWeekly(); });
$("new-record").addEventListener("click", () => openRecord());
$("agenda-add").addEventListener("click", () => openRecord());
$("record-close").addEventListener("click", () => { if (!notebookSaving) recordDialog.close(); });
$("cancel-record").addEventListener("click", () => { if (!notebookSaving) recordDialog.close(); });
recordDialog.addEventListener("cancel", (event) => { if (notebookSaving) event.preventDefault(); });
$("add-week-photo").addEventListener("click", () => {
  const day = startOfWeek(selected) === week ? selected : week;
  openRecord(null, day);
});
$("generate-week-summary").addEventListener("click", askForWeekSummary);
$("delete-record").addEventListener("click", deleteRecord);
$("record-type").addEventListener("change", updateRecordFields);
form.elements.title.addEventListener("input", () => form.elements.title.setCustomValidity(""));
form.addEventListener("submit", saveRecord);
$("all-records").addEventListener("click", () => { renderLibrary(); libraryDialog.showModal(); });
$("library-close").addEventListener("click", () => libraryDialog.close());
$("library-query").addEventListener("input", renderLibrary);
$("library-type").addEventListener("change", renderLibrary);
$("demo-toggle").addEventListener("click", async () => {
  if (demo) {
    if (!await updateState(personal, false)) return;
    demo = false;
  } else {
    demo = true;
  }
  selectDate(today);
});
$("focus-limit").addEventListener("change", async (event) => {
  const input = event.target;
  const limit = Number(input.value);
  const data = state();
  if (Object.values(data.focus).some((ids) => ids.length > limit)) {
    input.value = String(data.limit);
    showToast("还有日期超过新上限，请先取消多余的星标。");
    return;
  }
  if (!await updateState({ ...data, limit })) input.value = String(data.limit);
});

async function initializeNotebook() {
  if (fileBacked) {
    $("storage-label").textContent = "存入本机文件";
    try {
      let snapshot = await localSnapshot(await fetch("/api/records"));
      storageRevision = snapshot.revision;
      if (!snapshot.state && browserSnapshot) snapshot = await saveLocalState(browserSnapshot);
      if (snapshot.state) {
        personal = snapshot.state;
        demo = false;
      }
      storageRevision = snapshot.revision;
      notebookReady = true;
    } catch (error) {
      notebookError(error instanceof TypeError ? "暂时无法连接本机手账。" : error.message);
    }
  } else if (storageError) {
    showToast("暂时无法读取此浏览器中的记录。");
  }
  render();
}

initializeNotebook();
startCat($("cat-art"), $("cat-trigger"));
if (fileBacked) startWeekCat($("week-cat-portrait"));

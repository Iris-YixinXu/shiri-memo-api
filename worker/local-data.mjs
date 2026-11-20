import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_JSON_BYTES = 10 * 1024 * 1024;
const TYPES = new Set(["deadline", "event", "exam", "idea", "journal", "note"]);
const photoFile = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.(jpg|png|webp|gif)$/;
const recordId = /^[a-zA-Z0-9-]{1,64}$/;
const MIME = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

class StorageError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validString(value, length) {
  return typeof value === "string" && value.length <= length;
}

function checkState(state) {
  const invalid = () => { throw new StorageError("记录或计划格式有误。"); };
  if (!Array.isArray(state?.records) || !state.focus || Array.isArray(state.focus) ||
    typeof state.focus !== "object" || !Number.isInteger(state.limit) || state.limit < 1 || state.limit > 10) invalid();
  const ids = new Set();
  for (const record of state.records) {
    if (typeof record?.id !== "string" || !recordId.test(record.id) || ids.has(record.id) ||
      !TYPES.has(record.type) || !validDate(record.date) || !validString(record.title, 100) || !record.title.trim() ||
      !validString(record.body, 20000) || (record.done !== "" && !validDate(record.done)) ||
      !validString(record.mood, 30)) invalid();
    ids.add(record.id);
    if (record.photos !== undefined &&
      (!Array.isArray(record.photos) || record.photos.length > MAX_IMAGES ||
        record.photos.some((photo) => typeof photo?.file !== "string" || !photoFile.test(photo.file)))) invalid();
  }
  for (const [date, focused] of Object.entries(state.focus)) {
    if (!validDate(date) || !Array.isArray(focused) || focused.length > 10 ||
      focused.some((id) => typeof id !== "string" || !recordId.test(id))) invalid();
  }
}

async function boundedBody(request, limit) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    bytes += chunk.length;
    if (bytes > limit) throw new StorageError("这次保存的文件太大。每张照片最多 10 MB。", 413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, bytes);
}

async function readPayload(request) {
  const type = request.headers["content-type"] ?? "";
  if (type.startsWith("application/json")) {
    return { payload: JSON.parse(await boundedBody(request, MAX_JSON_BYTES)), photos: [] };
  }
  if (!type.startsWith("multipart/form-data;")) throw new StorageError("无法识别保存格式。", 415);
  const data = await boundedBody(request, MAX_IMAGES * MAX_IMAGE_BYTES + MAX_JSON_BYTES + 64 * 1024);
  const form = await new Response(data, { headers: { "Content-Type": type } }).formData();
  const snapshot = form.get("snapshot");
  if (typeof snapshot !== "string" || Buffer.byteLength(snapshot) > MAX_JSON_BYTES) {
    throw new StorageError("记录文件太大。", 413);
  }
  return { payload: JSON.parse(snapshot), photos: form.getAll("photo") };
}

function imageExtension(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6))) return "gif";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

async function preparePhotos(files, date) {
  return Promise.all(files.map(async (file) => {
    if (!(file instanceof File) || !file.size || file.size > MAX_IMAGE_BYTES) {
      throw new StorageError("每张照片最多 10 MB，且必须包含图像。", 413);
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const extension = imageExtension(bytes);
    if (!extension) throw new StorageError("请选择 JPG、PNG、WebP 或 GIF 图片。");
    return {
      photo: { file: `${randomUUID()}.${extension}`, date, name: file.name.slice(0, 200) || "照片" },
      bytes,
    };
  }));
}

export function createLocalDataStore(directory) {
  const images = join(directory, "images");
  const recordsPath = join(directory, "records.json");
  const imagePath = (photo) => join(images, photo.date, photo.file);
  let pendingWrite = Promise.resolve();

  async function read() {
    try {
      const bytes = await readFile(recordsPath);
      try {
        const state = JSON.parse(bytes);
        checkState(state);
        if (state.records.some((record) => record.photos?.some((photo) =>
          !validDate(photo.date) || photo.date !== record.date || !validString(photo.name, 200)))) {
          throw new Error("Invalid photo metadata");
        }
        return { state, revision: createHash("sha256").update(bytes).digest("hex") };
      } catch {
        throw new StorageError("records.json 的格式有误，请先检查文件。", 500);
      }
    } catch (error) {
      if (error.code === "ENOENT") return { state: null, revision: null };
      throw error;
    }
  }

  async function persist({ state, revision, photoRecord }, files) {
    checkState(state);
    const previous = await read();
    if (revision !== previous.revision) {
      throw new StorageError("手账已在其他页面更新。请刷新后再保存。", 409);
    }
    if (files.length > MAX_IMAGES) throw new StorageError("每条记录最多可以添加 6 张照片。");
    const target = files.length ? state.records.find((record) => record.id === photoRecord) : undefined;
    if (files.length && !target) throw new StorageError("请为照片选择一条记录。");
    if (target && (target.photos?.length ?? 0) + files.length > MAX_IMAGES) {
      throw new StorageError("每条记录最多可以添加 6 张照片。");
    }
    const uploads = target ? await preparePhotos(files, target.date) : [];
    const oldRecordsById = new Map((previous.state?.records ?? []).map((record) => [record.id, record]));
    const oldFiles = new Set([...oldRecordsById.values()].flatMap((record) => (record.photos ?? []).map(imagePath)));
    const newFiles = new Set();
    const moves = [];
    for (const record of state.records) {
      const oldPhotos = new Map((oldRecordsById.get(record.id)?.photos ?? []).map((photo) => [photo.file, photo]));
      const kept = [];
      for (const entry of record.photos ?? []) {
        const old = oldPhotos.get(entry.file);
        if (!old) throw new StorageError("照片与记录不匹配。请刷新后重试。");
        oldPhotos.delete(entry.file);
        const photo = { ...old, date: record.date };
        if (old.date !== photo.date) moves.push({ old, photo });
        kept.push(photo);
      }
      if (record === target) kept.push(...uploads.map(({ photo }) => photo));
      for (const photo of kept) newFiles.add(imagePath(photo));
      if (kept.length) record.photos = kept;
      else delete record.photos;
    }

    const created = [];
    const staged = join(directory, `records-${randomUUID()}.tmp`);
    const bytes = Buffer.from(JSON.stringify(state, null, 2) + "\n");
    if (bytes.length > MAX_JSON_BYTES) throw new StorageError("记录文件太大。", 413);
    async function writePhoto(photo, saveFile) {
      const file = imagePath(photo);
      const temporary = `${file}.${randomUUID()}.tmp`;
      await mkdir(join(images, photo.date), { recursive: true });
      created.push(temporary);
      await saveFile(temporary);
      await rename(temporary, file);
      created.push(file);
    }
    try {
      await mkdir(images, { recursive: true });
      for (const { old, photo } of moves) {
        await writePhoto(photo, (path) => copyFile(imagePath(old), path, constants.COPYFILE_EXCL));
      }
      for (const { photo, bytes } of uploads) {
        await writePhoto(photo, (path) => writeFile(path, bytes, { flag: "wx" }));
      }
      await writeFile(staged, bytes, { flag: "wx" });
      await rename(staged, recordsPath);
    } catch (error) {
      await Promise.allSettled([...created, staged].map((path) => unlink(path)));
      throw error;
    }
    await Promise.allSettled([...oldFiles].filter((path) => !newFiles.has(path)).map((path) => unlink(path)));
    return { state, revision: createHash("sha256").update(bytes).digest("hex") };
  }

  async function records(request) {
    try {
      if (request.method === "GET") return Response.json(await read());
      if (request.method !== "PUT") return new Response(null, { status: 405 });
      const { payload, photos } = await readPayload(request);
      if (!payload || typeof payload !== "object") throw new StorageError("无法读取要保存的记录。");
      const save = pendingWrite.then(() => persist(payload, photos));
      pendingWrite = save.catch(() => {});
      return Response.json(await save);
    } catch (error) {
      if (error instanceof StorageError) return Response.json({ error: error.message }, { status: error.status });
      if (error instanceof SyntaxError) return Response.json({ error: "无法读取要保存的记录。" }, { status: 400 });
      return Response.json({ error: "暂时无法读写本机手账文件，请检查 data 目录权限。" }, { status: 500 });
    }
  }

  async function photo(date, file) {
    if (!validDate(date) || !photoFile.test(file)) return new Response(null, { status: 404 });
    try {
      const bytes = await readFile(imagePath({ date, file }));
      return new Response(bytes, { headers: { "Content-Type": MIME[file.split(".").at(-1)] } });
    } catch (error) {
      if (error.code === "ENOENT") return new Response(null, { status: 404 });
      throw error;
    }
  }

  return { read, records, photo, prepare: () => mkdir(images, { recursive: true }) };
}

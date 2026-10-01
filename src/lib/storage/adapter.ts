// Pluggable file storage (STORAGE_DRIVER). Only `local` exists today: files
// go under STORAGE_LOCAL_DIR (on serverless hosts point it at /tmp, which is
// temporary). s3 / azure / supabase drivers implement the same interface.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface StorageAdapter {
  put(name: string, bytes: Uint8Array): Promise<string>;
  get(key: string): Promise<Uint8Array | null>;
}

// The directory comes from the environment at runtime, so tell the bundler
// not to trace it (otherwise it ships the whole project with the server).
const localDir = () => path.resolve(/*turbopackIgnore: true*/ process.env.STORAGE_LOCAL_DIR ?? "./.storage");

const local: StorageAdapter = {
  async put(name, bytes) {
    const safe = name.replace(/[^\w.\-א-ת]+/g, "_").slice(-80);
    const key = `${randomUUID()}-${safe}`;
    await mkdir(/*turbopackIgnore: true*/ localDir(), { recursive: true });
    await writeFile(/*turbopackIgnore: true*/ path.join(localDir(), key), bytes);
    return key;
  },
  async get(key) {
    if (key.includes("..") || key.includes("/") || key.includes("\\")) return null;
    try {
      return new Uint8Array(await readFile(/*turbopackIgnore: true*/ path.join(localDir(), key)));
    } catch {
      return null;
    }
  },
};

export function storage(): StorageAdapter {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver !== "local") console.warn(`[storage] STORAGE_DRIVER=${driver} is not implemented; using local.`);
  return local;
}

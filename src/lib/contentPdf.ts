import type { ContentRemoval, ContentTarget } from "./contentTypes";
let worker: Worker | undefined;
let ready = false;
let sequence = 0;
const pending = new Map<
  number,
  {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timer: number;
  }
>();
let queue: {
  id: number;
  operation: "read" | "erase" | "preview";
  bytes: ArrayBuffer;
  page: number;
  removals: ContentRemoval[];
}[] = [];
function request(
  operation: "read" | "erase" | "preview",
  bytes: ArrayBuffer,
  page: number,
  removals: ContentRemoval[] = [],
): Promise<unknown> {
  if (!worker) {
    ready = false;
    worker = new Worker(new URL("./content.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = ({ data }) => {
      if (data.ready) {
        ready = true;
        for (const message of queue)
          worker!.postMessage(message, [message.bytes]);
        queue = [];
        return;
      }
      const task = pending.get(data.id);
      pending.delete(data.id);
      if (task) window.clearTimeout(task.timer);
      if (data.error) task?.reject(new Error(data.error));
      else task?.resolve(data.result);
    };
    worker.onerror = () => {
      for (const task of pending.values()) {
        window.clearTimeout(task.timer);
        task.reject(new Error("Yerel PDF düzenleme motoru yüklenemedi."));
      }
      pending.clear();
      queue = [];
      worker?.terminate();
      worker = undefined;
      ready = false;
    };
  }
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      for (const task of pending.values()) {
        window.clearTimeout(task.timer);
        task.reject(
          new Error(
            "PDF içerik işlemi zaman aşımına uğradı. Orijinal belge korundu.",
          ),
        );
      }
      pending.clear();
      queue = [];
      worker?.terminate();
      worker = undefined;
      ready = false;
    }, 120000);
    pending.set(id, { resolve, reject, timer });
    const message = { id, operation, bytes, page, removals };
    if (ready) worker!.postMessage(message, [bytes]);
    else queue.push(message);
  });
}
export async function readContent(file: File, page: number) {
  return (await request(
    "read",
    await file.arrayBuffer(),
    page - 1,
  )) as ContentTarget[];
}
export async function eraseContent(
  bytes: ArrayBuffer,
  page: number,
  removals: ContentRemoval[],
) {
  return (await request(
    "erase",
    bytes,
    page - 1,
    removals,
  )) as Uint8Array<ArrayBuffer>;
}

export async function contentPreview(
  bytes: ArrayBuffer,
  page: number,
  removals: ContentRemoval[],
) {
  return (await request(
    "preview",
    bytes,
    page - 1,
    removals,
  )) as Uint8Array<ArrayBuffer>;
}

import { mergeCapturedPost, postMatchesKeyword, prunePosts } from "./posts";
import type { CapturedPost, LoggerSettings, QueryPostsRequest } from "./types";

// Preserve the pre-rename database so early local installs keep their captured posts.
const DB_NAME = "x-visible-post-logger";
const DB_VERSION = 1;
const POSTS_STORE = "posts";

let openPromise: Promise<IDBDatabase> | undefined;

export async function saveCapturedPost(post: CapturedPost, settings: LoggerSettings): Promise<CapturedPost> {
  const db = await openDatabase();
  const tx = db.transaction(POSTS_STORE, "readwrite");
  const done = transactionDone(tx);
  const store = tx.objectStore(POSTS_STORE);
  const existing = await requestToPromise<CapturedPost | undefined>(store.get(post.key));
  const merged = mergeCapturedPost(existing, post);

  await requestToPromise(store.put(merged));
  await done;
  await cleanupPosts(settings);

  return merged;
}

export async function queryPosts(query: QueryPostsRequest = {}): Promise<CapturedPost[]> {
  const db = await openDatabase();
  const tx = db.transaction(POSTS_STORE, "readonly");
  const done = transactionDone(tx);
  const store = tx.objectStore(POSTS_STORE);
  const posts = await requestToPromise<CapturedPost[]>(store.getAll());
  await done;

  const from = query.from ?? Number.NEGATIVE_INFINITY;
  const to = query.to ?? Number.POSITIVE_INFINITY;
  const keyword = query.keyword?.trim() ?? "";
  const handle = query.handle?.trim().toLowerCase() ?? "";
  const limit = query.limit ?? 200;

  return posts
    .filter((post) => post.lastSeenAt >= from && post.lastSeenAt <= to)
    .filter((post) => !keyword || postMatchesKeyword(post, keyword))
    .filter((post) => !handle || (post.handle ?? "").toLowerCase().includes(handle))
    .sort((left, right) => right.lastSeenAt - left.lastSeenAt)
    .slice(0, Math.max(0, limit));
}

export async function clearPosts(): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(POSTS_STORE, "readwrite");
  const done = transactionDone(tx);
  tx.objectStore(POSTS_STORE).clear();
  await done;
}

export async function getPostCount(): Promise<number> {
  const db = await openDatabase();
  const tx = db.transaction(POSTS_STORE, "readonly");
  const done = transactionDone(tx);
  const count = await requestToPromise<number>(tx.objectStore(POSTS_STORE).count());
  await done;
  return count;
}

export async function cleanupPosts(settings: LoggerSettings): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(POSTS_STORE, "readwrite");
  const done = transactionDone(tx);
  const store = tx.objectStore(POSTS_STORE);
  const posts = await requestToPromise<CapturedPost[]>(store.getAll());
  const keep = new Set(
    prunePosts(posts, {
      now: Date.now(),
      retentionHours: settings.retentionHours,
      maxEntries: settings.maxEntries
    }).map((post) => post.key)
  );

  await Promise.all(
    posts
      .filter((post) => !keep.has(post.key))
      .map((post) => requestToPromise(store.delete(post.key)))
  );
  await done;
}

function openDatabase(): Promise<IDBDatabase> {
  if (openPromise) return openPromise;

  openPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(POSTS_STORE)) {
        const store = db.createObjectStore(POSTS_STORE, { keyPath: "key" });
        store.createIndex("lastSeenAt", "lastSeenAt", { unique: false });
        store.createIndex("handle", "handle", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
  });

  return openPromise;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
  });
}

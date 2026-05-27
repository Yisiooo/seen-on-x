import type { CapturedPost } from "./types";

export type PruneOptions = {
  now: number;
  retentionHours: number;
  maxEntries: number;
};

export function mergeCapturedPost(existing: CapturedPost | undefined, incoming: CapturedPost): CapturedPost {
  if (!existing) return incoming;

  return {
    ...existing,
    statusId: incoming.statusId ?? existing.statusId,
    authorName: incoming.authorName ?? existing.authorName,
    handle: incoming.handle ?? existing.handle,
    text: incoming.text || existing.text,
    postUrl: incoming.postUrl ?? existing.postUrl,
    sourceUrl: incoming.sourceUrl || existing.sourceUrl,
    firstSeenAt: Math.min(existing.firstSeenAt, incoming.firstSeenAt),
    lastSeenAt: Math.max(existing.lastSeenAt, incoming.lastSeenAt),
    seenCount: existing.seenCount + 1
  };
}

export function prunePosts(posts: CapturedPost[], options: PruneOptions): CapturedPost[] {
  const cutoff = options.now - options.retentionHours * 60 * 60 * 1_000;

  return posts
    .filter((post) => post.lastSeenAt >= cutoff)
    .sort((left, right) => right.lastSeenAt - left.lastSeenAt)
    .slice(0, Math.max(0, options.maxEntries));
}

export function postMatchesKeyword(post: CapturedPost, keyword: string): boolean {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return true;

  return [post.text, post.authorName, post.handle, post.postUrl]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(normalizedKeyword));
}

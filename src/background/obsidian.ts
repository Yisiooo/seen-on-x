import type { CapturedPost } from "../shared/types";

export const DEFAULT_OBSIDIAN_ENDPOINT = "http://127.0.0.1:8766";
export const DEFAULT_OBSIDIAN_VAULT = "vault4ob";

export type SavePostOptions = {
  endpoint?: string;
  fetchImpl?: typeof fetch;
  openUri?: (uri: string) => void | Promise<void>;
  vaultName?: string;
};

export async function savePostToObsidian(post: CapturedPost, options: SavePostOptions = {}): Promise<unknown> {
  const endpoint = (options.endpoint ?? DEFAULT_OBSIDIAN_ENDPOINT).replace(/\/+$/, "");
  const fetchImpl = options.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(`${endpoint}/x-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post)
    });
  } catch (error) {
    return savePostViaObsidianUri(post, options);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.error === "string" ? data.error : `Obsidian service returned ${response.status}`;
    throw new Error(message);
  }
  return data;
}

export async function savePostViaObsidianUri(post: CapturedPost, options: SavePostOptions = {}): Promise<unknown> {
  const relPath = buildXPostRelPath(post);
  const uri = buildObsidianNewUri(post, { vaultName: options.vaultName, relPath });
  const openUri = options.openUri ?? openExternalUri;
  await openUri(uri);
  return {
    saved: true,
    method: "obsidian-uri",
    relPath
  };
}

export function buildObsidianNewUri(
  post: CapturedPost,
  options: { vaultName?: string; relPath?: string } = {}
): string {
  const vaultName = options.vaultName ?? DEFAULT_OBSIDIAN_VAULT;
  const relPath = options.relPath ?? buildXPostRelPath(post);
  const params = [
    ["vault", vaultName],
    ["file", relPath],
    ["content", formatXPostMarkdown(post)],
    ["overwrite", "true"],
    ["silent", "true"]
  ]
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  return `obsidian://new?${params}`;
}

export function buildXPostRelPath(post: CapturedPost): string {
  const handle = sanitizePathSegment(post.handle || "@unknown");
  const id = sanitizePathSegment(post.statusId || post.key || String(Date.now()));
  return `04_X/${handle}/${id}.md`;
}

function formatXPostMarkdown(post: CapturedPost): string {
  const handle = post.handle || "@unknown";
  const url = post.postUrl || post.sourceUrl;
  const imageUrls = post.imageUrls ?? [];
  const lines = [
    "---",
    'type: "x-post"',
    'source: "x"',
    `url: ${JSON.stringify(url)}`,
    post.authorName ? `author: ${JSON.stringify(post.authorName)}` : "",
    `handle: ${JSON.stringify(handle)}`,
    post.statusId ? `status_id: ${JSON.stringify(post.statusId)}` : "",
    `captured: ${JSON.stringify(new Date().toISOString())}`,
    `seen_count: ${post.seenCount || 1}`,
    imageUrls.length ? `image_count: ${imageUrls.length}` : "",
    "---",
    "",
    `# ${handle}`,
    "",
    post.text.trim(),
    ""
  ].filter((line) => line !== "");

  if (imageUrls.length) {
    lines.push("", "## Images", "");
    for (const imageUrl of imageUrls) {
      lines.push(`![](${imageUrl})`);
    }
  }

  lines.push("", `Source: ${url}`, "");
  return lines.join("\n");
}

function sanitizePathSegment(value: string): string {
  const sanitized = value
    .trim()
    .split("")
    .map((char) => (/[\p{L}\p{N}@_.-]/u.test(char) ? char : "_"))
    .join("")
    .slice(0, 120);
  return sanitized || "unknown";
}

function openExternalUri(uri: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url: uri, active: false }, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });
}

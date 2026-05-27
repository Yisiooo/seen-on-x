import type { CapturedPost } from "../shared/types";

export type ExtractOptions = {
  pageUrl: string;
  now: number;
  maxTextLength: number;
};

export function extractPostFromArticle(article: HTMLElement, options: ExtractOptions): CapturedPost | null {
  const text = truncateText(extractTweetText(article), options.maxTextLength);
  if (!text) return null;

  const postUrl = extractPostUrl(article);
  const statusId = postUrl ? extractStatusId(postUrl) : undefined;
  const handle = extractHandle(article);
  const authorName = extractAuthorName(article, handle);
  const key = statusId ? `status:${statusId}` : `hash:${hashString(`${handle ?? ""}|${text}|${timeBucket(options.now)}`)}`;

  return {
    key,
    statusId,
    authorName,
    handle,
    text,
    postUrl,
    sourceUrl: options.pageUrl,
    firstSeenAt: options.now,
    lastSeenAt: options.now,
    seenCount: 1
  };
}

function extractTweetText(article: HTMLElement): string {
  const textNode = article.querySelector<HTMLElement>('[data-testid="tweetText"]');
  if (!textNode) return "";

  const spanTexts = Array.from(textNode.querySelectorAll("span"))
    .map((node) => normalizeText(node.textContent ?? ""))
    .filter(Boolean);

  if (spanTexts.length > 0) {
    return normalizeText(spanTexts.join(" "));
  }

  return normalizeText(textNode.textContent ?? "");
}

function extractPostUrl(article: HTMLElement): string | undefined {
  const link = Array.from(article.querySelectorAll<HTMLAnchorElement>('a[href*="/status/"]')).find((anchor) =>
    /\/status\/\d+/.test(anchor.getAttribute("href") ?? "")
  );
  if (!link) return undefined;

  const href = link.getAttribute("href");
  if (!href) return undefined;

  return new URL(href, "https://x.com").href;
}

function extractStatusId(postUrl: string): string | undefined {
  return postUrl.match(/\/status\/(\d+)/)?.[1];
}

function extractHandle(article: HTMLElement): string | undefined {
  const userNameNode = article.querySelector<HTMLElement>('[data-testid="User-Name"]') ?? article;
  const candidate = Array.from(userNameNode.querySelectorAll("span"))
    .map((span) => normalizeText(span.textContent ?? ""))
    .find((text) => /^@[\w_]{1,20}$/.test(text));

  return candidate;
}

function extractAuthorName(article: HTMLElement, handle?: string): string | undefined {
  const userNameNode = article.querySelector<HTMLElement>('[data-testid="User-Name"]');
  if (!userNameNode) return undefined;

  return Array.from(userNameNode.querySelectorAll("span"))
    .map((span) => normalizeText(span.textContent ?? ""))
    .find((text) => text && text !== handle && !text.startsWith("@") && !/^\d+[smhd]$/.test(text));
}

function truncateText(text: string, maxLength: number): string {
  const normalized = normalizeText(text);
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, maxLength).trimEnd();
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function timeBucket(timestamp: number): number {
  return Math.floor(timestamp / (10 * 60 * 1_000));
}

function hashString(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

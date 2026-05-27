import { extractPostFromArticle } from "./extract";
import type { CapturedPost, LoggerSettings, RuntimeMessage, RuntimeResponse } from "../shared/types";

const VISIBLE_DELAY_MS = 300;
const MIN_VISIBLE_RATIO = 0.2;
const SETTINGS_REFRESH_MS = 60_000;

let settings: LoggerSettings = {
  enabled: true,
  retentionHours: 2,
  maxEntries: 2_000,
  maxTextLength: 2_000
};

const observedArticles = new WeakSet<Element>();
const capturedElements = new WeakSet<Element>();
const pendingTimers = new WeakMap<Element, number>();

start().catch(() => {
  // X can swap documents aggressively during navigation; retry on the next load.
});

async function start(): Promise<void> {
  if (!isCapturePage(location.pathname)) return;
  if (!document.body) return;

  settings = await getSettings().catch(() => settings);
  setInterval(() => void refreshSettings(), SETTINGS_REFRESH_MS);

  const intersectionObserver = new IntersectionObserver(handleIntersections, {
    threshold: [MIN_VISIBLE_RATIO, 0.5, 1]
  });

  const mutationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        observeArticles(node, intersectionObserver);
      }
    }
  });

  observeArticles(document.body, intersectionObserver);
  mutationObserver.observe(document.body, { childList: true, subtree: true });
}

function observeArticles(root: Node, observer: IntersectionObserver): void {
  if (!(root instanceof Element)) return;

  const articles = root.matches("article") ? [root] : Array.from(root.querySelectorAll("article"));
  for (const article of articles) {
    if (observedArticles.has(article)) continue;
    observedArticles.add(article);
    observer.observe(article);
  }
}

function handleIntersections(entries: IntersectionObserverEntry[]): void {
  for (const entry of entries) {
    const article = entry.target;
    if (capturedElements.has(article)) continue;

    if (entry.isIntersecting && entry.intersectionRatio >= MIN_VISIBLE_RATIO) {
      if (pendingTimers.has(article)) continue;
      const timer = window.setTimeout(() => {
        pendingTimers.delete(article);
        if (capturedElements.has(article) || !isElementVisible(article)) return;
        capturedElements.add(article);
        captureArticle(article as HTMLElement);
      }, VISIBLE_DELAY_MS);
      pendingTimers.set(article, timer);
      continue;
    }

    const timer = pendingTimers.get(article);
    if (timer) {
      window.clearTimeout(timer);
      pendingTimers.delete(article);
    }
  }
}

function captureArticle(article: HTMLElement): void {
  if (!settings.enabled) return;

  const post = extractPostFromArticle(article, {
    pageUrl: location.href,
    now: Date.now(),
    maxTextLength: settings.maxTextLength
  });
  if (!post) return;

  sendMessage<{ saved: boolean; post?: CapturedPost }>({ type: "posts:save", post }).catch(() => {
    capturedElements.delete(article);
  });
}

function isElementVisible(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;

  const visibleWidth = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
  const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
  if (visibleWidth <= 0 || visibleHeight <= 0) return false;

  const visibleArea = visibleWidth * visibleHeight;
  const totalArea = rect.width * rect.height;
  return visibleArea / totalArea >= MIN_VISIBLE_RATIO;
}

async function refreshSettings(): Promise<void> {
  settings = await getSettings().catch(() => settings);
}

async function getSettings(): Promise<LoggerSettings> {
  const response = await sendMessage<LoggerSettings>({ type: "settings:get" });
  return response;
}

function sendMessage<T>(message: RuntimeMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: RuntimeResponse<T> | undefined) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      if (!response) {
        reject(new Error("No response from extension background"));
        return;
      }
      if (!response.ok) {
        reject(new Error(response.error));
        return;
      }
      resolve(response.data);
    });
  });
}

function isCapturePage(pathname: string): boolean {
  return ![
    "/messages",
    "/settings",
    "/i/grok",
    "/i/flow",
    "/login",
    "/logout",
    "/compose"
  ].some((blockedPath) => pathname.startsWith(blockedPath));
}

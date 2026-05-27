import "../styles.css";
import { escapeHtml, formatDateTime, sendMessage } from "../ui/runtime";
import { icon } from "../ui/icons";
import type { CapturedPost, QueryPostsRequest } from "../shared/types";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing popup root");

app.innerHTML = `
  <section class="panel popup-panel">
    <header class="header-row">
      <div class="brand-row">
        <span class="brand-mark" aria-hidden="true"></span>
        <div>
          <h1>Seen on X</h1>
          <p id="summary">Loading local archive</p>
        </div>
      </div>
      <button id="settingsButton" class="icon-button" aria-label="Open settings" title="Settings" type="button">
        ${icon("settings")}
      </button>
    </header>

    <div class="privacy-strip">
      <span class="status-dot" aria-hidden="true"></span>
      <span>Local only</span>
      <span>Viewport posts</span>
      <span>2h default</span>
    </div>

    <section class="controls" aria-label="Search filters">
      <label class="field">
        <span>Search</span>
        <input id="keywordInput" type="search" placeholder="Text, author, handle, or URL" autocomplete="off" />
      </label>
      <div class="split-row">
        <label class="field">
          <span>Window</span>
          <select id="rangeSelect">
            <option value="2">Last 2 hours</option>
            <option value="6">Last 6 hours</option>
            <option value="24">Last 24 hours</option>
            <option value="all">All saved</option>
          </select>
        </label>
        <label class="field">
          <span>Handle</span>
          <input id="handleInput" type="search" placeholder="@handle" autocomplete="off" />
        </label>
      </div>
    </section>

    <div id="results" class="results-list" aria-live="polite"></div>

    <footer class="footer-row">
      <button id="refreshButton" class="secondary-button" type="button">${icon("refresh")}Refresh</button>
      <button id="clearButton" class="danger-button" type="button">${icon("trash")}Clear</button>
    </footer>
  </section>
`;

const summary = query("#summary");
const keywordInput = query<HTMLInputElement>("#keywordInput");
const handleInput = query<HTMLInputElement>("#handleInput");
const rangeSelect = query<HTMLSelectElement>("#rangeSelect");
const results = query("#results");

query<HTMLButtonElement>("#settingsButton").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
query<HTMLButtonElement>("#refreshButton").addEventListener("click", () => void loadPosts());
query<HTMLButtonElement>("#clearButton").addEventListener("click", () => void clearPosts());
keywordInput.addEventListener("input", debounce(() => void loadPosts(), 180));
handleInput.addEventListener("input", debounce(() => void loadPosts(), 180));
rangeSelect.addEventListener("change", () => void loadPosts());

void loadPosts();

async function loadPosts(): Promise<void> {
  summary.textContent = "Loading local archive";
  results.innerHTML = `<div class="empty-state"><strong>Reading local archive</strong><span>IndexedDB is warming up.</span></div>`;

  try {
    const posts = await sendMessage<CapturedPost[]>({
      type: "posts:query",
      query: buildQuery()
    });
    renderPosts(posts);
  } catch (error) {
    renderError(error);
  }
}

function buildQuery(): QueryPostsRequest {
  const range = rangeSelect.value;
  const query: QueryPostsRequest = {
    keyword: keywordInput.value,
    handle: handleInput.value,
    limit: 100
  };

  if (range !== "all") {
    query.from = Date.now() - Number(range) * 60 * 60 * 1_000;
  }

  return query;
}

function renderPosts(posts: CapturedPost[]): void {
  summary.textContent = posts.length === 0 ? "No matching posts" : `${posts.length} matching posts`;

  if (posts.length === 0) {
    results.innerHTML = `
      <div class="empty-state">
        <strong>Nothing seen yet</strong>
        <span>Open X, scroll for a bit, then search what you saw.</span>
      </div>
    `;
    return;
  }

  results.innerHTML = posts
    .map(
      (post) => `
        <article class="post-item">
          <div class="post-meta">
            <strong>${escapeHtml(post.authorName ?? post.handle ?? "Unknown author")}</strong>
            ${post.handle ? `<span>${escapeHtml(post.handle)}</span>` : ""}
            <time>${formatDateTime(post.lastSeenAt)}</time>
          </div>
          <p>${escapeHtml(post.text)}</p>
          <div class="post-actions">
            ${
              post.postUrl
                ? `<button class="ghost-button" type="button" data-action="open" data-url="${escapeHtml(post.postUrl)}">${icon("external")}Open</button>`
                : ""
            }
            <button class="ghost-button" type="button" data-action="copy" data-key="${escapeHtml(post.key)}">${icon("copy")}Copy</button>
            <span>Seen ${post.seenCount}x</span>
          </div>
        </article>
      `
    )
    .join("");

  results.querySelectorAll<HTMLButtonElement>("[data-action='open']").forEach((button) => {
    button.addEventListener("click", () => {
      const url = button.dataset.url;
      if (url) chrome.tabs.create({ url });
    });
  });
  results.querySelectorAll<HTMLButtonElement>("[data-action='copy']").forEach((button) => {
    button.addEventListener("click", () => {
      const post = posts.find((item) => item.key === button.dataset.key);
      if (!post) return;
      void navigator.clipboard.writeText(post.text);
      const original = button.innerHTML;
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.innerHTML = original;
      }, 1_200);
    });
  });
}

async function clearPosts(): Promise<void> {
  const confirmed = window.confirm("Clear all saved posts? This cannot be undone.");
  if (!confirmed) return;

  await sendMessage<{ cleared: boolean }>({ type: "posts:clear" });
  await loadPosts();
}

function renderError(error: unknown): void {
  const message = error instanceof Error ? error.message : "Unknown error";
  summary.textContent = "Read failed";
  results.innerHTML = `<div class="empty-state error-state"><strong>Could not read local archive</strong><span>${escapeHtml(message)}</span></div>`;
}

function query<T extends Element = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

function debounce(callback: () => void, delay: number): () => void {
  let timer: number | undefined;
  return () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(callback, delay);
  };
}

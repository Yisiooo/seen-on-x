import "../styles.css";
import { escapeHtml, sendMessage } from "../ui/runtime";
import { icon } from "../ui/icons";
import type { CapturedPost, LoggerSettings } from "../shared/types";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing options root");

app.innerHTML = `
  <section class="panel settings-panel">
    <header class="settings-header">
      <div class="brand-row">
        <span class="brand-mark" aria-hidden="true"></span>
        <div>
          <h1>Seen on X Settings</h1>
          <p>Local archive controls for X posts you actually saw.</p>
        </div>
      </div>
    </header>

    <form id="settingsForm" class="settings-form">
      <label class="toggle-row">
        <input id="enabledInput" type="checkbox" />
        <span>
          <strong>Capture enabled</strong>
          <small>When disabled, visible posts are not written to the local archive.</small>
        </span>
      </label>

      <div class="settings-grid">
        <label class="field">
          <span>Retention hours</span>
          <input id="retentionInput" type="number" min="0.1" max="720" step="0.1" />
        </label>
        <label class="field">
          <span>Entry cap</span>
          <input id="maxEntriesInput" type="number" min="50" max="100000" step="50" />
        </label>
        <label class="field">
          <span>Text cap</span>
          <input id="maxTextLengthInput" type="number" min="100" max="10000" step="100" />
        </label>
      </div>

      <div class="footer-row">
        <button id="saveButton" type="submit">${icon("archive")}Save settings</button>
        <span id="saveStatus" class="status-text"></span>
      </div>
    </form>

    <section class="data-tools">
      <h2>Data</h2>
      <div class="footer-row">
        <button id="exportJsonButton" class="secondary-button" type="button">${icon("download")}Export JSON</button>
        <button id="exportCsvButton" class="secondary-button" type="button">${icon("download")}Export CSV</button>
        <button id="clearButton" class="danger-button" type="button">${icon("trash")}Clear archive</button>
      </div>
      <p id="dataStatus" class="status-text">Loading</p>
    </section>
  </section>
`;

const form = query<HTMLFormElement>("#settingsForm");
const enabledInput = query<HTMLInputElement>("#enabledInput");
const retentionInput = query<HTMLInputElement>("#retentionInput");
const maxEntriesInput = query<HTMLInputElement>("#maxEntriesInput");
const maxTextLengthInput = query<HTMLInputElement>("#maxTextLengthInput");
const saveStatus = query("#saveStatus");
const dataStatus = query("#dataStatus");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void saveSettings();
});
query<HTMLButtonElement>("#exportJsonButton").addEventListener("click", () => void exportData("json"));
query<HTMLButtonElement>("#exportCsvButton").addEventListener("click", () => void exportData("csv"));
query<HTMLButtonElement>("#clearButton").addEventListener("click", () => void clearPosts());

void loadSettings();
void refreshStats();

async function loadSettings(): Promise<void> {
  const settings = await sendMessage<LoggerSettings>({ type: "settings:get" });
  enabledInput.checked = settings.enabled;
  retentionInput.value = String(settings.retentionHours);
  maxEntriesInput.value = String(settings.maxEntries);
  maxTextLengthInput.value = String(settings.maxTextLength);
}

async function saveSettings(): Promise<void> {
  saveStatus.textContent = "Saving";
  const settings = await sendMessage<LoggerSettings>({
    type: "settings:update",
    settings: {
      enabled: enabledInput.checked,
      retentionHours: Number(retentionInput.value),
      maxEntries: Number(maxEntriesInput.value),
      maxTextLength: Number(maxTextLengthInput.value)
    }
  });

  enabledInput.checked = settings.enabled;
  retentionInput.value = String(settings.retentionHours);
  maxEntriesInput.value = String(settings.maxEntries);
  maxTextLengthInput.value = String(settings.maxTextLength);
  saveStatus.textContent = "Saved";
  await refreshStats();
}

async function refreshStats(): Promise<void> {
  const stats = await sendMessage<{ count: number }>({ type: "posts:stats" });
  dataStatus.textContent = `${stats.count} posts saved locally`;
}

async function exportData(format: "json" | "csv"): Promise<void> {
  const posts = await sendMessage<CapturedPost[]>({
    type: "posts:query",
    query: { limit: 100_000 }
  });
  const payload = format === "json" ? JSON.stringify(posts, null, 2) : toCsv(posts);
  const mime = format === "json" ? "application/json" : "text/csv";
  downloadBlob(payload, `seen-on-x.${format}`, mime);
}

async function clearPosts(): Promise<void> {
  const confirmed = window.confirm("Clear all saved posts? This cannot be undone.");
  if (!confirmed) return;

  await sendMessage<{ cleared: boolean }>({ type: "posts:clear" });
  await refreshStats();
}

function toCsv(posts: CapturedPost[]): string {
  const headers = ["authorName", "handle", "text", "postUrl", "sourceUrl", "firstSeenAt", "lastSeenAt", "seenCount"];
  const rows = posts.map((post) =>
    [
      post.authorName ?? "",
      post.handle ?? "",
      post.text,
      post.postUrl ?? "",
      post.sourceUrl,
      new Date(post.firstSeenAt).toISOString(),
      new Date(post.lastSeenAt).toISOString(),
      String(post.seenCount)
    ]
      .map(csvCell)
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function query<T extends Element = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

window.addEventListener("error", (event) => {
  dataStatus.innerHTML = `<span class="error-state">${escapeHtml(event.message)}</span>`;
});

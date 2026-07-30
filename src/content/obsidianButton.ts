const BUTTON_CLASS = "seen-on-x-obsidian-button";
const STYLE_ID = "seen-on-x-obsidian-style";

export function installObsidianSaveButton(article: HTMLElement, onSave: () => void): boolean {
  if (article.querySelector(`.${BUTTON_CLASS}`)) return false;

  const actionBar = findActionBar(article);
  if (!actionBar) return false;

  ensureButtonStyles();

  const button = document.createElement("button");
  button.type = "button";
  button.className = BUTTON_CLASS;
  button.setAttribute("aria-label", "Save to Obsidian");
  button.setAttribute("title", "Save to Obsidian");
  button.innerHTML = obsidianIcon();
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onSave();
  });

  actionBar.append(button);
  return true;
}

export function setObsidianButtonState(
  article: HTMLElement,
  state: "idle" | "saving" | "saved" | "error",
  detail?: string
): void {
  const button = article.querySelector<HTMLButtonElement>(`.${BUTTON_CLASS}`);
  if (!button) return;
  button.dataset.state = state;
  button.disabled = state === "saving";
  const label =
    state === "saved"
      ? "Saved to Obsidian"
      : state === "error"
        ? `Save to Obsidian failed${detail ? `: ${detail}` : ""}`
        : "Save to Obsidian";
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
}

function findActionBar(article: HTMLElement): HTMLElement | null {
  const groups = Array.from(article.querySelectorAll<HTMLElement>('[role="group"]'));
  return groups.at(-1) ?? null;
}

function ensureButtonStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${BUTTON_CLASS} {
      align-items: center;
      background: transparent;
      border: 0;
      border-radius: 999px;
      color: rgb(113, 118, 123);
      cursor: pointer;
      display: inline-flex;
      height: 34px;
      justify-content: center;
      margin: 0;
      padding: 0;
      width: 34px;
    }
    .${BUTTON_CLASS}:hover {
      background: rgba(29, 155, 240, 0.1);
      color: rgb(29, 155, 240);
    }
    .${BUTTON_CLASS}[data-state="saving"] {
      color: rgb(113, 118, 123);
      cursor: wait;
      opacity: 0.72;
    }
    .${BUTTON_CLASS}[data-state="saved"] {
      color: rgb(0, 186, 124);
    }
    .${BUTTON_CLASS}[data-state="error"] {
      color: rgb(244, 33, 46);
    }
    .${BUTTON_CLASS} svg {
      height: 19px;
      width: 19px;
    }
  `;
  document.documentElement.append(style);
}

function obsidianIcon(): string {
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 3 5.5 8.5 7.8 19 12 21l4.2-2 2.3-10.5L12 3Z"/>
    <path d="m8.2 9.2 3.8-3.3 3.8 3.3-1.3 7.1L12 18l-2.5-1.7-1.3-7.1Z"/>
    <path d="M8.2 9.2h7.6"/>
  </svg>`;
}

import { describe, expect, it, vi } from "vitest";
import { buildObsidianNewUri, savePostToObsidian } from "../src/background/obsidian";
import { installObsidianSaveButton, setObsidianButtonState } from "../src/content/obsidianButton";
import type { CapturedPost } from "../src/shared/types";

const basePost: CapturedPost = {
  key: "status:123",
  statusId: "123",
  authorName: "Ada",
  handle: "@ada",
  text: "save this post",
  postUrl: "https://x.com/ada/status/123",
  sourceUrl: "https://x.com/home",
  firstSeenAt: 1_000,
  lastSeenAt: 1_000,
  seenCount: 1
};

const imagePost: CapturedPost = {
  ...basePost,
  imageUrls: ["https://pbs.twimg.com/media/abc123?format=jpg&name=large"]
};

describe("savePostToObsidian", () => {
  it("posts captured X data to the local vault service", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ saved: true, relPath: "04_X/@ada/123.md" })
    })) as unknown as typeof fetch;

    const result = await savePostToObsidian(basePost, { fetchImpl, endpoint: "http://127.0.0.1:8765" });

    expect(result).toEqual({ saved: true, relPath: "04_X/@ada/123.md" });
    expect(fetchImpl).toHaveBeenCalledWith("http://127.0.0.1:8765/x-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(basePost)
    });
  });

  it("uses the Obsidian plugin capture endpoint by default", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ saved: true })
    })) as unknown as typeof fetch;

    await savePostToObsidian(basePost, { fetchImpl });

    expect(fetchImpl).toHaveBeenCalledWith("http://127.0.0.1:8766/x-post", expect.any(Object));
  });

  it("falls back to an Obsidian URI when the local service is unavailable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    const openUri = vi.fn();

    const result = await savePostToObsidian(basePost, { fetchImpl, openUri });

    expect(result).toEqual({
      saved: true,
      method: "obsidian-uri",
      relPath: "04_X/@ada/123.md"
    });
    expect(openUri).toHaveBeenCalledOnce();
    expect(openUri.mock.calls[0][0]).toContain("obsidian://new?");
    expect(decodeURIComponent(openUri.mock.calls[0][0])).toContain("04_X/@ada/123.md");
    expect(decodeURIComponent(openUri.mock.calls[0][0])).toContain("save this post");
  });
});

describe("buildObsidianNewUri", () => {
  it("formats the target path and Markdown content", () => {
    const uri = buildObsidianNewUri(basePost);

    expect(decodeURIComponent(uri)).toContain("vault=vault4ob");
    expect(decodeURIComponent(uri)).toContain("file=04_X/@ada/123.md");
    expect(decodeURIComponent(uri)).toContain('type: "x-post"');
    expect(decodeURIComponent(uri)).toContain("Source: https://x.com/ada/status/123");
  });

  it("includes image embeds in fallback Markdown", () => {
    const uri = buildObsidianNewUri(imagePost);
    const decoded = decodeURIComponent(uri);

    expect(decoded).toContain("image_count: 1");
    expect(decoded).toContain("## Images");
    expect(decoded).toContain("![](https://pbs.twimg.com/media/abc123?format=jpg&name=large)");
  });
});

describe("installObsidianSaveButton", () => {
  it("adds one save button to the article action bar", () => {
    document.body.innerHTML = `
      <article>
        <div role="group"><button aria-label="Like">heart</button></div>
      </article>
    `;
    const article = document.querySelector("article") as HTMLElement;
    const onSave = vi.fn();

    expect(installObsidianSaveButton(article, onSave)).toBe(true);
    expect(installObsidianSaveButton(article, onSave)).toBe(false);

    const button = article.querySelector<HTMLButtonElement>(".seen-on-x-obsidian-button");
    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button?.getAttribute("aria-label")).toBe("Save to Obsidian");
    button?.click();
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("stores the error message on failed buttons", () => {
    document.body.innerHTML = `
      <article>
        <div role="group"><button aria-label="Like">heart</button></div>
      </article>
    `;
    const article = document.querySelector("article") as HTMLElement;
    installObsidianSaveButton(article, () => undefined);

    setObsidianButtonState(article, "error", "HTTP 404");

    const button = article.querySelector<HTMLButtonElement>(".seen-on-x-obsidian-button");
    expect(button?.dataset.state).toBe("error");
    expect(button?.getAttribute("title")).toBe("Save to Obsidian failed: HTTP 404");
  });
});

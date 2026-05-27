import { describe, expect, it } from "vitest";
import { extractPostFromArticle } from "../src/content/extract";

describe("extractPostFromArticle", () => {
  it("extracts author, handle, text, and status URL from an X article", () => {
    document.body.innerHTML = `
      <article data-testid="tweet">
        <div data-testid="User-Name">
          <span>Ada Lovelace</span>
          <span>@ada</span>
          <a href="/ada/status/1234567890"><time datetime="2026-05-26T10:00:00.000Z"></time></a>
        </div>
        <div data-testid="tweetText">
          <span>First line</span>
          <span>second line</span>
        </div>
      </article>
    `;

    const article = document.querySelector("article");
    expect(article).toBeInstanceOf(HTMLElement);

    const post = extractPostFromArticle(article as HTMLElement, {
      pageUrl: "https://x.com/home",
      now: 1_779_790_000_000,
      maxTextLength: 2_000
    });

    expect(post).toEqual({
      key: "status:1234567890",
      statusId: "1234567890",
      authorName: "Ada Lovelace",
      handle: "@ada",
      text: "First line second line",
      postUrl: "https://x.com/ada/status/1234567890",
      sourceUrl: "https://x.com/home",
      firstSeenAt: 1_779_790_000_000,
      lastSeenAt: 1_779_790_000_000,
      seenCount: 1
    });
  });

  it("uses a stable fallback hash when no status link exists", () => {
    document.body.innerHTML = `
      <article>
        <div data-testid="User-Name"><span>@fallback</span></div>
        <div data-testid="tweetText">Same text</div>
      </article>
    `;

    const article = document.querySelector("article") as HTMLElement;
    const first = extractPostFromArticle(article, {
      pageUrl: "https://x.com/explore",
      now: 1_200_000,
      maxTextLength: 2_000
    });
    const second = extractPostFromArticle(article, {
      pageUrl: "https://x.com/explore",
      now: 1_201_000,
      maxTextLength: 2_000
    });

    expect(first?.statusId).toBeUndefined();
    expect(first?.key).toBe(second?.key);
    expect(first?.key.startsWith("hash:")).toBe(true);
  });
});

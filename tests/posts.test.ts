import { describe, expect, it } from "vitest";
import { mergeCapturedPost, prunePosts } from "../src/shared/posts";
import type { CapturedPost } from "../src/shared/types";

const basePost: CapturedPost = {
  key: "status:1",
  statusId: "1",
  authorName: "Ada",
  handle: "@ada",
  text: "hello",
  postUrl: "https://x.com/ada/status/1",
  sourceUrl: "https://x.com/home",
  firstSeenAt: 1_000,
  lastSeenAt: 1_000,
  seenCount: 1
};

describe("mergeCapturedPost", () => {
  it("updates lastSeenAt and seenCount for an existing post", () => {
    const merged = mergeCapturedPost(basePost, {
      ...basePost,
      text: "hello updated",
      firstSeenAt: 2_000,
      lastSeenAt: 2_000,
      seenCount: 1
    });

    expect(merged).toEqual({
      ...basePost,
      text: "hello updated",
      firstSeenAt: 1_000,
      lastSeenAt: 2_000,
      seenCount: 2
    });
  });
});

describe("prunePosts", () => {
  it("removes expired posts and keeps the newest records when over the max entry count", () => {
    const posts: CapturedPost[] = [
      { ...basePost, key: "old", firstSeenAt: 0, lastSeenAt: 100 },
      { ...basePost, key: "a", firstSeenAt: 1_000, lastSeenAt: 1_000 },
      { ...basePost, key: "b", firstSeenAt: 2_000, lastSeenAt: 2_000 },
      { ...basePost, key: "c", firstSeenAt: 3_000, lastSeenAt: 3_000 }
    ];

    expect(
      prunePosts(posts, {
        now: 3_500,
        retentionHours: 0.0005,
        maxEntries: 2
      }).map((post) => post.key)
    ).toEqual(["c", "b"]);
  });
});

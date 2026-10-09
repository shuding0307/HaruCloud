import { describe, expect, it } from "vitest";
import { MockThoughtRepository } from "@/lib/repositories/mock";

const HOUR = 60 * 60 * 1000;

function setup() {
  let now = Date.parse("2026-10-09T00:00:00Z");
  const repo = new MockThoughtRepository(() => now);
  return { repo, advance: (ms: number) => (now += ms) };
}

describe("Mock 저장소 — 24시간 만료", () => {
  it("만료 시각은 서버가 작성 시각 + 24시간으로 정한다", async () => {
    const { repo } = setup();
    const t = await repo.create({ content: "hi", authorHash: "a" });
    expect(Date.parse(t.expiresAt) - Date.parse(t.createdAt)).toBe(24 * HOUR);
  });

  it("만료된 고민은 목록에서 빠지고, 상세·공감·신고가 거부된다", async () => {
    const { repo, advance } = setup();
    const t = await repo.create({ content: "곧 사라질 고민", authorHash: "a" });
    expect((await repo.listActive({ limit: 30 })).thoughts.map((x) => x.id)).toContain(t.id);

    advance(24 * HOUR - 1);
    expect((await repo.getForViewer(t.id, null)).state).toBe("active");

    advance(1);
    expect((await repo.getForViewer(t.id, null)).state).not.toBe("active");
    expect((await repo.listActive({ limit: 30 })).thoughts).toHaveLength(0);
    expect(await repo.addReaction({ thoughtId: t.id, type: "lighter", actorHash: "b" })).not.toBe("created");
    expect(await repo.createReport({ thoughtId: t.id, reason: "spam", reporterHash: "b" })).not.toBe("created");
  });
});

describe("Mock 저장소 — 공감", () => {
  it("같은 사용자·같은 유형은 한 번만 집계되고, 작성자에게만 받은 공감 수가 보인다", async () => {
    const { repo } = setup();
    const t = await repo.create({ content: "x", authorHash: "author" });
    expect(await repo.addReaction({ thoughtId: t.id, type: "been_there", actorHash: "u1" })).toBe("created");
    expect(await repo.addReaction({ thoughtId: t.id, type: "been_there", actorHash: "u1" })).toBe("duplicate");
    expect(await repo.addReaction({ thoughtId: t.id, type: "lighter", actorHash: "u1" })).toBe("created");
    expect(await repo.addReaction({ thoughtId: t.id, type: "been_there", actorHash: "u2" })).toBe("created");

    const asReader = await repo.getForViewer(t.id, "u1");
    expect(asReader.state === "active" && asReader.viewer.reactions.sort()).toEqual(["been_there", "lighter"]);
    expect(asReader.state === "active" && asReader.viewer.receivedReactions).toBeNull();

    const asAuthor = await repo.getForViewer(t.id, "author");
    expect(asAuthor.state === "active" && asAuthor.viewer.receivedReactions).toEqual({ been_there: 2, lighter: 1 });
  });

  it("없는 고민에 대한 공감은 not_found", async () => {
    const { repo } = setup();
    expect(
      await repo.addReaction({ thoughtId: "00000000-0000-4000-8000-000000000000", type: "lighter", actorHash: "u" }),
    ).toBe("not_found");
  });
});

describe("Mock 저장소 — 신고", () => {
  it("중복 신고는 한 번만 기록되고, 3건이 쌓이면 공개 목록에서 내려간다", async () => {
    const { repo } = setup();
    const t = await repo.create({ content: "x", authorHash: "a" });
    expect(await repo.createReport({ thoughtId: t.id, reason: "spam", reporterHash: "r1" })).toBe("created");
    expect(await repo.createReport({ thoughtId: t.id, reason: "spam", reporterHash: "r1" })).toBe("duplicate");
    expect(repo.reportCount(t.id)).toBe(1);
    await repo.createReport({ thoughtId: t.id, reason: "other", reporterHash: "r2" });
    expect((await repo.listActive({ limit: 30 })).thoughts).toHaveLength(1);
    await repo.createReport({ thoughtId: t.id, reason: "privacy", reporterHash: "r3" });
    expect((await repo.listActive({ limit: 30 })).thoughts).toHaveLength(0);
    expect((await repo.getForViewer(t.id, null)).state).toBe("unavailable");
  });

  it("신고된 글은 만료 후에도 검토용으로 7일까지만 보존되고 이후 삭제된다", async () => {
    const { repo, advance } = setup();
    const t = await repo.create({ content: "x", authorHash: "a" });
    const clean = await repo.create({ content: "y", authorHash: "a" });
    await repo.createReport({ thoughtId: t.id, reason: "spam", reporterHash: "r1" });
    advance(25 * HOUR);
    repo.purgeExpired();
    expect((await repo.getForViewer(clean.id, null)).state).toBe("not_found"); // 원문 삭제
    expect((await repo.getForViewer(t.id, null)).state).toBe("expired"); // 보존 중이지만 비공개
    advance(7 * 24 * HOUR);
    repo.purgeExpired();
    expect((await repo.getForViewer(t.id, null)).state).toBe("not_found");
  });
});

describe("Mock 저장소 — 목록", () => {
  it("페이지 크기 제한과 커서 페이지네이션", async () => {
    const { repo, advance } = setup();
    for (let i = 0; i < 60; i++) {
      await repo.create({ content: `t${i}`, authorHash: "a" });
      advance(1000);
    }
    const first = await repo.listActive({ limit: 999 });
    expect(first.thoughts).toHaveLength(50);
    expect(first.thoughts[0]!.content).toBe("t59");
    const second = await repo.listActive({ limit: 50, cursor: first.nextCursor! });
    expect(second.thoughts).toHaveLength(10);
    expect(second.nextCursor).toBeNull();
    expect(new Set([...first.thoughts, ...second.thoughts].map((t) => t.id)).size).toBe(60);
  });
});

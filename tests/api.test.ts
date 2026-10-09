import { beforeEach, describe, expect, it } from "vitest";
import { GET as listThoughts, POST as createThought } from "@/app/api/thoughts/route";
import { GET as getThought } from "@/app/api/thoughts/[id]/route";
import { POST as postReaction } from "@/app/api/thoughts/[id]/reactions/route";
import { POST as postReport } from "@/app/api/thoughts/[id]/reports/route";
import { setDataServicesForTesting } from "@/lib/repositories";
import { MockThoughtRepository } from "@/lib/repositories/mock";
import { MemoryRateLimiter } from "@/lib/security/rate-limit";

const BASE = "http://localhost:3000";
const HOUR = 60 * 60 * 1000;
let now = Date.parse("2026-10-09T00:00:00Z");
let ipCounter = 0;

function req(path: string, init: { method?: string; body?: unknown; cookie?: string; ip?: string; origin?: string } = {}) {
  const headers: Record<string, string> = { host: "localhost:3000", "x-forwarded-for": init.ip ?? "203.0.113.1" };
  if (init.body !== undefined) headers["content-type"] = "application/json";
  if (init.cookie) headers.cookie = init.cookie;
  if (init.origin) headers.origin = init.origin;
  return new Request(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : typeof init.body === "string" ? init.body : JSON.stringify(init.body),
  });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const cookieOf = (res: Response) => res.headers.get("set-cookie")?.split(";")[0];

async function post(content: string, opts: { cookie?: string; ip?: string } = {}) {
  return createThought(req("/api/thoughts", { method: "POST", body: { content }, ...opts }));
}

beforeEach(() => {
  now = Date.parse("2026-10-09T00:00:00Z");
  ipCounter++;
  setDataServicesForTesting({
    thoughts: new MockThoughtRepository(() => now),
    rateLimiter: new MemoryRateLimiter(),
  });
});

describe("POST /api/thoughts", () => {
  it("고민을 작성하면 201 과 서버가 계산한 만료 시각을 돌려주고, 익명 쿠키를 발급한다", async () => {
    const res = await post("오늘 조금 힘들었어요");
    expect(res.status).toBe(201);
    const { thought } = await res.json();
    expect(thought.content).toBe("오늘 조금 힘들었어요");
    expect(Date.parse(thought.expiresAt) - Date.parse(thought.createdAt)).toBe(24 * HOUR);
    expect(res.headers.get("set-cookie")).toMatch(/hc_actor=.*HttpOnly/);
    expect(thought).not.toHaveProperty("authorHash");
  });

  it("클라이언트가 보낸 만료 시각은 무시된다", async () => {
    const res = await createThought(
      req("/api/thoughts", { method: "POST", body: { content: "x", expiresAt: "2099-01-01T00:00:00Z" } }),
    );
    const { thought } = await res.json();
    expect(thought.expiresAt).not.toContain("2099");
  });

  it("빈 고민과 500자 초과 고민은 422 로 거부된다", async () => {
    for (const content of ["", "   ", "가".repeat(501)]) {
      const res = await post(content);
      expect(res.status).toBe(422);
      expect((await res.json()).error.code).toBe("VALIDATION_FAILED");
    }
  });

  it("잘못된 JSON 400, JSON 이 아니면 415, 다른 출처는 403", async () => {
    expect((await createThought(req("/api/thoughts", { method: "POST", body: "{oops" }))).status).toBe(400);
    const plain = new Request(`${BASE}/api/thoughts`, { method: "POST", body: "x", headers: { host: "localhost:3000" } });
    expect((await createThought(plain)).status).toBe(415);
    const cross = req("/api/thoughts", { method: "POST", body: { content: "x" }, origin: "https://evil.example" });
    expect((await createThought(cross)).status).toBe(403);
  });

  it("짧은 시간에 너무 많이 작성하면 429", async () => {
    const first = await post("1", { ip: `198.51.100.${ipCounter}` });
    const cookie = cookieOf(first)!;
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await post(`n${i}`, { cookie, ip: `198.51.100.${ipCounter}` })).status);
    expect(statuses).toContain(429);
  });
});

describe("GET /api/thoughts", () => {
  it("공개된 고민이 목록에 나타나고 만료되면 사라진다", async () => {
    const created = await (await post("하늘에 띄운 고민")).json();
    let body = await (await listThoughts(req("/api/thoughts"))).json();
    expect(body.thoughts.map((t: { id: string }) => t.id)).toContain(created.thought.id);
    expect(body.serverNow).toBeTruthy();

    now += 24 * HOUR;
    body = await (await listThoughts(req("/api/thoughts"))).json();
    expect(body.thoughts).toHaveLength(0);
  });

  it("페이지 크기 상한(50)을 넘는 요청은 400", async () => {
    expect((await listThoughts(req("/api/thoughts?limit=500"))).status).toBe(400);
    expect((await listThoughts(req("/api/thoughts?cursor=@@@"))).status).toBe(400);
  });
});

describe("GET /api/thoughts/[id]", () => {
  it("상세 조회가 되고, 만료되면 410, 없는 id 는 404", async () => {
    const { thought } = await (await post("상세 보기")).json();
    const ok = await getThought(req(`/api/thoughts/${thought.id}`), ctx(thought.id));
    expect(ok.status).toBe(200);
    expect((await ok.json()).thought.content).toBe("상세 보기");

    now += 24 * HOUR + 1;
    const gone = await getThought(req(`/api/thoughts/${thought.id}`), ctx(thought.id));
    expect(gone.status).toBe(410);
    expect(await gone.json()).toEqual({ error: expect.objectContaining({ code: "EXPIRED" }) });

    expect((await getThought(req("/api/thoughts/nope"), ctx("nope"))).status).toBe(404);
    const missing = "00000000-0000-4000-8000-000000000000";
    expect((await getThought(req(`/api/thoughts/${missing}`), ctx(missing))).status).toBe(404);
  });

  it("작성자 본인에게만 받은 공감 수가 보인다", async () => {
    const created = await post("내 고민");
    const authorCookie = cookieOf(created)!;
    const { thought } = await created.json();

    const r = await postReaction(
      req(`/api/thoughts/${thought.id}/reactions`, { method: "POST", body: { type: "lighter" } }),
      ctx(thought.id),
    );
    const readerCookie = cookieOf(r)!;

    const asAuthor = await (await getThought(req(`/api/thoughts/${thought.id}`, { cookie: authorCookie }), ctx(thought.id))).json();
    expect(asAuthor.viewer.isAuthor).toBe(true);
    expect(asAuthor.viewer.receivedReactions).toEqual({ been_there: 0, lighter: 1 });

    const asReader = await (await getThought(req(`/api/thoughts/${thought.id}`, { cookie: readerCookie }), ctx(thought.id))).json();
    expect(asReader.viewer.isAuthor).toBe(false);
    expect(asReader.viewer.receivedReactions).toBeNull();
    expect(asReader.viewer.reactions).toEqual(["lighter"]);
  });
});

describe("POST /api/thoughts/[id]/reactions", () => {
  it("같은 사용자의 중복 공감은 집계되지 않는다", async () => {
    const { thought } = await (await post("공감 테스트")).json();
    const url = `/api/thoughts/${thought.id}/reactions`;
    const first = await postReaction(req(url, { method: "POST", body: { type: "been_there" } }), ctx(thought.id));
    expect(first.status).toBe(201);
    const cookie = cookieOf(first)!;

    // 동시 요청 포함 반복 요청
    const repeats = await Promise.all(
      Array.from({ length: 3 }, () => postReaction(req(url, { method: "POST", body: { type: "been_there" }, cookie }), ctx(thought.id))),
    );
    for (const res of repeats) {
      expect(res.status).toBe(200);
      expect((await res.json()).alreadyReacted).toBe(true);
    }
  });

  it("잘못된 공감 유형은 422, 만료된 고민에는 410", async () => {
    const { thought } = await (await post("만료 공감")).json();
    const url = `/api/thoughts/${thought.id}/reactions`;
    expect((await postReaction(req(url, { method: "POST", body: { type: "like" } }), ctx(thought.id))).status).toBe(422);
    now += 24 * HOUR;
    expect((await postReaction(req(url, { method: "POST", body: { type: "lighter" } }), ctx(thought.id))).status).toBe(410);
  });

  it("위조된 쿠키는 무시되고 새 식별값이 발급된다", async () => {
    const { thought } = await (await post("위조")).json();
    const res = await postReaction(
      req(`/api/thoughts/${thought.id}/reactions`, { method: "POST", body: { type: "lighter" }, cookie: "hc_actor=forged.value" }),
      ctx(thought.id),
    );
    expect(res.status).toBe(201);
    expect(res.headers.get("set-cookie")).toMatch(/hc_actor=/);
  });
});

describe("POST /api/thoughts/[id]/reports", () => {
  it("신고가 접수되고, 중복 신고는 한 번만 기록된다. 응답에 다른 신고자 정보는 없다", async () => {
    const { thought } = await (await post("신고 대상")).json();
    const url = `/api/thoughts/${thought.id}/reports`;
    const first = await postReport(req(url, { method: "POST", body: { reason: "spam" } }), ctx(thought.id));
    expect(first.status).toBe(201);
    expect(await first.json()).toEqual({ status: "received" });

    const again = await postReport(req(url, { method: "POST", body: { reason: "other" }, cookie: cookieOf(first) }), ctx(thought.id));
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual({ status: "already_reported" });
  });

  it("신고 사유가 없으면 422", async () => {
    const { thought } = await (await post("x")).json();
    const res = await postReport(req(`/api/thoughts/${thought.id}/reports`, { method: "POST", body: {} }), ctx(thought.id));
    expect(res.status).toBe(422);
  });
});

import { describe, expect, it } from "vitest";
import { hashActorId, readActor, readOrIssueActor, signActorId, verifyActorToken } from "@/lib/security/anon-token";

describe("익명 식별 토큰", () => {
  it("서명된 토큰은 검증되고 위조된 토큰은 거부된다", () => {
    const token = signActorId("abcdefghijklmnopqrstuv");
    expect(verifyActorToken(token)).toBe("abcdefghijklmnopqrstuv");
    expect(verifyActorToken(token.slice(0, -2) + "xx")).toBeNull();
    expect(verifyActorToken("abcdefghijklmnopqrstuv.fake")).toBeNull();
    expect(verifyActorToken("")).toBeNull();
    expect(verifyActorToken(undefined)).toBeNull();
  });

  it("쿠키가 없으면 조회 시 발급하지 않고, 쓰기 시 새로 발급한다", () => {
    const req = new Request("http://localhost/api");
    expect(readActor(req)).toBeNull();
    const issued = readOrIssueActor(req);
    expect(issued.setCookie).toMatch(/^hc_actor=.+HttpOnly; SameSite=Lax/);
  });

  it("발급된 쿠키로 다시 요청하면 같은 해시를 얻고, 해시는 원본 id 를 포함하지 않는다", () => {
    const issued = readOrIssueActor(new Request("http://localhost/api"));
    const cookie = issued.setCookie!.split(";")[0]!;
    const again = readActor(new Request("http://localhost/api", { headers: { cookie } }));
    expect(again?.hash).toBe(issued.hash);
    const id = cookie.split("=")[1]!.split(".")[0]!;
    expect(issued.hash).toBe(hashActorId(id));
    expect(issued.hash).not.toContain(id);
  });
});

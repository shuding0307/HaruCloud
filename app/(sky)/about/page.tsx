import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { SafetyNotice } from "@/components/thoughts/ReportDialog";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";

export const metadata: Metadata = { title: "이용 안내 및 정책" };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-deep-sky">{title}</h2>
      <div className="mt-2 space-y-2 text-[15px] leading-7 text-ink">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <PageShell>
      <Card className="mt-2">
        <h1 className="text-[28px] font-bold text-deep-sky">HaruCloud 이용 안내</h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          하루 구름은 오늘의 고민을 익명으로 하늘에 띄우고, 다른 사람의 고민에 조용히 공감을 보내는 곳이에요.
        </p>

        <Section title="익명으로 이용해요">
          <p>가입, 닉네임, 이메일 없이 이용할 수 있어요. 다른 사람에게 보이는 프로필이나 개인 메시지 기능은 없어요.</p>
          <p>
            공감 중복을 막기 위해 브라우저에 무작위 익명 식별 쿠키를 하나 저장해요. 서버에는 이 값을 그대로 저장하지
            않고 되돌릴 수 없는 해시값만 남겨요.
          </p>
        </Section>

        <Section title="24시간 뒤 사라져요">
          <p>모든 고민은 서버 시각 기준으로 공개 후 24시간이 지나면 하늘에서 사라지고, 읽기와 공감도 막혀요.</p>
          <p>
            사라진 고민의 원문과 공감 기록은 정기 정리 작업(약 10분 간격)에서 삭제돼요. 원문을 다른 곳에 따로 보관하지
            않아요.
          </p>
        </Section>

        <Section title="신고와 보존 정책">
          <p>
            괴롭힘·혐오, 개인정보 노출, 스팸·광고, 자해·폭력 등 안전 우려가 있는 글은 상세 화면의 ⋯ 메뉴에서 신고할 수
            있어요. 신고자는 공개되지 않아요.
          </p>
          <p>
            서로 다른 신고가 3건 이상 쌓인 글은 검토를 위해 하늘에서 잠시 내려가요. 신고된 글은 검토 목적에 한해 공개
            만료 후 최대 7일까지만 보존한 뒤 삭제하고, 신고 기록(사유·시각)은 30일 후 삭제해요.
          </p>
          <p className="text-ink-soft">
            현재 운영자 검토 도구는 준비 중이라, 신고가 즉시 처리되거나 결과가 안내되지는 않아요.
          </p>
        </Section>

        <Section title="남용 방지">
          <p>
            짧은 시간에 너무 많은 글·공감·신고가 오면 잠시 제한될 수 있어요. 이를 위해 접속 IP는 원문이 아닌 해시값으로만
            짧게(최대 1일) 기록돼요.
          </p>
        </Section>

        <Section title="도움이 필요할 때">
          <SafetyNotice />
        </Section>

        <Section title="건의 · 문의 · 피드백">
          <p>HaruCloud를 쓰면서 느낀 점이나 바라는 점이 있다면 편하게 남겨주세요.</p>
          <div className="pt-2">
            <FeedbackForm />
          </div>
        </Section>
      </Card>
    </PageShell>
  );
}

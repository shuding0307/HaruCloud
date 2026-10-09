export function MockModeBanner() {
  return (
    <div
      role="note"
      className="relative z-20 bg-peach/95 px-4 py-2 text-center text-[13px] leading-5 text-ink"
    >
      <strong className="font-semibold">체험 모드</strong> · 실제 서비스에 연결되지 않았어요. 글은 이 서버의
      메모리에만 잠시 저장되고 다른 사람과 공유되지 않아요.
    </div>
  );
}

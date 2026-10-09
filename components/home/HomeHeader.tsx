"use client";

import { useEffect, useSyncExternalStore } from "react";
import { s } from "./classes";
import { useSkyMode } from "./useSkyMode";

export const SKY_COPY = {
  day: {
    title: "오늘 하늘에 뜬 고민",
    sub: "구름은 하루가 지나면 흩어져요",
    label: "마음속 고민을 하늘에 띄워보세요",
  },
  night: {
    title: "오늘 밤 반짝이는 고민",
    sub: "별이 된 고민은 아침이 오면 잠들어요",
    label: "잠들기 전, 고민을 별로 띄워보세요",
  },
} as const;

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const noop = () => () => {};
const localDate = () => {
  const d = new Date();
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${DAYS[d.getDay()]}요일`;
};

/** 날짜는 사용자 로컬 시각이라 브라우저에서만 채운다. 낮/밤 문구는 둘 다 렌더하고 CSS 로 고른다. */
export function HomeHeader() {
  const date = useSyncExternalStore(noop, localDate, () => "");
  const sky = useSkyMode();

  useEffect(() => {
    document.title = `HaruCloud 하루구름 · ${SKY_COPY[sky].title}`;
  }, [sky]);

  return (
    <header className={s.head}>
      <h1 className={s.brand}>
        HaruCloud <span className={s.brandKo}>하루구름</span>
      </h1>
      <p className={s.date}>{date}</p>
      <h2 className={s.title}>
        <span className={s.onlyDay}>{SKY_COPY.day.title}</span>
        <span className={s.onlyNight}>{SKY_COPY.night.title}</span>
      </h2>
      <p className={s.sub}>
        <span className={s.onlyDay}>{SKY_COPY.day.sub}</span>
        <span className={s.onlyNight}>{SKY_COPY.night.sub}</span>
      </p>
    </header>
  );
}

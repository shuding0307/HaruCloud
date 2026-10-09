import { SkyShell } from "@/components/home/SkyShell";
import { HomeHeader } from "@/components/home/HomeHeader";
import { WorryBoard } from "@/components/home/WorryBoard";

export default function HomePage() {
  return (
    <SkyShell>
      <HomeHeader />
      <WorryBoard />
    </SkyShell>
  );
}

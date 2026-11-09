import { Suspense } from "react";
import { VillageRoute } from "@/components/village/VillageRoute";

export const metadata = {
  // Generic, photo-free preview. Never include participant photos or names here.
  title: "Snow Village — 겨울 마을에 초대받았어요",
  description: "빈 집에 불을 켜고 친구들의 겨울 마을에 함께해요.",
};

/** S03 — village main scene. Invite links land here directly: /v/?id=<village id>. */
export default function VillagePage() {
  return (
    <Suspense fallback={null}>
      <VillageRoute />
    </Suspense>
  );
}

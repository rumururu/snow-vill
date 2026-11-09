import { VillageView } from "@/components/village/VillageView";

export const metadata = {
  // Generic, photo-free preview. Never include participant photos or names here.
  title: "Snow Village — 겨울 마을에 초대받았어요",
  description: "빈 집에 불을 켜고 친구들의 겨울 마을에 함께해요.",
};

/** S03 — village main scene (invite links land here directly). */
export default async function VillagePage({ params, searchParams }: PageProps<"/v/[id]">) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  return <VillageView villageId={decodeURIComponent(id)} isNew={isNew === "1"} />;
}

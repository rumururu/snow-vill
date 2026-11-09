"use client";

import { useSearchParams } from "next/navigation";
import { VillageView } from "./VillageView";

/** Reads ?id= and ?new=1 on the client (the site is a static export). */
export function VillageRoute() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  // key: switching villages remounts the view so per-village sheet state never leaks.
  return <VillageView key={id} villageId={id} isNew={params.get("new") === "1"} />;
}

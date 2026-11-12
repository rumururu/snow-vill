import { ChildSafety } from "./ChildSafety";

export const metadata = {
  title: "아동 안전 표준 · Child Safety Standards — Snow Village",
  description:
    "Snow Village의 아동 성적 학대·착취(CSAE) 방지 표준과 신고 방법. · Snow Village standards against child sexual abuse and exploitation (CSAE) and how to report.",
};

/**
 * Published child safety (CSAE) standards, required by Google Play for apps in the Social category.
 * Keep it true to what the product does: in-app report (snowvill_report), owner/resident deletion, email contact.
 */
export default function ChildSafetyPage() {
  return <ChildSafety />;
}

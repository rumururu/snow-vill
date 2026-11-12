import { PrivacyPolicy } from "./PrivacyPolicy";

export const metadata = {
  title: "개인정보처리방침 · Privacy Policy — Snow Village",
  description: "Snow Village가 어떤 정보를 왜 처리하고 어떻게 지우는지 안내합니다. · What Snow Village processes, why, and how it is deleted.",
};

/**
 * Privacy policy. Content mirrors what the code actually does (supabase/migrations,
 * supabase/functions/snowvill-photo, src/store). Update every language in ./policy together.
 */
export default function PrivacyPage() {
  return <PrivacyPolicy />;
}

import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "개인정보처리방침 — Snow Village",
  description: "Snow Village가 어떤 정보를 왜 처리하고 어떻게 지우는지 안내합니다.",
};

const EFFECTIVE_DATE = "2026-11-09";
const CONTACT = "mkideabox.feedback@gmail.com";

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="mt-7" aria-labelledby={`p${n}`}>
      <h2 id={`p${n}`} className="text-base font-bold text-night">
        {n}. {title}
      </h2>
      <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-night/85">{children}</div>
    </section>
  );
}

/**
 * Privacy policy. Content mirrors what the code actually does (supabase/migrations,
 * supabase/functions/snowvill-photo, src/store). Update both together.
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-[640px] px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-16">
      <header className="flex items-center gap-1">
        <Link href="/" aria-label="처음 화면으로" className="grid h-11 w-11 place-items-center rounded-full text-xl text-night hover:bg-night/5">
          ←
        </Link>
        <span className="text-sm font-semibold text-night/70">Snow Village</span>
      </header>

      <h1 className="mt-4 text-2xl font-extrabold text-night">개인정보처리방침</h1>
      <p className="mt-2 text-sm text-night/70">
        운영: mkideabox · 문의: <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a> · 시행일: {EFFECTIVE_DATE}
      </p>

      <Section n={1} title="요약">
        <p>
          Snow Village(이하 &quot;서비스&quot;)는 회원가입이 없고 이름·이메일·전화번호를 받지 않습니다. 사용자가 직접 입력한
          마을 이름, 닉네임, 한마디와 선택해서 올린 사진 한 장을 마을에 보여 주기 위해 처리합니다. 사진은 공개 저장소가
          아닌 비공개 저장소에 두고, 마을에서 집을 눌렀을 때만 잠깐 동안 유효한 주소로 보여 줍니다. 광고와 분석 도구는
          쓰지 않습니다.
        </p>
      </Section>

      <Section n={2} title="처리하는 정보와 목적">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>마을 이름</b>(필수): 마을을 만들고 보여 주기 위해.
          </li>
          <li>
            <b>닉네임·집 스타일</b>(필수), <b>한마디</b>(선택, 60자 이내): 내 집을 마을에 보여 주기 위해.
          </li>
          <li>
            <b>사진</b>(선택, 1장): 내 집의 사진 액자에 보여 주기 위해. 올릴 때 정사각형으로 잘라 512px로 줄이고, 촬영 위치(GPS)
            등 사진 속 메타데이터(EXIF)를 기기와 서버에서 모두 지웁니다.
          </li>
          <li>
            <b>무작위 설치 ID</b>: 브라우저가 처음 만든 무작위 번호입니다. 같은 브라우저가 한 마을에 집을 두 번 짓지 않게 하고
            짧은 시간에 요청을 너무 많이 보내는 것을 막는 데 씁니다. 광고 ID나 기기 ID가 아닙니다.
          </li>
          <li>
            <b>요청 기록</b>(설치 ID·요청 종류·시각): 남용 방지용이며 하루가 지나면 자동으로 지웁니다.
          </li>
          <li>
            <b>신고 내용</b>: 부적절한 집을 신고하면 대상 집과 신고 시각, 신고한 설치 ID를 확인·조치를 위해 보관합니다.
          </li>
          <li>
            <b>접속 기록</b>: 웹사이트를 열 때 IP 주소, 브라우저 정보 등이 호스팅 사업자(Cloudflare)와 서버 사업자(Supabase)의
            시스템에서 서비스 제공과 보안을 위해 처리될 수 있습니다. 운영자는 이를 따로 모아 저장하지 않습니다.
          </li>
        </ul>
      </Section>

      <Section n={3} title="누가 볼 수 있나요">
        <p>
          마을 링크를 가진 사람은 누구나 그 마을의 이름, 집들의 닉네임·한마디·입주 날짜를 볼 수 있고, 집을 누르면 사진을 볼 수
          있으며, 빈 집에 입주할 수 있습니다. 링크는 믿을 수 있는 사람에게만 보내 주세요. 마을 공유 카드 이미지에는 사진·닉네임·
          한마디가 들어가지 않습니다. 서비스는 검색 엔진에 노출되지 않도록 설정되어 있습니다.
        </p>
      </Section>

      <Section n={4} title="브라우저에 저장하는 정보">
        <p>
          서비스는 쿠키를 직접 만들지 않습니다. 다만 서버(Supabase) 앞단의 Cloudflare가 자동화된 공격을 막기 위해 보안 쿠키
          (__cf_bm, 30분)를 설정할 수 있습니다. 브라우저의 로컬 저장소(localStorage)에 설치 ID와, 내가 만든 마을·내 집을 관리할 수
          있게 해 주는 비밀값을 저장합니다. 샘플 마을에서 해 본 내용은 그 탭의 임시 저장소(sessionStorage)에만 남고 서버로 보내지
          않습니다. 서버는 이 비밀값 자체가 아니라 되돌릴 수 없게 변환한 값(해시)만 보관합니다. 브라우저의 사이트
          데이터를 지우면 이 비밀값도 사라져 그 브라우저에서 더 이상 내 집을 비우거나 마을을 지울 수 없게 됩니다. 이때는 아래
          메일로 요청해 주세요.
        </p>
      </Section>

      <Section n={5} title="보관 기간과 삭제">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            내 집을 누르고 <b>&apos;내 집 비우기&apos;</b>를 하면 그 집의 닉네임·한마디·사진이 바로 지워집니다.
          </li>
          <li>
            마을을 만든 사람은 <b>&apos;마을 삭제&apos;</b>로 마을과 모든 집, 사진, 관련 신고를 한 번에 지울 수 있습니다. 마을을
            만든 사람은 마을 안의 다른 집도 비울 수 있습니다.
          </li>
          <li>지우지 않은 정보는 사용자가 지우거나 서비스가 종료될 때까지 보관하며, 서비스를 종료하면 모두 지웁니다.</li>
          <li>요청 기록은 하루 뒤 자동으로 지웁니다.</li>
          <li>
            브라우저 정보를 지워서 직접 삭제할 수 없다면 마을 링크와 닉네임을{" "}
            <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>로 알려 주세요. 확인 후 지웁니다.
          </li>
        </ul>
      </Section>

      <Section n={6} title="처리를 맡기는 회사 (국외 이전 포함)">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>Supabase, Inc.</b>(미국): 마을·집 정보와 사진의 저장 및 처리. 데이터는 서울 리전(ap-northeast-2) 서버에 저장되며,
            인터넷을 통해 사용자가 정보를 보낼 때 전송됩니다. 보관 기간은 위 5항과 같습니다.{" "}
            <a className="underline" href="https://supabase.com/privacy" rel="noreferrer" target="_blank">
              개인정보처리방침
            </a>
          </li>
          <li>
            <b>Cloudflare, Inc.</b>(미국, 전 세계 네트워크): 웹사이트 전송과 보안. 접속 시 IP 주소 등 접속 정보가 처리됩니다.{" "}
            <a className="underline" href="https://www.cloudflare.com/privacypolicy/" rel="noreferrer" target="_blank">
              개인정보처리방침
            </a>
          </li>
        </ul>
        <p>위 회사들에 정보를 팔거나 광고 목적으로 제공하지 않습니다.</p>
      </Section>

      <Section n={7} title="안전하게 지키는 방법">
        <p>
          모든 통신은 HTTPS로 암호화합니다. 사진은 공개 주소가 없는 비공개 저장소에 두고 2분 동안만 유효한 주소로 보여 줍니다.
          데이터베이스는 서비스 기능을 통해서만 접근할 수 있게 막아 두었고, 관리용 비밀값은 해시로만 저장합니다. 입력 길이와 사진
          형식·크기를 서버에서 다시 확인하고, 요청 횟수를 제한합니다.
        </p>
      </Section>

      <Section n={8} title="아동의 개인정보">
        <p>
          서비스는 만 14세 미만 아동을 대상으로 하지 않으며, 만 14세 미만 아동의 정보를 알면서 처리하지 않습니다. 만 14세 미만
          아동의 정보가 올라온 것을 알게 되면{" "}
          <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>로 알려 주세요. 확인 후 지웁니다.
        </p>
      </Section>

      <Section n={9} title="이용자의 권리">
        <p>
          자신의 정보를 보거나 고치거나 지워 달라고 요청할 수 있고, 처리를 멈춰 달라고 요청할 수 있습니다. 위 메일로 연락해 주시면
          지체 없이 처리하고 결과를 알려 드립니다.
        </p>
      </Section>

      <Section n={10} title="개인정보 보호책임자 및 변경">
        <p>
          개인정보 보호책임자: mkideabox 운영자 ·{" "}
          <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>
        </p>
        <p>이 방침이 바뀌면 이 페이지에 새 시행일과 함께 게시합니다.</p>
      </Section>
    </main>
  );
}

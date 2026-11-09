# Mobile UI/UX specification

## Visual tokens
Ivory #F6F0E4; sage #708B82; indigo #404F70; wood #C88A56; glow #E7B66B; background #EAF1F5. Soft rounded panels, clean sans-serif Korean UI, 2–3 tone cel shading, no heavy black outline. Cozy miniature isometric 2D. Game art uses consistent 2:1 isometric projection.

## Layout
Reference viewport 390×844; support 320+; centered 480px max. Safe-area aware sticky actions. Keep primary CTA above fold when feasible. Scene should occupy largest area on village page, not navigation chrome.

## S01 landing
Logo, concise proposition '친구들과 만드는 우리만의 겨울 마을', hero scene, CTA '무료로 마을 만들기', caption '회원가입 없이 바로 시작'. Invite links bypass landing.

## S02 create
Back, heading '우리 마을의 이름은?', one required text field, scene preview, capacity notice, CTA '마을 생성하기'. After creation prompt owner to claim first house. Persist creator ownership securely; provide recovery before public release.

## S03 village main
Top: back/title/overflow. Occupancy count e.g. 3/8. Main interactive scene with 8 deterministic house positions, central tree and paths. Empty house tap → S04; occupied house tap → S05. Bottom: '내 집 만들기' (when eligible) and '친구 초대'. Show animated 0.6s house illumination on successful claim; no motion if prefers-reduced-motion. Full village allows viewing/sharing and new village creation.

## S04 claim house
Sheet with preview, nickname, 3 house swatches, optional image upload/crop, optional message <=60 chars, fallback profile illustration, CTA '내 집 완성하기'. Validate inline, preserve draft on failed upload, show progress, retry safely.

## S05 photo-frame
Sheet titled '{nickname}의 작은 집', warm cream frame and 1:1 photo or fallback, message, joined date, report menu. Photos are not visible in the shared-card preview. Explicit close and focus management.

## S06 complete/share
Title '우리 마을이 완성됐어요!', finished illuminated scene, photo-free 1080×1350 card, share/download actions, option to create another village. Sharing is allowed before 8/8 completion.

## Scene geometry
World coordinates 1024×1024, 8 slots in rear-left/rear-right/left-upper/right-upper/left-lower/right-lower/front-left/front-right positions; center tree. Render rear to front; art anchor = ground-center; clickable hit regions min 44 CSS px. Fixed camera for MVP; no zoom/pan. Use original vector mockup assets/mockups/village-concept.svg only as design guidance, not as exact production art.

## UI states
Skeleton; load failure/retry; expired invite; private/forbidden; full village; slot collision; image upload rejected; disconnected; duplicate participation; photo removed; reduced motion. Never reveal private photo in OG preview.

## Copy style
Warm, short Korean text; avoid deceptive countdowns and guilt-driven sharing. Examples: '빈 집에 불을 켜주세요', '친구를 초대해 마을을 완성해요', '사진 없이도 참여할 수 있어요'.

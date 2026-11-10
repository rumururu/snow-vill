# Source art — provenance

Generated 2026-11-10 with **ChatGPT image generation** (OpenAI) in the original Snow Village planning conversation, driven through the web UI (owner's ChatGPT Plus account, Playwright over CDP). Files here are the untouched generator outputs, stored as lossless WebP, except:

- `house_sage_lit.webp`: the generator baked a checkerboard into the "transparent" background; it was removed with `rembg` (u2net, alpha matting). Silhouette vs master IoU 0.983.
- `layout_guide.webp`: our own layout sketch, uploaded as a composition guide for the background (not art).

Design intent: original assets whose *mood and level of finish* follow the third-party images ChatGPT showed during planning (search results: isometric snowy cottages, miniature dioramas, snow-globe villages). Those references were not traced, uploaded or used as image inputs; the prompts explicitly asked for original designs. Review before commercial use (see docs/05-art-direction.md QA list).

Consistency checks (alpha-mask IoU vs master, threshold ≥ 0.90; edge shift ≤ 3%):
sage 0.983 / 0.5%, indigo 0.986 / 0.5%, empty 0.968 / 1.0%, tree base vs complete 0.970 / 0.3%.

Added 2026-11-10 (same chat): `background_aurora.webp` (edit of the background; pixel alignment vs original measured, best shift (0,0)), `decor_sled.webp`, `decor_snowfamily.webp` (free decorations unlocked by house count). `build_assets.py` also cuts a **foreground layer** (`*_front.webp`: everything outside the fence on the front side) from each background so front fences/lamps/snowman are drawn over houses and props.

Delivery files are produced by `scripts/build_assets.py` → `public/assets/` + `src/lib/asset-geometry.json`.

## Prompts (verbatim, in order)

### Prompt 1
네가 이 대화에서 기획한 Snow Village가 실제로 구현돼서 snow.mkideabox.com 에 올라갔어. 그런데 지금 쓰는 집·마을 그림은 기획 문서의 단순한 도형 목업이라 친구한테 보여주기 부끄러운 수준이야. 내가 이 기획에 혹했던 건 네가 대화 중간에 보여준 이미지들 — 눈 덮인 아이소메트릭 오두막, 불빛이 새어 나오는 겨울 마을, 미니어처 디오라마, 스노우글로브 속 마을 — 을 보고 그럴듯한 앱이 나올 것 같아서였어. 그러니 그 이미지들의 완성도와 분위기를 참고해서 발전시킨 실제 서비스용 에셋을 네가 책임지고 직접 만들어줘.
조건:
- 참고 이미지들은 다른 사람 저작물이니 특정 작품을 그대로 베끼지 말고, 분위기와 완성도 수준만 참고한 오리지널 디자인으로.
- 에셋은 하나씩 만들 거야. 첫 번째는 모든 집의 기준이 될 "마스터 집" 1채만 그려줘.
마스터 집 사양:
- 입체감 있는 미니어처 디오라마 느낌(부드러운 3D 렌더풍)의 아늑한 크리스마스 오두막, 2:1 아이소메트릭, 오른쪽 앞에서 본 3/4 시점(왼쪽 면과 오른쪽 면이 모두 보이게)
- 나무 판자 벽(#C88A56 계열), 눈이 소복이 쌓인 인디고 지붕(#404F70 계열), 창문 여러 개에서 새어 나오는 따뜻한 호박색 불빛(#E7B66B), 굴뚝, 문 위 작은 조명줄과 리스 같은 섬세한 디테일
- 건물 아래에 눈 덮인 작은 정사각형 아이소메트릭 받침 타일 하나까지만 포함하고, 그 밖의 땅·배경·하늘은 없이 투명 배경 PNG로
- 정사각형 캔버스, 받침 타일까지 전체가 잘리지 않게 가운데 두고 여백을 넉넉히, 글자·워터마크 없음
- 이 집을 기준으로 나중에 같은 모양·같은 각도·같은 크기에서 벽·지붕 색만 바꾼 세이지·인디고 버전과 불 꺼진 버전을 만들 거니까 실루엣은 또렷하게

### Prompt 2
아주 좋아, 이게 마스터 집이야. 이제 방금 만든 마스터 집 이미지를 그대로 편집해서 "세이지" 버전을 만들어줘.
- 건물 모양, 지붕 형태, 창문·문·굴뚝 위치, 받침 타일, 카메라 각도, 크기, 캔버스 안 위치를 마스터와 완전히 똑같이 유지
- 바꾸는 건 색만: 나무 판자 벽은 세이지 그린(#708B82 계열), 지붕은 따뜻한 갈색 나무 지붕(#9A6440 계열), 덧창은 벽보다 조금 진한 세이지
- 눈, 불빛, 조명줄, 리스, 작은 트리와 선물 같은 소품은 그대로
- 투명 배경 PNG, 정사각형, 글자 없음

### Prompt 3
세이지 버전 좋아. 한 가지만: 방금 이미지는 배경에 체크무늬가 그림으로 들어가 있었어. 다음부터는 체크무늬 없이 진짜 투명(알파) 배경으로 부탁해.
이번엔 같은 방식으로 마스터 집을 편집해서 "인디고" 버전을 만들어줘.
- 건물 모양, 지붕 형태, 창문·문·굴뚝 위치, 받침 타일, 카메라 각도, 크기, 캔버스 안 위치는 마스터와 완전히 똑같이
- 색만 변경: 나무 판자 벽은 깊은 인디고 블루(#4C5C80 계열), 지붕은 차분한 청록빛 세이지(#5E7A70 계열), 덧창은 벽보다 조금 진한 인디고
- 눈, 창문 불빛, 조명줄, 리스, 작은 트리와 선물 같은 소품은 그대로
- 진짜 투명 배경 PNG, 정사각형, 글자 없음

### Prompt 4
세 가지 다 아주 좋아. 이제 마지막 집 에셋으로, 아직 주인이 없는 "빈 집" 버전을 마스터 집을 편집해서 만들어줘.
- 건물 모양, 지붕, 창문·문·굴뚝 위치, 받침 타일, 카메라 각도, 크기, 캔버스 안 위치는 마스터와 완전히 똑같이
- 모든 불을 끈 상태: 창문은 어두운 청회색 유리에 성에가 낀 느낌, 조명줄·랜턴 불빛 없음, 따뜻한 빛 번짐 없음
- 색은 주인이 정해지기 전이라 채도를 낮춘 차가운 회백색 톤(벽은 바랜 회색 나무, 지붕은 연한 청회색), 눈은 그대로 소복이
- 리스·선물·작은 트리 같은 장식은 빼서 썰렁하지만 예쁜 느낌으로
- 진짜 투명 배경 PNG(체크무늬 그림 없이), 정사각형, 글자 없음

### Prompt 5
빈 집도 완벽해. 이제 마을 한가운데 광장에 놓일 "크리스마스 트리"를 같은 스타일로 만들어줘. 마을이 8채 모두 완성됐을 때 쓰는 "완성 버전"이야.
- 집들과 같은 미니어처 디오라마 3D 렌더 느낌, 같은 2:1 아이소메트릭 카메라 각도와 조명
- 키 큰 전나무에 눈이 살짝 얹혀 있고, 따뜻한 전구 장식이 가득 켜져 있고, 꼭대기에 빛나는 금색 별, 작은 오너먼트(호박색·붉은색·세이지색)
- 트리 아래 작은 눈 둔덕과 선물 상자 몇 개까지만, 그 외 땅·배경 없음
- 집 한 채보다 약간 크게 보일 비율(집 높이의 1.3배 정도), 정사각형 캔버스 가운데, 여백 넉넉히
- 진짜 투명 배경 PNG(체크무늬 그림 없이), 글자 없음

### Prompt 6
트리 좋아. 이제 이 완성 버전 트리를 편집해서, 마을이 아직 덜 채워졌을 때 쓰는 "기본 버전"을 만들어줘.
- 트리 모양, 크기, 각도, 받침 눈 둔덕, 캔버스 안 위치는 완성 버전과 완전히 똑같이
- 전구는 모두 꺼진 상태(불빛·빛 번짐 없음), 꼭대기 별은 빛나지 않는 무광 금색, 오너먼트와 리본은 그대로
- 선물 상자와 랜턴은 빼고 눈 둔덕만
- 진짜 투명 배경 PNG(체크무늬 그림 없이), 정사각형, 글자 없음

### Prompt 7
트리 두 버전 모두 좋아. 마지막으로 이 모든 것이 올라갈 "마을 배경"을 만들어줘. 첨부한 이미지는 배치 가이드야(그림 스타일 참고용 아님).
- 가이드의 흰색 큰 마름모 영역은 집 8채와 가운데 트리를 내가 직접 올릴 자리야. 이 영역은 아무것도 없는 평평하고 깨끗한 눈밭으로만 두고, 집·나무·길·소품을 절대 그리지 마. (연한 선으로 그린 9개 칸이 각각 집과 트리가 놓일 위치)
- 그 마름모 바깥만 꾸며줘: 뒤쪽엔 눈 덮인 전나무 숲과 먼 언덕, 해 질 녘의 부드러운 푸른빛 겨울 하늘과 은은한 별, 양옆과 앞쪽엔 눈 쌓인 낮은 나무 울타리, 가로등 몇 개, 작은 눈사람 하나, 눈 덮인 덤불 정도
- 앞서 만든 집·트리와 같은 미니어처 디오라마 3D 렌더 스타일, 같은 2:1 아이소메트릭 카메라와 조명. 전체가 하나의 둥근 눈 덮인 디오라마 섬처럼 보이면 좋아
- 집들의 따뜻한 창문 불빛이 돋보이도록 배경은 차분한 푸른 저녁 톤으로
- 정사각형, 배경은 투명하지 않게 꽉 채운 이미지, 글자 없음

### Prompt 8
이제 유료 "겨울 축제 꾸미기 팩"에 들어갈 에셋을 만들 거야. 첫 번째는 방금 만든 마을 배경의 특별 버전이야. 방금 만든 마을 배경 이미지를 그대로 편집해줘.
- 구도, 카메라, 섬 모양, 울타리·가로등·눈사람·나무의 위치와 크기, 가운데 빈 눈밭 영역은 원본과 완전히 똑같이 유지 (집을 올릴 자리가 어긋나면 안 돼)
- 바꾸는 것: 하늘에 초록·보랏빛 오로라가 은은하게 흐르게, 별을 조금 더, 울타리를 따라 따뜻한 전구 조명줄을 걸고, 가로등 불빛을 조금 더 따뜻하게
- 가운데 눈밭에는 여전히 아무것도 그리지 마
- 정사각형, 꽉 찬 배경 이미지, 글자 없음

### Prompt 9
오로라 배경 아주 좋아. 이제 같은 꾸미기 팩에 들어갈 소품 두 개 중 첫 번째를 만들어줘: "선물 가득한 썰매".
- 앞서 만든 집·트리와 같은 미니어처 디오라마 3D 렌더 스타일, 같은 2:1 아이소메트릭 카메라 각도와 따뜻한 조명
- 빨간 나무 썰매에 리본 묶인 선물 상자들이 수북이 쌓여 있고, 썰매 앞에 작은 랜턴, 바닥에 얇은 눈 둔덕
- 크기는 집 한 채의 절반 정도로 보이게, 정사각형 캔버스 가운데, 여백 넉넉히
- 진짜 투명 배경 PNG(체크무늬 그림 없이), 그림자·땅·배경 없음, 글자 없음

### Prompt 10
썰매 좋아. 두 번째 소품: "눈사람 가족".
- 같은 미니어처 디오라마 3D 렌더 스타일, 같은 2:1 아이소메트릭 카메라와 조명
- 크기가 다른 눈사람 세 명(아빠·엄마·아이)이 나란히, 각자 색이 다른 털모자와 목도리(호박색·세이지·인디고), 아이 눈사람은 작은 선물 상자를 안고 있음, 발밑에 얇은 눈 둔덕 하나
- 크기는 집 한 채의 절반 정도로 보이게, 정사각형 캔버스 가운데, 여백 넉넉히
- 진짜 투명 배경 PNG(체크무늬 그림 없이), 땅·배경 없음, 글자 없음

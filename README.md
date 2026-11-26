# Project GL 『이클립스 세븐』 첫 플레이 프로토타입 v0.7

3D 액션 JRPG · 3인칭 백뷰(명조 방식) · PC + 휴대폰
업데이트 내역은 updates.json 에 버전별로 정리되어 있습니다.

## 실행 방법
- **PC** : index.html 을 브라우저로 열기
- **휴대폰 (가장 간단)** : GL_eclipse7_v0.7_onefile.html 하나만 휴대폰으로 옮겨 브라우저(크롬·사파리)로 열기
  - 모든 코드가 HTML 하나에 들어 있어 폴더·압축 없이 실행됩니다.
- **휴대폰 (주소로 접속)** : 폴더째 GitHub Pages 에 올리고 주소로 접속
- 터치 화면이면 자동으로 휴대폰 조작. 주소 뒤에 ?mobile=1 (휴대폰 조작) / ?mobile=0 (PC 조작) 으로 강제할 수 있음
- 휴대폰은 가로로 돌려서 플레이

## 파티 편성
- 타이틀 → 파티 편성 화면. 이안(리더·관측)은 고정, 동료 6명(태론·세레나·바렌·케이·클레아·노아) 중 2명 선택
- 고른 순서가 2번·3번 자리 (1/2/3 짧게 = 교체, 0.5초 길게 = 조력). 마지막 편성은 기기에 저장
- 일시정지 화면 '파티 다시 편성' 버튼으로 다시 고를 수 있음 (처음부터 시작)

## 이안 : 파쇄 흔적 · 소거 · 인과 역류
- 이안의 파쇄 공격이 적에게 **파쇄 흔적**을 쌓음 (적 머리 위 파란 막대)
- **소거** : 4타(궤적 합체 절단) 직후 0.7초 안에 공격. 흔적 40 이상인 적만 (4타 한 바퀴면 보통 도달)
- 소거할 때마다 **반작용** +18 → 60 불안정 / 100 임계
- **자의 발동** : 불안정 이상에서 R 길게(0.5초). 흰 테두리 + '◆ 자의 발동'
- **강제 폭주** : 임계 후 3초 안에 직접 발동 안 하면 자동. 붉은 글리치 테두리 + '▲ 강제 폭주', 대기 동료도 피해
- 임계 상태에선 다른 동료로 싸우는 중에도 R 길게로 이안을 불러내 자의 발동 가능
- 역류가 끝나면 감각 상실 8초 (이동 둔화, 소거 봉인)
- 수치는 기획 미정 → js/config.js 의 임시값

## 휴대폰 진동
- 화면 흔들림·피격·퍼펙트 가드·그로기·궁극기·전투 불능·승패에 맞춰 진동
- 일시정지 화면 오른쪽 위 버튼으로 켜기/끄기 (PC는 V 키), 설정은 기기에 저장
- 안드로이드(크롬·삼성 인터넷)에서 동작. 아이폰 사파리는 웹 진동을 지원하지 않음
- Claude 아티팩트 화면 안에서는 브라우저가 진동을 막음 → 한 파일 HTML을 직접 열거나 GitHub Pages 주소로 접속

## 마스터 모드 (테스트 모드)
- PC : ` 키(숫자 1 왼쪽) = 진입 / 나가기, H = 패널 열기 / 숨기기 (옵션 유지)
- 휴대폰 : 세 손가락으로 탭 = 진입 / 나가기, 화면 아래 MASTER 표시 탭 = 패널
- 패널이 열려 있으면 게임이 멈춤. 나가면 모든 테스트 옵션이 꺼짐
- 무적 · 쿨타임 없음 · 궁극기 가득 · 원샷 · 적 정지 · 관측 무한 · 판정 범위 · 정보 표시 · 게임 속도
- 웨이브/보스/페이즈/기믹 바로가기, 적 소환, 회복

## 에셋 교체 방법 (나중에 실제 모델로 바꿀 때)
- js/assets/characters.js : 아바타 캐릭터 — defs(외형) + drawPlayer / humanoid / pose(애니메이션 이름)
- js/assets/weapons.js    : 무기 아티팩트 — ian / baren / kay / taron / serena / clea / noah / guardianShield / guardianMace 의 draw(G, M, opt)
- js/assets/monsters.js   : 적·보스 — shard / eroder / clasher / guardian / tempus
- js/assets/effects.js    : 이펙트 — solid(3D) / decals(바닥) / glow(빛 더하기) / debug(판정 표시)
- js/assets/background.js : 배경 — themes(스테이지별 색) / build / drawBase / drawSolid / drawGlow
- 각 파일 맨 위 style / defs / themes 에서 색·크기를 바로 바꿀 수 있음

## 파일 구조
| 파일 | 역할 |
|---|---|
| index.html | PC·서버용 진입점 (js 폴더 파일을 불러옴) |
| GL_eclipse7_v0.7_onefile.html | 휴대폰용 한 파일 빌드본 — 수정은 원본(js 폴더)에서 하고 다시 빌드 |
| updates.json | 버전별 업데이트 내역 |
| css/style.css | 화면 스타일 |
| js/config.js | **모든 수치** — 밸런스는 여기만 수정 |
| js/utils.js | 수학/판정 도구 |
| js/input.js | 키보드·마우스 조작, 0.5초 홀딩 판정 |
| js/haptics.js | 휴대폰 진동 (흔들림·피격 연동) |
| js/touch.js | 휴대폰 터치 조작 (조이스틱, 카메라 드래그, 버튼) |
| js/master.js | 마스터(테스트) 모드 |
| js/combat.js | 피해 공식, 파쇄 게이지, 그로기, 관측, 이펙트 |
| js/party.js | 공통 공격 흐름, 태그, 조력, 소프트 락온, 이안·바렌·케이 기본 기술 |
| js/kits.js | 이안 소거·반작용·인과 역류 + 태론·세레나·클레아·노아 기술 |
| js/partyselect.js | 파티 편성 화면 |
| js/enemies.js | 일반·엘리트 적 |
| js/boss.js | 인과 보스 템푸스 |
| js/stage.js | 필드 3웨이브 → 포털 → 보스전 |
| js/gl3d.js | 자체 WebGL 엔진 (조명·도형·관절 행렬·빛 더하기) |
| js/assets/characters.js | 아바타 캐릭터 + 애니메이션 |
| js/assets/weapons.js | 무기 아티팩트 |
| js/assets/monsters.js | 적·보스 모델 |
| js/assets/effects.js | 이펙트 |
| js/assets/background.js | 배경 |
| js/render.js | 3인칭 카메라, 그리는 순서 |
| js/ui.js | HUD, 지도, 화면 |
| js/main.js | 게임 루프, 화면 크기·회전 대응 |

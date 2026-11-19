# Project GL 『이클립스 세븐』 첫 플레이 프로토타입 v0.4

3D 액션 JRPG · 3인칭 백뷰(명조 방식) · PC + 휴대폰
업데이트 내역은 updates.json 에 버전별로 정리되어 있습니다.

## 실행 방법
- **PC** : index.html 을 브라우저로 열기
- **휴대폰 (가장 간단)** : GL_eclipse7_v0.4_onefile.html 하나만 휴대폰으로 옮겨 브라우저(크롬·사파리)로 열기
  - 모든 코드가 HTML 하나에 들어 있어 폴더·압축 없이 실행됩니다.
- **휴대폰 (주소로 접속)** : 폴더째 GitHub Pages 에 올리고 주소로 접속
- 터치 화면이면 자동으로 휴대폰 조작. 주소 뒤에 ?mobile=1 (휴대폰 조작) / ?mobile=0 (PC 조작) 으로 강제할 수 있음
- 휴대폰은 가로로 돌려서 플레이

## 파일 구조
| 파일 | 역할 |
|---|---|
| index.html | PC·서버용 진입점 (js 폴더 파일을 불러옴) |
| GL_eclipse7_v0.4_onefile.html | 휴대폰용 한 파일 빌드본 — 수정은 원본(js 폴더)에서 하고 다시 빌드 |
| updates.json | 버전별 업데이트 내역 |
| css/style.css | 화면 스타일 |
| js/config.js | **모든 수치** — 밸런스는 여기만 수정 |
| js/utils.js | 수학/판정 도구 |
| js/input.js | 키보드·마우스 조작, 0.5초 홀딩 판정 |
| js/touch.js | 휴대폰 터치 조작 (조이스틱, 카메라 드래그, 버튼) |
| js/combat.js | 피해 공식, 파쇄 게이지, 그로기, 관측, 이펙트 |
| js/party.js | 이안·바렌·케이, 공격·스킬·궁극기, 태그, 조력, 소프트 락온 |
| js/enemies.js | 일반·엘리트 적 |
| js/boss.js | 인과 보스 템푸스 |
| js/stage.js | 필드 3웨이브 → 포털 → 보스전 |
| js/gl3d.js | 자체 WebGL 엔진 |
| js/render.js | 3인칭 카메라, 3D 장면 |
| js/ui.js | HUD, 지도, 화면 |
| js/main.js | 게임 루프, 화면 크기·회전 대응 |

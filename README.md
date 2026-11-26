# 놀이 공부방

아이용 학습 게임 모음 (무한계단 · 풍선 터뜨리기 · 블록 쌓기 · 짝 찾기)
과목: 영어(A~Z) · 수학 · 분수 · 시계 · 돈 · 길이 · 한자(8급~7급)

## 폴더 구조
| 경로 | 내용 |
|---|---|
| index.html | 화면 뼈대 |
| css/style.css | 디자인 (기본 + 크리스마스) |
| js/config.js | Firebase 설정값 (여기만 고치면 됨) |
| js/data-words.js | 영단어 목록 |
| js/data-hanja.js | 한자 목록 |
| js/game.js | 게임·과목 문제 생성 |
| js/skin.js | 디자인 전환 |
| js/login.js
- js/event.js : 크리스마스 복권 이벤트 (신기록 → 복권, 당첨 공유 페이지) | 로그인 · 점수 저장 · 관리자 통계 |
| assets/img/ | 단어 그림 (단어.jpg) |
| assets/audio/ | 단어 음성 (단어.mp3) |

## 단어 추가하기
1. `js/data-words.js`의 WORDS 목록에 `{w:'단어',ko:'뜻',e:'🙂'}` 한 줄 추가
2. `assets/img/단어.jpg`, `assets/audio/단어.mp3` 파일 추가

## 수정 후 반영이 안 보일 때
index.html 안의 `?v=1`을 `?v=2`처럼 올리면 휴대폰이 새 파일을 받습니다.

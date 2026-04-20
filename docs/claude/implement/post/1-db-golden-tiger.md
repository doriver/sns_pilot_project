# 게시판 개선 — 글 제목 추가 & 목록/타임라인 UX 개선

## Context

현재 `Post` 모델은 `content` 만 있고 제목이 없어서, 글 목록(`/posts.html`)과 타임라인(`/index.html`) 모두 본문 앞부분을 잘라서 제목처럼 보여주고 있음. 내용이 길거나 같은 문장으로 시작하면 구분이 어려움.

이번 작업으로:
1. `Post` 스키마에 `title` 필드를 1급 시민으로 도입
2. **글 목록**은 제목 위주의 1줄 리스트(본문 숨김)로 전환 — "훑어보기" 용도
3. **타임라인**은 제목 + 본문 + 최근 댓글 3개까지 카드에 담아 "피드 소비" 용도로 개선

기존 posts 컬렉션은 비우고 새로 시작 (사용자 결정).

## 변경 파일

### 백엔드
- `server/models/Post.js` — `title` 필드 추가 (required, trim, maxlength 120)
- `server/controllers/post.controller.js`
  - `create`: `title` 받아 저장 (누락 시 400)
  - `update`: `title` 수정 지원
  - `timeline`: 상위 10개 post 조회 후, 각 post 별로 `Comment.find({ post: { $in: ids } }).sort({ createdAt: -1 })` 로 한 번에 가져와 post._id 기준 그룹핑, 각 post 에 `comments`(최근 3개, 오래된→최신 순으로 뒤집어 넣기) 와 `commentCount`(전체 개수) 를 붙여 반환. `.lean()` 사용.
- 라우트 변경 없음 (`server/routes/post.routes.js` 그대로)

### 프론트엔드
- `public/post-new.html` — `<input name="title">` 을 본문 위에 추가 (required, maxlength 120)
- `public/posts.html` — 제목만 1줄로 표시하는 리스트 레이아웃으로 교체
  - 구조: `제목` · `작성자` · `날짜` · `조회 N` · `좋아요 N` · `댓글 N` 한 줄
  - 본문 프리뷰 삭제
  - 제목 클릭 시 상세로 이동
- `public/index.html` (타임라인) — 카드 내부에 제목(큰 글씨) → 본문 전체 → 이미지 → 메타(좋아요/조회) → 댓글 섹션(최근 3개 + 더보기) 순서로 구성
- `public/post-detail.html` — 카드 상단에 `<h2>${title}</h2>` 추가, 본문과 시각적 분리
- `public/css/style.css` — 목록/타임라인/댓글 스타일 추가 (아래 "스타일" 참고)

### 기존 데이터 정리
- 서버 기동 전 Mongo 쉘 또는 Compass 에서 `db.posts.deleteMany({})` 1회 실행 (title 없는 레거시 문서 제거). 코드로 자동화하지 않음.

## API 응답 변경 사항

- `GET /api/posts/timeline` — 기존 필드 + `comments: Comment[]`(최신 3개, 오래된→최신 순), `commentCount: number`
  - `Comment` 의 형태는 기존 `/api/posts/:id/comments` 응답과 동일 (author populate 포함)
- `GET /api/posts`, `GET /api/posts/:id` — `title` 필드가 포함되어 반환됨 (모델에 추가되므로 자동)
- `POST /api/posts` (multipart) — 요청 body 에 `title` 필수
- `PATCH /api/posts/:id` — `title` 수정 가능

## 스타일(보기 좋게) 방향

`public/css/style.css` 에 추가:
- `.post-row` — 글 목록 1줄 항목. `display: flex; gap: 12px; align-items: center; padding: 10px 4px; border-bottom: 1px solid #eee;`. 제목은 `flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` 처리.
- `.post-row .title a` — 본문 색상, `font-weight: 600`, hover 시 밑줄.
- `.post-row .meta` — 작아진 회색 메타 (작성자·날짜·조회·댓글).
- `.timeline-card` — 기존 `.card` 보다 패딩을 키우고 `h2.title { margin: 0 0 4px; }`, `.content { white-space: pre-wrap; line-height: 1.55; }` 추가.
- `.timeline-card .comments` — 상단 `border-top: 1px dashed #e0e0e0; margin-top: 10px; padding-top: 8px;`, 각 댓글은 `.comment-item { font-size: 0.9em; padding: 4px 0; }` 로 컴팩트하게.
- `.timeline-card .more` — "댓글 N개 더보기" 링크, 작은 글씨 + 우측 정렬.

## 구현 순서

1. `server/models/Post.js` — `title` 필드 추가
2. `server/controllers/post.controller.js` — `create`/`update`/`timeline` 수정 (`Comment` 는 이미 import 되어 있음)
3. `public/post-new.html` — title input 추가
4. `public/posts.html` — 1줄 리스트로 재작성
5. `public/index.html` — 타임라인 카드 재작성 (제목/본문/댓글 3개)
6. `public/post-detail.html` — title 헤더 추가
7. `public/css/style.css` — 새 클래스들 추가
8. Mongo 에서 `db.posts.deleteMany({})` 실행

## 검증

- `npm run dev` 로 서버 기동
- 로그인 → `/post-new.html` 에서 제목/본문/이미지 포함한 글 **3개 이상** 작성
- 각 글에 댓글 **5개 이상** 달기 (타임라인 "더보기" 표시 확인용)
- `/posts.html` — 제목만 한 줄씩 나열, 본문 프리뷰 없음, 클릭 시 상세로 이동
- `/index.html` — 각 카드에 제목(큰 글씨) + 본문 전체 + 이미지 + 최근 댓글 3개 + "댓글 N개 더보기" 링크 확인
- `/post-detail.html` — 제목이 본문 위에 별도로 표시됨, 좋아요/댓글 기존 동작 정상
- title 누락 시 `POST /api/posts` 가 400 반환
- `PATCH /api/posts/:id` 로 title 수정 가능한지 확인 (curl 또는 브라우저 콘솔)

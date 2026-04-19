# 작은 SNS 상세 구현계획

## Context
`docs/plan01.md`의 개략적 기획(회원/게시판/단체채팅 + Express.js + MongoDB + 바닐라 JS)을 실제 구현 가능한 수준으로 구체화한다. 프로젝트는 git만 초기화된 빈 상태이므로, 백엔드 뼈대부터 잡는 것이 목표다.

---

## 1. 기술 스택 확정
- **백엔드**: Node.js + Express.js
- **DB**: MongoDB (Mongoose ODM)
- **인증**: JWT (access token) + bcrypt (비밀번호 해시)
- **파일업로드**: multer (로컬 디스크 저장, `/uploads` 정적서빙)
- **실시간채팅**: Socket.IO
- **검증**: express-validator 또는 zod
- **프론트**: 바닐라 JS + Fetch API + Socket.IO 클라이언트
- **개발도구**: nodemon, dotenv

---

## 2. 디렉토리 구조
```
mini01/
├── server/
│   ├── app.js                 # Express 앱 진입점
│   ├── config/
│   │   ├── db.js              # Mongo 연결
│   │   └── env.js             # 환경변수 로드
│   ├── models/
│   │   ├── User.js
│   │   ├── Post.js
│   │   ├── Comment.js
│   │   ├── Like.js            # 또는 Post에 embedded
│   │   └── ChatRoom.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── post.routes.js
│   │   ├── comment.routes.js
│   │   └── chat.routes.js
│   ├── controllers/           # 라우트 핸들러
│   ├── middlewares/
│   │   ├── auth.js            # JWT 검증
│   │   ├── role.js            # 권한 확인
│   │   ├── upload.js          # multer
│   │   └── error.js
│   ├── sockets/
│   │   └── chat.js            # Socket.IO 핸들러
│   └── utils/
├── public/                    # 프론트 정적 파일
│   ├── index.html             # 타임라인
│   ├── login.html
│   ├── posts.html             # 글 목록(페이지네이션)
│   ├── post-detail.html
│   ├── chat-list.html
│   ├── chat-room.html
│   └── js/
│       ├── api.js             # fetch 래퍼 + 토큰 주입
│       ├── auth.js
│       ├── timeline.js
│       ├── post.js
│       └── chat.js
├── uploads/                   # 업로드 이미지 (gitignore)
├── docs/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 3. 데이터 모델

### User
```js
{
  email: String (unique, required),
  passwordHash: String,
  nickname: String (unique, required),
  profileImage: String,        // 파일경로 또는 URL
  role: 'user' | 'influencer' | 'admin',
  createdAt, updatedAt
}
```

### Post
```js
{
  author: ObjectId(User),
  content: String,
  images: [String],            // 여러 이미지 경로
  viewCount: Number (default 0),
  likeUsers: [ObjectId(User)], // 좋아요 누른 유저 (중복방지)
  createdAt, updatedAt
}
```
- 인덱스: `{ createdAt: -1 }`, `{ viewCount: -1, createdAt: -1 }` (타임라인 정렬용)

### Comment
```js
{
  post: ObjectId(Post),
  author: ObjectId(User),
  content: String,
  createdAt
}
```

### ChatRoom
```js
{
  name: String,
  owner: ObjectId(User),       // 인플루언서
  maxUsers: Number,
  participants: [ObjectId(User)],
  isClosed: Boolean (default false),
  createdAt, closedAt
}
```

---

## 4. REST API 설계

### 인증 (`/api/auth`)
- `POST /signup` — 이메일, 닉네임, 비밀번호, 프로필이미지(optional)
- `POST /login` — JWT 발급
- `GET /me` — 내 프로필 (auth 필요)

### 유저 (`/api/users`)
- `PATCH /me` — 프로필 수정
- `PATCH /:id/role` — 관리자 전용(권한 변경)

### 게시글 (`/api/posts`)
- `GET /timeline` — 메인용 상위 10개 (조회수+작성일 기준 정렬)
- `GET /?page=1&limit=20` — 페이지네이션 목록
- `GET /:id` — 상세 (조회수 +1 원자적 증가: `$inc`)
- `POST /` — 작성 (이미지 업로드, auth)
- `PATCH /:id` — 수정 (작성자만)
- `DELETE /:id` — 삭제 (작성자/관리자)
- `POST /:id/like` / `DELETE /:id/like` — 좋아요 토글

### 댓글 (`/api/posts/:postId/comments`)
- `GET /`
- `POST /` (auth)
- `DELETE /:commentId` (작성자/관리자)

### 채팅방 (`/api/chat-rooms`)
- `GET /` — 목록 (현재참석자수, 제한인원 포함)
- `POST /` — 생성 (인플루언서 role 필요)
- `POST /:id/join` — 참가 (정원·종료 체크)
- `POST /:id/leave`
- `PATCH /:id/close` — owner만

---

## 5. 실시간 채팅 (Socket.IO)
- 네임스페이스 `/chat`, room id = ChatRoom `_id`
- 이벤트:
  - `join` (roomId): 정원·종료 확인 → `socket.join(roomId)` → 참여자 갱신 broadcast
  - `message` ({roomId, text}): 룸 브로드캐스트 (DB 저장 여부는 MVP 제외 가능)
  - `leave` / `disconnect`: 참여자 목록 업데이트
  - `close` (owner만): 룸 종료 알림
- JWT는 `io.use()` 미들웨어에서 핸드셰이크 시 검증

---

## 6. 인증/권한 미들웨어
- `auth`: `Authorization: Bearer <jwt>` 검증 후 `req.user` 주입
- `requireRole(...roles)`: `req.user.role` 확인
  - 채팅방 생성: `requireRole('influencer', 'admin')`
  - 역할 변경: `requireRole('admin')`

---

## 7. 프론트 페이지별 구현 포인트
- **index.html(타임라인)**: `/api/posts/timeline` 호출 → 카드 10개 렌더
- **posts.html**: 페이지네이션 UI, 쿼리스트링으로 페이지 상태 유지
- **post-detail.html**: 이미지, 본문, 조회수·좋아요 버튼, 댓글 리스트/작성폼
- **chat-list.html**: 방 목록 + "현재/최대" 표시, 인플루언서에게만 "생성" 버튼 노출
- **chat-room.html**: Socket.IO 접속, 참가자 사이드바, 메시지 입력/출력
- 공통 `js/api.js`에서 localStorage의 JWT를 헤더에 자동 부착

---

## 8. 구현 순서 (권장)
1. `package.json` 초기화, 의존성 설치, `.env.example`, `.gitignore`, DB 연결
2. User 모델 + 회원가입/로그인/JWT 미들웨어 + 프로필 이미지 업로드
3. Post/Comment 모델 + CRUD + 좋아요 + 조회수 + 페이지네이션/타임라인
4. 프론트: 로그인, 타임라인, 글 목록/상세 페이지
5. ChatRoom 모델 + REST API (생성/목록/참가/종료)
6. Socket.IO 연동 + 채팅 프론트
7. 권한 검증(인플루언서/관리자) 최종 점검 및 에러 핸들링 정리

---

## 9. 수정/생성할 핵심 파일
- **신규**: 위 디렉토리 구조의 모든 파일 (프로젝트가 비어있음)
- **주요**: `server/app.js`, `server/models/*.js`, `server/routes/*.js`, `server/sockets/chat.js`, `public/js/api.js`

---

## 10. 검증 방법 (end-to-end)
1. `npm run dev` 후 MongoDB 연결 로그 확인
2. Postman/curl로:
   - 회원가입 → 로그인 → `/me` 응답 확인
   - 이미지 첨부 글 작성 → 타임라인 조회 → 조회수 증가 확인
   - 좋아요 토글, 댓글 작성/삭제
   - 관리자로 다른 유저 role을 `influencer`로 변경
3. 브라우저에서 두 개 탭으로 동일 채팅방 입장 → 메시지 실시간 수신 확인
4. 정원 초과/종료된 방 입장 거부, 일반 유저의 방 생성 거부 확인
5. JWT 미첨부/만료 시 401 반환 확인

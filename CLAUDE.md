# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

게시판 + 단체 채팅 기능을 작은 SNS를 **Express.js + MongoDB + Socket.IO** 로 구현하는 프로젝트. 프론트엔드는 의도적으로 **바닐라 JS + 정적 HTML** 구조이며 빌드 단계 없음.

## 주요 명령어

- `npm run dev` — nodemon 으로 실행 (엔트리 `server/app.js`)
- `npm start` — watcher 없이 실행
- 테스트, 린터, 빌드 파이프라인은 구성되어 있지 않음

실행에는 MongoDB 가 필요. 설정은 `.env` → `server/config/env.js` 를 통해 로드 (`PORT`, `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`). 모두 dev 기본값이 있어 로컬 Mongo 가 `mongodb://localhost:27017/mini01` 에 떠 있으면 `.env` 없이도 부팅됨.

## 아키텍처

**단일 프로세스에서 Express + Socket.IO 를 함께 구동.** `server/app.js` 에서 Express 앱을 만든 뒤 `http.Server` 로 감싸고, Socket.IO 서버(CORS `*`)를 붙인 다음 `initChatSocket(io)` → `connectDB()` → `listen` 순으로 시작. REST 와 WebSocket 이 같은 프로세스/포트를 공유함.

**백엔드 레이어 (`server/`):**
- `routes/` → `controllers/` → `models/` (Mongoose)
- 미들웨어:
  - `auth` — JWT Bearer 검증 후 `req.user` 주입
  - `requireRole(...roles)` — 역할 기반 접근 제어
  - `upload` — multer 디스크 스토리지, `uploads/` 로 저장, 5MB 제한, 이미지만 허용
  - `error` — `notFound` + `errorHandler`
- 정적 파일: `/uploads` 는 업로드 디렉토리, `public/` 는 프론트엔드 (여러 `.html` + `public/js/` 의 `api.js`, `nav.js` 등)
- API prefix 는 `/api`. `notFound` 는 `/api` 로 한정되어 있어서 API 가 아닌 경로는 정적 파일로 흘러감

**인증 모델.** JWT 의 `sub` 에 `userId` 저장. `User.role ∈ {user, influencer, admin}`. 의미 있는 역할 게이트:
- 채팅방 **생성** (`POST /api/chat-rooms`) 은 `influencer` 또는 `admin` 만 가능
- 채팅방 **종료** 는 `owner` 만 가능 (미들웨어가 아닌 컨트롤러/소켓 핸들러 내부에서 체크)

**채팅 도메인 (가장 중요한 부분).** 세 컬렉션이 역할을 나눠 가짐:
- `ChatRoom` — 현재 접속 중인 `participants[]`, `maxUsers`, `owner`, `isClosed`, `closedAt` 보유
- `ChatMessage` — 메시지 영속화. `join` 시 최근 50개를 `history` 이벤트로 replay
- `ChatParticipation` — 입/퇴장 감사 로그. `leftAt` + `leaveReason ∈ {leave, disconnect, closed}` 를 기록. join 시 생성되고 leave/disconnect/close 시점에 업데이트됨

Socket 네임스페이스는 `/chat`. 클라이언트는 `socket.handshake.auth.token` 으로 JWT 전달, 네임스페이스 미들웨어에서 검증 후 `socket.user` 부착. 이벤트:
- 클라이언트 → 서버: `join`, `message`, `leave`, `close` (owner 전용)
- 서버 → 클라이언트: `history`, `participants`, `system`, `message`, `closed`

`ChatRoom.participants` 가 "현재 방에 있는 사람" 의 단일 소스. join 시 `$addToSet`, leave/disconnect 시 `$pull` 로 갱신되며 변경 후에는 populate 된 전체 목록을 broadcast. 방 종료 시에는 `isClosed` 를 true 로 바꾸고, 아직 열려 있던 모든 participation 에 `leftAt` 을 찍고, `closed` 이벤트를 emit.

**프론트엔드.** `public/` 하위 정적 페이지들이 `public/js/api.js` 를 통해 REST 를 호출하고, 채팅 방 페이지에서는 Socket.IO `/chat` 네임스페이스에 접속. 프레임워크/번들러 없음 — HTML/JS 를 직접 수정하고 새로고침하면 됨.

## 유지할 가치가 있는 컨벤션

- 비즈니스 규칙(소유권 검증, 라우트 역할 게이트 이후의 추가 검증, 닫힌 방 체크 등)은 **컨트롤러** 에서 처리. 라우트는 얇게 유지
- 모든 Mongoose 모델은 `timestamps: true` 사용
- `User.toPublic()` 이 클라이언트로 나가는 표준 User 형태. `passwordHash` 는 절대 응답에 포함하지 않음
- 업로드 파일명은 `${Date.now()}-${rand}${ext}` 형식으로 `uploads/` 에 저장, 문서에는 상대 경로로 참조

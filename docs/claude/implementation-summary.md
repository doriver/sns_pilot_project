# 완료된 것

## 백엔드 (Express + Mongoose + Socket.IO)
- `server/app.js` - 엔트리포인트, 정적 서빙(`/public`, `/uploads`), Socket.IO 초기화
- `server/config/` - env, DB 연결
- `server/models/` - User, Post, Comment, ChatRoom
- `server/middlewares/` - auth(JWT), requireRole, multer 업로드, 에러 핸들러
- `server/controllers/` - auth, user, post, comment, chat
- `server/routes/` - `/api/auth`, `/api/users`, `/api/posts`, `/api/chat-rooms`
- `server/sockets/chat.js` - `/chat` 네임스페이스, JWT 핸드셰이크, 정원/종료 체크

## 프론트 (바닐라 JS)
- `public/index.html` (타임라인 10개), `posts.html` (페이지네이션), `post-detail.html`, `post-new.html`
- `login.html`, `signup.html` (프로필 이미지 업로드)
- `chat-list.html` (인플루언서만 생성 버튼), `chat-room.html` (실시간)
- `js/api.js`, `js/nav.js`, `css/style.css`

## 실행 방법
1. MongoDB 로컬 실행 중인지 확인
2. `npm run dev` → http://localhost:3000
3. 회원가입 → 로그인 → 글 작성/조회, 좋아요, 댓글 테스트
4. 채팅방 테스트는 admin이 먼저 일반 유저를 `influencer`로 승격해야 합니다 — `mongosh`에서 수동으로 `db.users.updateOne({email:"..."}, {$set:{role:"admin"}})`로 관리자 권한을 초기 부여하면 됩니다.

## 알려진 주의점
- multer 1.x는 보안 취약점 경고가 있습니다. 향후 2.x로 업그레이드 권장(현재는 1.4.5-lts가 더 안정).
- JWT 시크릿은 `.env`의 `JWT_SECRET`을 운영 전 반드시 변경해야 합니다.

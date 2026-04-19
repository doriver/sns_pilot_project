# Express & MongoDB 학습 가이드

이 프로젝트에서 사용한 기술을 중심으로 학습 포인트를 정리합니다.

---

## 1. Express.js

### 핵심 개념
- **미들웨어 체인**: `app.use()`와 라우트 핸들러는 `(req, res, next)` 시그니처로 순차 실행됨. `next()` 호출 여부로 흐름 제어.
- **라우터 분리**: `express.Router()`로 기능별 분리 (이 프로젝트의 `routes/*.routes.js`).
- **에러 핸들링 미들웨어**: 인자 4개 `(err, req, res, next)`로 선언하면 Express가 에러 핸들러로 인식. 반드시 **라우트 등록 후 마지막에** 위치.
- **정적 파일**: `express.static(경로)`로 폴더를 HTTP에서 직접 서빙.
- **body 파싱**: `express.json()`, `express.urlencoded()`. `multipart/form-data`는 multer 같은 별도 파서 필요.

### 이 프로젝트의 패턴
- `app.js`에서 앱 생성 → 미들웨어 → 라우트 → 404 → errorHandler 순으로 등록.
- 컨트롤러는 `async (req, res, next) => { try { ... } catch (err) { next(err); } }` 패턴으로 에러를 중앙 핸들러에 위임.
- JWT 검증·역할 체크는 라우트 단위로 미들웨어 부착 (`router.post('/', auth, requireRole('admin'), ctrl)`).

### 학습 자료
- 공식 가이드: https://expressjs.com/ko/guide/routing.html
- 미들웨어 작성 가이드: https://expressjs.com/ko/guide/writing-middleware.html
- 에러 처리: https://expressjs.com/ko/guide/error-handling.html

### 더 공부할 주제
- `express-async-handler` 또는 async wrapper 패턴으로 try/catch 제거
- `express-validator` / `zod`를 통한 입력 검증 표준화
- `helmet`, `cors`, `rate-limit` 보안 미들웨어
- Express 5 (release) 의 async 네이티브 지원, 변경점

---

## 2. MongoDB + Mongoose

### 핵심 개념
- **Document/Collection**: RDB의 row/table에 해당. BSON 기반, 스키마리스.
- **`_id`**: 기본적으로 `ObjectId` (12바이트, 타임스탬프 포함).
- **관계 표현**:
  - 참조(Reference) — 본 프로젝트의 `author: ObjectId(User)` 방식. `populate()`로 조인.
  - 임베딩(Embed) — 하위 문서를 그대로 품기 (댓글 많지 않은 게시글에 적합).
- **인덱스**: 자주 조회/정렬되는 필드에 선언. 이 프로젝트는 `createdAt`, `viewCount+createdAt` 복합 인덱스 사용.
- **원자적 업데이트 연산자**:
  - `$inc` — 숫자 증가 (조회수)
  - `$addToSet` / `$pull` — 배열 중복방지 추가/제거 (좋아요)
  - `$set`, `$push` 등

### Mongoose 핵심
- `mongoose.Schema` → `mongoose.model()`로 모델 생성.
- 옵션: `{ timestamps: true }` → `createdAt`, `updatedAt` 자동.
- 조회: `Model.find()`, `findById()`, `findOne()` / 수정: `findByIdAndUpdate(id, patch, { new: true })`.
- `.populate('field', 'selectFields')` → 참조 문서 조인.
- 인스턴스 메서드: `schema.methods.xxx = function() {}` (이 프로젝트의 `user.toPublic()`).

### 이 프로젝트의 패턴
- **조회수 증가 + 상세 조회를 한 번에**: `findByIdAndUpdate(id, { $inc: { viewCount: 1 } }, { new: true })` — race condition 없음.
- **좋아요 토글**: 별도 Like 컬렉션 없이 `likeUsers` 배열에 `$addToSet`/`$pull`. 유저 수가 수천만이 넘지 않는 작은 SNS에 적합.
- **페이지네이션**: `skip((page-1)*limit).limit(limit)` + `countDocuments()`. 큰 컬렉션에는 cursor/keyset 방식이 더 좋음.

### 학습 자료
- MongoDB 공식 튜토리얼: https://www.mongodb.com/docs/manual/tutorial/getting-started/
- Mongoose 공식: https://mongoosejs.com/docs/guide.html
- Aggregation Framework: https://www.mongodb.com/docs/manual/aggregation/
- 스키마 디자인 패턴: https://www.mongodb.com/blog/post/building-with-patterns-a-summary

### 더 공부할 주제
- **Aggregation Pipeline** (`$match`, `$group`, `$lookup`, `$facet`) — 통계/집계, 복잡한 조회
- **인덱스 전략** — compound index, text index, TTL index, explain() 읽기
- **트랜잭션** — replica set 전제, `session.startTransaction()`
- **Change Streams** — 실시간 DB 변경 감지 (알림·동기화)
- **스키마 디자인 패턴**: Extended Reference, Bucket, Outlier, Computed
- **페이지네이션 한계**: 대량 데이터에서 `skip` 대신 `_id` 기반 keyset cursor 사용
- **읽기/쓰기 관심도** (read/write concern, readPreference)

---

## 3. 인증 (JWT + bcrypt)

### 개념
- **bcrypt**: salt 포함 단방향 해시. `bcrypt.hash(pw, saltRounds)` / `bcrypt.compare(plain, hash)`. saltRounds는 보통 10~12.
- **JWT**: `header.payload.signature` 구조. payload는 Base64 인코딩일 뿐 암호화가 아님 → 민감정보 넣지 않기.
- **서명 알고리즘**: HS256(대칭키, 단일 서버에 적합) / RS256(비대칭, 마이크로서비스에 적합).
- **저장 위치**:
  - localStorage — XSS 취약, 구현 간단 (이 프로젝트)
  - httpOnly Cookie — CSRF 대비 필요, XSS 방어에 강함 (운영 권장)

### 이 프로젝트의 패턴
- 로그인 시 `jwt.sign({ sub, role }, secret, { expiresIn })`.
- `auth` 미들웨어가 `Authorization: Bearer <token>` 파싱 → `jwt.verify()` → `req.user` 주입.
- Socket.IO는 `handshake.auth.token`에서 같은 시크릿으로 검증.

### 더 공부할 주제
- Refresh Token 패턴 (access 짧게 + refresh 길게)
- 토큰 블랙리스트 / 회전
- 세션 기반 인증과의 비교
- OAuth2, OpenID Connect

---

## 4. 파일 업로드 (multer)

- `multer.diskStorage` — 파일 시스템 저장 (이 프로젝트)
- `multer.memoryStorage` — Buffer로 받아서 S3 등에 바로 업로드
- `fileFilter`, `limits` (크기·개수 제한)
- `.single()`, `.array()`, `.fields()` 메서드 용도 구분

### 더 공부할 주제
- S3/Cloud Storage 직접 업로드 (presigned URL)
- 이미지 리사이즈/최적화 (`sharp`)
- 보안: MIME sniffing, 파일명 sanitize, 바이러스 스캔

---

## 5. 실시간 통신 (Socket.IO)

### 개념
- WebSocket 위에 구축된 라이브러리, 자동 재연결·fallback 제공.
- **Namespace**: 엔드포인트 분리 (`/chat`).
- **Room**: 같은 namespace 안의 그룹 (채팅방 id).
- **이벤트 기반**: `socket.emit()` / `socket.on()`.
- **미들웨어**: `io.use()`로 핸드셰이크 시 인증 가능.

### 이 프로젝트의 패턴
- `/chat` 네임스페이스 + JWT 미들웨어 인증.
- `join` 이벤트에서 DB 검증(종료·정원) 후 `socket.join(roomId)`.
- ack 콜백 `cb({ error })`로 클라이언트에 즉시 실패 통보.
- `disconnect`/`leave`에서 DB participants 갱신 및 룸에 broadcast.

### 더 공부할 주제
- 여러 서버 인스턴스 확장: Redis adapter
- 메시지 영속화 (DB 저장 후 재접속 시 히스토리 전달)
- 백프레셔, rate limiting
- WebRTC와의 조합 (음성/영상)

---

## 6. 프로젝트 구조 & 베스트 프랙티스

### 레이어 분리
이 프로젝트는 `routes → controllers → models` 3계층.
규모가 커지면 **service 계층**을 추가하여 비즈니스 로직을 controller에서 분리하는 것이 일반적.

### 환경변수
- `dotenv`로 `.env` 로드, `env.js`에 중앙화 (이 프로젝트 방식).
- 절대 커밋 금지 → `.gitignore` 필수, `.env.example`로 키만 공유.

### 에러 처리
- 컨트롤러에서 `next(err)`로 중앙 핸들러에 위임.
- 커스텀 에러 클래스 (`class HttpError extends Error`)로 상태코드를 에러에 실어 전달하는 패턴도 유용.

---

## 7. 추천 학습 순서

1. **Node.js 기본**: 이벤트 루프, 모듈 시스템(CJS/ESM), Promise/async-await
2. **Express 기본**: 라우팅 → 미들웨어 → 에러 처리 → 파일 업로드
3. **MongoDB**: CRUD → 쿼리 연산자 → 인덱스 → Aggregation → 트랜잭션
4. **Mongoose**: Schema → 관계/`populate` → 미들웨어(pre/post hook) → 가상필드
5. **인증/보안**: bcrypt → JWT → OAuth2 → OWASP Top 10
6. **실시간**: WebSocket 기초 → Socket.IO → scale-out(Redis)
7. **테스트**: Jest/Mocha + Supertest로 API 통합테스트, mongodb-memory-server
8. **배포/운영**: PM2, Docker, 로깅(winston/pino), 모니터링(APM)

---

## 8. 추천 도서 & 강의

- **도서**
  - 『러닝 Node.js 웹 개발』 (O'Reilly)
  - 『MongoDB 완벽 가이드』 (O'Reilly)
  - 『Node.js 디자인 패턴』 (Packt)

- **온라인**
  - MongoDB University (무료, https://learn.mongodb.com/)
  - NodeSchool 인터랙티브 튜토리얼
  - The Net Ninja — Node.js / Mongoose 유튜브 시리즈

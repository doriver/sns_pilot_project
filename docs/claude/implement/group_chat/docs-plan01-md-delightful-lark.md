# 채팅 메시지 영속화 + 참여 이력 구현계획

## Context
현재 `server/sockets/chat.js`는 메시지를 브로드캐스트만 하고 저장하지 않으며, 참여자도 현재 접속 중인 사람만 `ChatRoom.participants` 배열에서 관리한다. 따라서 (1) 과거 대화 내용이 남지 않고 (2) "누가 언제 입장/퇴장했는지" 이력이 전혀 없다. 메시지와 참여 이력을 모두 DB에 저장해 재접속 시 히스토리를 보여주고, 방별 참석 기록을 조회할 수 있게 한다.

---

## 1. 새 모델: `ChatMessage`
파일: `server/models/ChatMessage.js` (신규)

```js
{
  room: ObjectId(ChatRoom),
  user: ObjectId(User),
  text: String (required, trim, maxlength: 2000),
  // timestamps: createdAt, updatedAt
}
```
- 인덱스: `{ room: 1, createdAt: -1 }` — 방별 최신순 조회
- 옵션: `{ timestamps: true }`
- 텍스트만 저장 (이미지/파일은 MVP 제외)

---

## 2. Socket 핸들러 수정
파일: `server/sockets/chat.js`

### `message` — 저장 후 브로드캐스트
```js
socket.on('message', async ({ text }, cb) => {
  if (!socket.currentRoom || !text?.trim()) return cb?.({ error: 'invalid' });
  try {
    const doc = await ChatMessage.create({
      room: socket.currentRoom,
      user: socket.user._id,
      text: text.trim(),
    });
    nsp.to(socket.currentRoom).emit('message', {
      _id: doc._id,
      user: { _id: socket.user._id, nickname: socket.user.nickname, profileImage: socket.user.profileImage },
      text: doc.text,
      at: doc.createdAt,
    });
    cb?.({ ok: true });
  } catch (err) {
    cb?.({ error: err.message });
  }
});
```
- 저장 실패 시 브로드캐스트 안 함 (일관성)

### `join` — 히스토리 전달
기존 `join` 내부에서 `cb({ ok: true })` 전에 최근 50개를 본인 소켓에만 전송:
```js
const history = await ChatMessage.find({ room: roomId })
  .sort({ createdAt: -1 }).limit(50)
  .populate('user', 'nickname profileImage');
socket.emit('history', history.reverse().map((m) => ({
  _id: m._id, user: m.user, text: m.text, at: m.createdAt,
})));
```

---

## 2-2. 참여 이력 모델: `ChatParticipation`
파일: `server/models/ChatParticipation.js` (신규)

```js
{
  room: ObjectId(ChatRoom),
  user: ObjectId(User),
  joinedAt: Date (default Date.now),
  leftAt: Date (default null),
  leaveReason: 'leave' | 'disconnect' | 'closed' | null,
}
```
- 인덱스: `{ room: 1, joinedAt: -1 }`, `{ room: 1, user: 1, leftAt: 1 }`
- 한 유저가 같은 방에 여러 번 입·퇴장하면 **세션 단위로 여러 도큐먼트** 생성 (재입장 이력 보존)

### Socket 핸들러 연동 (`server/sockets/chat.js`)

**join 시** — 기존 `$addToSet` 직후 참여 도큐먼트 생성:
```js
const participation = await ChatParticipation.create({
  room: roomId, user: socket.user._id,
});
socket.participationId = participation._id;
```

**leave/disconnect 시** — 기존 `$pull` 직후 현재 세션 종료 기록:
```js
if (socket.participationId) {
  await ChatParticipation.updateOne(
    { _id: socket.participationId, leftAt: null },
    { $set: { leftAt: new Date(), leaveReason: reason } } // 'leave' | 'disconnect'
  );
  socket.participationId = null;
}
```
`leave`는 두 경로(명시적 `leave`, `disconnect`)에서 호출되므로 `reason` 인자를 받는 내부 함수로 리팩터:
```js
const leave = async (reason = 'disconnect') => { ... };
socket.on('leave', () => leave('leave'));
socket.on('disconnect', () => leave('disconnect'));
```

**close 시** — 아직 `leftAt: null`인 모든 참여 도큐먼트 일괄 종료:
```js
await ChatParticipation.updateMany(
  { room: roomId, leftAt: null },
  { $set: { leftAt: new Date(), leaveReason: 'closed' } }
);
```
(룸 닫힘 브로드캐스트 후, 각 소켓의 `disconnect`가 추가로 `updateOne`을 시도하지만 `leftAt: null` 조건으로 걸러져 중복 덮어쓰기 안 됨.)

---

## 2-3. 참여 이력 조회 API
파일: `server/controllers/chat.controller.js`, `server/routes/chat.routes.js`

`GET /api/chat-rooms/:id/participations`
- 인증 필요
- 응답: 해당 방의 참여 기록 전체, 최신 joinedAt 내림차순, `user` populate
```js
exports.participations = async (req, res, next) => {
  try {
    const rows = await ChatParticipation.find({ room: req.params.id })
      .sort({ joinedAt: -1 })
      .populate('user', 'nickname profileImage');
    res.json(rows);
  } catch (err) { next(err); }
};
```
라우트: `router.get('/:id/participations', auth, ctrl.participations);`

---

## 3. REST API (선택 — 무한스크롤용)
파일: `server/controllers/chat.controller.js`, `server/routes/chat.routes.js`

`GET /api/chat-rooms/:id/messages?before=<messageId>&limit=50`
- 인증 필요(`auth`)
- `before` 있으면 `{ room, _id: { $lt: before } }`, 없으면 최신 50
- 라우트: `router.get('/:id/messages', auth, ctrl.messages);`

---

## 4. 프론트 수정
파일: `public/chat-room.html`

```js
socket.on('history', (list) => {
  list.forEach((m) => append(`<b>${escapeHtml(m.user.nickname)}</b>: ${escapeHtml(m.text)}`));
});
```
- 기존 `message` 핸들러 유지
- 전송 폼에 ack 추가(선택):
  `socket.emit('message', { text }, (res) => res?.error && alert(res.error));`

---

## 5. 방 종료 시 정책
- **유지안(권장)**: `isClosed: true`여도 메시지는 보존 — 로그 기능 향후 확장 여지
- 삭제가 필요하면 `close` 핸들러에 `ChatMessage.deleteMany({ room: roomId })` 추가 (이번 범위 제외)

---

## 6. 수정/생성할 파일
- **신규**: `server/models/ChatMessage.js`
- **신규**: `server/models/ChatParticipation.js`
- **수정**: `server/sockets/chat.js` (message, join, leave/disconnect, close)
- **수정**: `server/controllers/chat.controller.js` (`participations`, 선택: `messages`)
- **수정**: `server/routes/chat.routes.js` (`/:id/participations`, 선택: `/:id/messages`)
- **수정**: `public/chat-room.html` (history 핸들러)

---

## 7. 검증 방법
1. 서버 재시작 → 탭 A로 방 입장 → 메시지 3개 전송
2. 탭 B(다른 계정)로 같은 방 입장 → `history`로 기존 메시지 3개 렌더 확인
3. 탭 A 새로고침 → 이전 메시지 히스토리 표시 확인
4. `mongosh`에서 `db.chatmessages.find().sort({createdAt:-1}).limit(5)` 로 저장 확인
5. 방 종료 후에도 메시지 DB에 남는지 확인
6. 빈 문자열/공백만 전송 시 저장·브로드캐스트 안 되는지 확인
7. 입·퇴장 시 `db.chatparticipations.find({room: ObjectId("...")})` 로 `joinedAt`, `leftAt`, `leaveReason` 기록 확인
8. 한 유저가 입장→퇴장→재입장 시 도큐먼트 2개가 각기 다른 `joinedAt`으로 남는지 확인
9. 방 오너가 `close` 호출 시 접속 중이던 모든 참여자의 `leaveReason: 'closed'`로 마감되는지 확인
10. `GET /api/chat-rooms/:id/participations` 로 참여 이력 전체 조회 확인

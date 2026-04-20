# 닉네임 옆 프로필사진 표시

## Context

현재 User 모델에는 `profileImage` 필드가 있고, 회원가입 시 업로드도 가능하며, 모든 관련 API/Socket 이벤트에서 `profileImage`를 populate 하여 클라이언트에 내려주고 있다. 그러나 프론트엔드의 어떤 화면에서도 이 값을 사용하지 않아 닉네임만 텍스트로 노출되고 있다. 이번 작업은 **프론트엔드만 손대서** 닉네임이 렌더링되는 모든 위치에 원형 아바타(또는 이니셜 fallback)를 함께 보여주도록 한다.

**백엔드/업로드 인프라는 건드리지 않는다.** 프로필 수정 UI도 이번 범위에서 제외.

## 설계 결정

- **Fallback**: `profileImage`가 비어있으면 닉네임 첫글자 이니셜을 CSS 원형 배경 위에 렌더
- **수정 UI**: 생략 (회원가입 시 업로드한 이미지만 사용)
- **크기**: 위치별 차등
  - nav: 28px
  - 글 목록/댓글/타임라인: 24px
  - 채팅 참여자/메시지/방장 표시: 32px
- **모양**: 원형 (`border-radius: 50%`)

## 구현

### 1. 공용 헬퍼 추가 — `public/js/avatar.js` (신규)

모든 페이지에서 재사용할 단일 함수. `<script>`로 로드.

```js
window.Avatar = {
  // user: { nickname, profileImage }, size: 'sm'|'md'|'lg'
  html(user, size = 'sm') {
    if (!user) return '';
    const nick = user.nickname || '?';
    const initial = nick.trim().charAt(0).toUpperCase();
    const cls = `avatar avatar-${size}`;
    if (user.profileImage) {
      return `<img class="${cls}" src="${user.profileImage}" alt="${nick}" />`;
    }
    // 이니셜 fallback — 닉네임 해시로 배경색 고정
    const hue = [...nick].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    return `<span class="${cls} avatar-initial" style="background:hsl(${hue},55%,60%)">${initial}</span>`;
  },
  // 닉네임 옆에 인라인 배치용 — 아바타 + 닉네임 span
  withName(user, size = 'sm') {
    if (!user) return '';
    return `<span class="author-chip">${this.html(user, size)}<span class="author-name">${user.nickname || ''}</span></span>`;
  }
};
```

### 2. 공용 스타일 추가 — `public/css/style.css` (append)

```css
.avatar { display:inline-block; border-radius:50%; object-fit:cover; vertical-align:middle; }
.avatar-sm { width:24px; height:24px; }
.avatar-md { width:28px; height:28px; }
.avatar-lg { width:32px; height:32px; }
.avatar-initial { color:#fff; text-align:center; font-weight:600; line-height:1; display:inline-flex; align-items:center; justify-content:center; }
.avatar-sm.avatar-initial { font-size:11px; }
.avatar-md.avatar-initial { font-size:13px; }
.avatar-lg.avatar-initial { font-size:14px; }
.author-chip { display:inline-flex; align-items:center; gap:6px; vertical-align:middle; }
.author-name { font-weight:500; }
```

### 3. 각 페이지 수정 (총 4파일 + nav.js)

모든 파일에 `<script src="/js/avatar.js"></script>`를 `nav.js` 앞에 추가한 뒤, 아래 위치의 닉네임 렌더 부분을 치환한다.

| 파일 | 위치 | 변경 |
|------|------|------|
| `public/js/nav.js:10` | nav 우측 사용자 표시 | `${user.nickname}` → `${Avatar.withName(user, 'md')}` |
| `public/index.html:25` | 타임라인 댓글 작성자 | `${c.author?.nickname}` → `${Avatar.withName(c.author, 'sm')}` |
| `public/index.html:38` | 타임라인 글 작성자 | `${p.author?.nickname}` → `${Avatar.withName(p.author, 'sm')}` |
| `public/posts.html:33` | 글 목록 작성자 | `${p.author?.nickname}` → `${Avatar.withName(p.author, 'sm')}` |
| `public/post-detail.html:30` | 글 작성자 | `${post.author?.nickname}` → `${Avatar.withName(post.author, 'md')}` |
| `public/post-detail.html:59` | 댓글 작성자 | `${c.author?.nickname}` → `${Avatar.withName(c.author, 'sm')}` |
| `public/chat-list.html:41` | 방장 닉네임 | `${r.owner?.nickname}` → `${Avatar.withName(r.owner, 'sm')}` |
| `public/chat-room.html:62` | 참여자 리스트 | `${u.nickname}` → `${Avatar.withName(u, 'lg')}` |
| `public/chat-room.html:65,68` | 메시지 작성자 (history + live) | `${m.user.nickname}` → `${Avatar.withName(m.user, 'lg')}` |

### 4. HTML escape 주의

기존 코드가 이미 닉네임을 escape 없이 템플릿 리터럴로 꽂고 있어 본 작업은 그 컨벤션을 그대로 따른다(프로젝트 전반이 XSS-hardening 단계가 아님). Avatar 헬퍼도 동일한 수준으로 유지 — 별도 보안 스코프 확장하지 않음.

## 변경 파일

- `public/js/avatar.js` (신규)
- `public/css/style.css` (스타일 추가)
- `public/js/nav.js`
- `public/index.html`
- `public/posts.html`
- `public/post-detail.html`
- `public/chat-list.html`
- `public/chat-room.html`

백엔드 파일은 수정 없음.

## 검증

1. `npm run dev` 로 서버 기동 (MongoDB 필요)
2. 프로필이미지 **있는** 유저와 **없는** 유저 각각으로 회원가입
3. 각 화면 확인:
   - nav 바: 우상단 아바타+닉네임
   - `/` 타임라인: 글/댓글 작성자 옆 아바타
   - `/posts.html`, `/post-detail.html`: 작성자/댓글 아바타
   - `/chat-list.html`: 방장 아바타
   - `/chat-room.html`: 참여자 목록, 메시지 히스토리, 실시간 메시지 모두 아바타 표시
4. 이미지 없는 유저는 닉네임 첫글자 이니셜(해시 기반 색상)이 원형으로 표시되는지 확인
5. 동일 유저가 두 브라우저로 접속해 실시간 채팅 시 양쪽 모두 아바타 갱신 확인 (Socket.IO `participants`/`message` 이벤트 경로)

function renderNav() {
  const user = API.getUser();
  const nav = document.getElementById('nav');
  if (!nav) return;
  nav.innerHTML = `
    <a href="/">타임라인</a> |
    <a href="/posts.html">글 목록</a> |
    <a href="/chat-list.html">채팅</a> |
    ${user
      ? `<span>${user.nickname} (${user.role})</span> <button id="logoutBtn">로그아웃</button>`
      : `<a href="/login.html">로그인</a> <a href="/signup.html">회원가입</a>`}
  `;
  const btn = document.getElementById('logoutBtn');
  if (btn) btn.onclick = () => { API.clearToken(); location.href = '/login.html'; };
}
document.addEventListener('DOMContentLoaded', renderNav);

window.Avatar = {
  html(user, size = 'sm') {
    if (!user) return '';
    const nick = user.nickname || '?';
    const initial = nick.trim().charAt(0).toUpperCase();
    const cls = `avatar avatar-${size}`;
    if (user.profileImage) {
      return `<img class="${cls}" src="${user.profileImage}" alt="${nick}" />`;
    }
    const hue = [...nick].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    return `<span class="${cls} avatar-initial" style="background:hsl(${hue},55%,60%)">${initial}</span>`;
  },
  withName(user, size = 'sm') {
    if (!user) return '<span class="author-chip"><span class="author-name">익명</span></span>';
    const nick = user.nickname || '익명';
    return `<span class="author-chip">${this.html(user, size)}<span class="author-name">${nick}</span></span>`;
  },
};

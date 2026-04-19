const API = (() => {
  const TOKEN_KEY = 'mini01_token';
  const USER_KEY = 'mini01_user';

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
  function getUser() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
  function setUser(u) { localStorage.setItem(USER_KEY, JSON.stringify(u)); }

  async function req(path, opts = {}) {
    const headers = opts.headers || {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!(opts.body instanceof FormData) && opts.body && typeof opts.body === 'object') {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.body);
    }
    const res = await fetch(path, { ...opts, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'Request failed');
    }
    return res.status === 204 ? null : res.json();
  }

  return {
    getToken, setToken, clearToken, getUser, setUser,
    get: (p) => req(p),
    post: (p, body) => req(p, { method: 'POST', body }),
    patch: (p, body) => req(p, { method: 'PATCH', body }),
    del: (p) => req(p, { method: 'DELETE' }),
    upload: (p, formData, method = 'POST') => req(p, { method, body: formData }),
  };
})();

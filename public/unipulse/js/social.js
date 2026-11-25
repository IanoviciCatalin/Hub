/* UniPulse: conturi, participări, discuții, evenimente, echipe și date sincronizate.
   Contul este profilul DucaNeseriosul (cookie HttpOnly __Host-duca_player) cu email și parolă;
   datele stau în Cloudflare (D1 pentru conturi, Durable Object pentru restul). */
window.UniPulseSocial = (() => {
  'use strict';
  const ERRORS = {
    PLAYER_REQUIRED: 'Intră în cont ca să continui.',
    NOT_PARTICIPANT: 'Discuția se deblochează după ce apeși „Particip”.',
    EMPTY_MESSAGE: 'Scrie un mesaj.',
    RATE_LIMITED: 'Prea multe cereri. Mai încearcă peste un minut.',
    INVALID_NAME: 'Folosește un nume de 1–24 caractere.',
    INVALID_EVENT: 'Evenimentul nu acceptă participări.',
    EVENT_NOT_FOUND: 'Evenimentul a fost șters sau ascuns după raportări.',
    INVALID_TITLE: 'Scrie un titlu de cel puțin 3 caractere.',
    INVALID_CATEGORY: 'Alege tipul evenimentului.',
    INVALID_CITY: 'Alege un oraș din listă.',
    INVALID_PLACE: 'Alege locul pe hartă sau din listă și scrie-i numele.',
    INVALID_START: 'Alege o dată de început din următoarele 12 luni.',
    INVALID_END: 'Sfârșitul trebuie să fie după început, în cel mult 14 zile.',
    INVALID_PRICE: 'Prețul trebuie să fie între 0 și 10.000 lei.',
    INVALID_SPOTS: 'Numărul de locuri trebuie să fie între 2 și 5.000.',
    INVALID_URL: 'Linkul trebuie să înceapă cu https://.',
    TOO_MANY_EVENTS: 'Ai atins limita: 5 evenimente active și 10 create pe zi. Șterge unul ca să adaugi altul.',
    NOT_OWNER: 'Doar autorul poate șterge.',
    OWN_EVENT: 'Nu îți poți raporta propriul eveniment.',
    OWN_MESSAGE: 'Nu îți poți raporta propriul mesaj.',
    MESSAGE_NOT_FOUND: 'Mesajul a fost deja șters.',
    INVALID_REQUEST: 'Textul e prea lung. Scurtează descrierea și încearcă din nou.',
  };
  Object.assign(ERRORS, {
    PLAYER_REQUIRED: 'Intră în cont ca să continui.',
    ACCOUNT_REQUIRED: 'Adaugă un email și o parolă profilului ca să continui.',
    INVALID_EMAIL: 'Scrie o adresă de email validă, de exemplu nume@student.upt.ro.',
    WEAK_PASSWORD: 'Parola trebuie să aibă 8–128 caractere și să nu fie ușor de ghicit.',
    EMAIL_TAKEN: 'Există deja un cont cu acest email. Intră în cont în loc să creezi unul nou.',
    BAD_LOGIN: 'Emailul sau parola nu sunt corecte.',
    BAD_PASSWORD: 'Parola actuală nu este corectă.',
    ACCOUNT_LOCKED: 'Prea multe încercări greșite. Contul e blocat 15 minute; încearcă după aceea.',
    ACCOUNT_DISABLED: 'Contul a fost dezactivat de administrator.',
    NO_PASSWORD: 'Profilul nu are email și parolă, deci nu poți ieși din el fără să-l pierzi.',
    ADMIN_ONLY: 'Doar administratorii au acces aici.',
    INVALID_TEAM_MESSAGE: 'Descrie echipa în cel puțin 10 caractere.',
    TOO_MANY_TEAMS: 'Ai deja 5 postări active. Șterge una ca să adaugi alta.',
    TEAM_FULL: 'Echipa e completă.',
    TEAM_NOT_FOUND: 'Postarea a fost ștearsă sau ascunsă.',
    OWN_TEAM: 'Este postarea ta.',
    SYNC_TOO_LARGE: 'Datele sunt prea mari pentru sincronizare.',
    INGEST_DISABLED: 'Importul real este oprit până la aprobarea pentru producție. Poți rula doar o simulare.',
    RUN_TOO_SOON: 'Sursa a fost rulată acum mai puțin de 10 minute. Încearcă puțin mai târziu.',
    REVIEW_CLOSED: 'Propunerea a fost deja rezolvată.',
  });
  // account: profilul de pe acest dispozitiv. Are hasPassword=false dacă e un profil vechi, fără email.
  let account;
  const listeners = new Set();
  const notify = () => listeners.forEach((fn) => { try { fn(); } catch { /* ignorat */ } });

  async function api(path, { method = 'GET', body } = {}) {
    if (typeof fetch !== 'function') throw new Error('Serverul nu este disponibil în acest mediu.');
    let response;
    try {
      response = await fetch(path, {
        method, credentials: 'same-origin', cache: 'no-store',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new Error('Nu există conexiune. Verifică internetul și încearcă din nou.');
    }
    let data = {};
    try { data = await response.json(); } catch { /* răspuns gol */ }
    if (!response.ok) {
      const error = new Error(ERRORS[data.error] || 'Serverul nu a răspuns. Încearcă din nou.');
      error.code = data.error || 'HTTP_' + response.status;
      throw error;
    }
    return data;
  }
  const eventPath = (id) => '/api/unipulse/event/' + encodeURIComponent(id);

  const auth = (path, body) => api('/api/unipulse/auth/' + path, { method: 'POST', body });
  async function load() {
    try { account = (await api('/api/unipulse/auth/me')).account || null; }
    catch { account = null; }
    notify();
    return account;
  }
  const settle = (result) => { account = result.account || null; notify(); return account; };

  return {
    load,
    register: async (data) => settle(await auth('register', data)),
    login: async (data) => settle(await auth('login', data)),
    async logout() { settle(await auth('logout', {})); },
    rename: async (name) => settle(await auth('name', { name })),
    async changePassword(password, newPassword) {
      await auth('password', { password, newPassword });
      if (account) account = { ...account, mustChange: false };
      notify();
    },
    // Contul cu email și parolă. Un profil vechi, fără email, nu poate scrie în UniPulse.
    currentAccount: () => (account?.hasPassword ? account : null),
    // Profilul de pe dispozitiv, inclusiv cel fără email (pentru a-l putea transforma în cont).
    deviceProfile: () => account || null,
    known: () => account !== undefined,
    onChange(fn) { listeners.add(fn); },
    getSync: () => api('/api/unipulse/sync'),
    setSync: (key, value) => api('/api/unipulse/sync', { method: 'POST', body: { key, value } }),
    listTeams: (city) => api('/api/unipulse/teams?city=' + encodeURIComponent(city)),
    createTeam: (data) => api('/api/unipulse/teams', { method: 'POST', body: data }),
    teamAction: (id, action) => api('/api/unipulse/team/' + encodeURIComponent(id) + '/' + action, { method: 'POST', body: {} }),
    admin: {
      overview: (q = '') => api('/api/unipulse/admin/overview' + (q ? '?q=' + encodeURIComponent(q) : '')),
      account: (id, action) => api(`/api/unipulse/admin/account/${encodeURIComponent(id)}/${action}`, { method: 'POST', body: {} }),
      status: (kind, id, status) => api(`/api/unipulse/admin/${kind}/${encodeURIComponent(id)}/status`, { method: 'POST', body: { status } }),
      message: (id, action) => api(`/api/unipulse/admin/message/${Number(id)}/${action}`, { method: 'POST', body: {} }),
      importOverview: () => api('/api/unipulse/admin/import'),
      importSource: (id, changes) => api(`/api/unipulse/admin/import/source/${encodeURIComponent(id)}`, { method: 'POST', body: changes }),
      importRun: (id, dryRun = true) => api(`/api/unipulse/admin/import/source/${encodeURIComponent(id)}/run`, { method: 'POST', body: { dryRun } }),
      importReview: (id, action) => api(`/api/unipulse/admin/import/review/${Number(id)}`, { method: 'POST', body: { action } }),
      importEvent: (id, state) => api(`/api/unipulse/admin/import/event/${encodeURIComponent(id)}`, { method: 'POST', body: { state } }),
    },
    event: (id) => api(eventPath(id)),
    counts: (ids) => api('/api/unipulse/counts?ids=' + ids.map(encodeURIComponent).join(',')),
    async join(id) { const r = await api(eventPath(id) + '/join', { method: 'POST', body: {} }); notify(); return r; },
    async leave(id) { const r = await api(eventPath(id) + '/leave', { method: 'POST', body: {} }); notify(); return r; },
    messages: (id, after = 0) => api(eventPath(id) + '/messages' + (after ? '?after=' + after : '')),
    send: (id, text) => api(eventPath(id) + '/messages', { method: 'POST', body: { body: text } }),
    rooms: () => api('/api/unipulse/me'),
    deleteMessage: (id, messageId) => api(eventPath(id) + '/messages/' + Number(messageId) + '/delete', { method: 'POST', body: {} }),
    reportMessage: (id, messageId) => api(eventPath(id) + '/messages/' + Number(messageId) + '/report', { method: 'POST', body: {} }),
    // Evenimentele importate automat din surse oficiale (doar citire).
    listCatalog: (city) => api('/api/unipulse/catalog?city=' + encodeURIComponent(city)),
    // Evenimentele comunității: vizibile tuturor, salvate pe server.
    listEvents: (city) => api('/api/unipulse/events?city=' + encodeURIComponent(city)),
    createEvent: (data) => api('/api/unipulse/events', { method: 'POST', body: data }),
    deleteEvent: (id) => api(eventPath(id) + '/delete', { method: 'POST', body: {} }),
    reportEvent: (id) => api(eventPath(id) + '/report', { method: 'POST', body: {} }),
  };
})();

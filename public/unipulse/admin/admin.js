/* Panoul admin UniPulse. Serverul verifică rolul de admin la fiecare cerere;
   pagina nu conține date până când API-ul nu le trimite. */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = window.UniPulseSocial.admin;
  const when = new Intl.DateTimeFormat('ro-RO', { timeZone: 'Europe/Bucharest', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const date = (ms) => (ms ? when.format(new Date(Number(ms))) : '—');
  const STATUS = { visible: 'Vizibil', hidden: 'Ascuns', deleted: 'Șters' };
  let data = null;
  let query = '';

  function toast(text) {
    const el = $('#adm-toast');
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { el.hidden = true; }, 3200);
  }

  // Dialog nativ: confirmare pentru acțiuni care schimbă date.
  function ask({ title, body, ok = 'Confirmă', danger = false, info = false }) {
    const dialog = $('#adm-dialog');
    $('#adm-dialog-title').textContent = title;
    $('#adm-dialog-body').innerHTML = body;
    $('#adm-dialog-ok').textContent = ok;
    $('#adm-dialog-ok').classList.toggle('danger', danger);
    $('#adm-dialog-cancel').hidden = info;
    dialog.returnValue = '';
    dialog.showModal();
    return new Promise((resolve) => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true }));
  }

  function stats(s) {
    const items = [
      ['Conturi', s.accounts], ['Active în 7 zile', s.active7], ['Dezactivate', s.disabled],
      ['Evenimente active', s.events], ['Evenimente ascunse', s.hiddenEvents], ['Echipe', s.teams],
      ['Participări', s.participations], ['Mesaje', s.messages], ['Mesaje raportate', s.reportedMessages],
    ];
    $('#adm-stats').innerHTML = items.map(([label, value]) => `<div class="adm-stat"><b>${Number(value || 0)}</b><span>${label}</span></div>`).join('');
  }

  const empty = (text) => `<p class="adm-empty">${text}</p>`;
  function table(head, rows) {
    return `<div class="adm-table-wrap"><table class="adm-table"><thead><tr>${head.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.join('')}</tbody></table></div>`;
  }

  function renderAccounts() {
    const list = data.accounts;
    $('#adm-accounts').innerHTML = list.length ? table(['Nume', 'Email', 'Creat', 'Ultima intrare', 'Dispozitive', 'Stare', 'Acțiuni'], list.map((a) => `
      <tr>
        <td>${esc(a.name)}${a.admin ? ' <span class="adm-tag">admin</span>' : ''}</td>
        <td>${esc(a.email)}</td>
        <td>${date(a.createdAt)}</td>
        <td>${date(a.lastLogin)}</td>
        <td>${a.sessions}</td>
        <td>${a.disabled ? '<span class="adm-tag bad">Dezactivat</span>' : a.locked ? '<span class="adm-tag warn">Blocat 15 min</span>' : a.mustChange ? '<span class="adm-tag warn">Parolă temporară</span>' : '<span class="adm-tag ok">Activ</span>'}</td>
        <td class="adm-actions">
          <button type="button" class="adm-btn small ghost" data-account="${esc(a.id)}" data-action="reset" data-label="${esc(a.email)}">Resetează parola</button>
          ${a.admin ? '' : `<button type="button" class="adm-btn small ${a.disabled ? '' : 'ghost danger'}" data-account="${esc(a.id)}" data-action="${a.disabled ? 'enable' : 'disable'}" data-label="${esc(a.email)}">${a.disabled ? 'Reactivează' : 'Dezactivează'}</button>`}
        </td>
      </tr>`)) : empty(query ? 'Niciun cont nu corespunde căutării.' : 'Niciun cont creat încă.');
  }

  function moderationRows(kind, list) {
    return list.map((item) => `
      <tr>
        <td>${esc(kind === 'event' ? item.title : item.message)}</td>
        <td>${esc(item.city)}</td>
        <td>${esc(item.owner)}</td>
        <td>${date(kind === 'event' ? item.startAt : item.createdAt)}</td>
        <td>${item.reports ? `<span class="adm-tag warn">${item.reports}</span>` : '0'}</td>
        <td><span class="adm-tag ${item.status === 'visible' ? 'ok' : 'bad'}">${STATUS[item.status] || esc(item.status)}</span></td>
        <td class="adm-actions">
          ${item.status !== 'visible' ? `<button type="button" class="adm-btn small" data-kind="${kind}" data-id="${esc(item.id)}" data-status="visible">Restabilește</button>` : `<button type="button" class="adm-btn small ghost" data-kind="${kind}" data-id="${esc(item.id)}" data-status="hidden">Ascunde</button>`}
          ${item.status !== 'deleted' ? `<button type="button" class="adm-btn small ghost danger" data-kind="${kind}" data-id="${esc(item.id)}" data-status="deleted">Șterge</button>` : ''}
        </td>
      </tr>`);
  }

  function renderModeration() {
    $('#adm-events').innerHTML = data.events.length
      ? table(['Eveniment', 'Oraș', 'Autor', 'Începe', 'Raportări', 'Stare', 'Acțiuni'], moderationRows('event', data.events))
      : empty('Niciun eveniment creat de utilizatori.');
    $('#adm-teams').innerHTML = data.teams.length
      ? table(['Postare', 'Oraș', 'Autor', 'Creată', 'Raportări', 'Stare', 'Acțiuni'], moderationRows('team', data.teams))
      : empty('Nicio postare în Echipe.');
    $('#adm-messages').innerHTML = data.messages.length
      ? table(['Autor', 'Mesaj', 'Eveniment', 'Trimis', 'Raportări', 'Acțiuni'], data.messages.map((m) => `
        <tr>
          <td>${esc(m.author)}</td><td class="adm-msg">${esc(m.body)}</td><td><code>${esc(m.eventId)}</code></td>
          <td>${date(m.time)}</td><td><span class="adm-tag warn">${m.reports}</span></td>
          <td class="adm-actions">
            <button type="button" class="adm-btn small ghost danger" data-message="${m.id}" data-action="delete">Șterge mesajul</button>
            <button type="button" class="adm-btn small ghost" data-message="${m.id}" data-action="dismiss">Respinge raportarea</button>
          </td>
        </tr>`)) : empty('Niciun mesaj raportat.');
  }

  async function load() {
    try {
      data = await api.overview(query);
    } catch (error) {
      $('#adm-main').setAttribute('aria-busy', 'false');
      $('#adm-app').hidden = true;
      $('#adm-status').hidden = false;
      $('#adm-status').innerHTML = error.code === 'ADMIN_ONLY' || error.code === 'PLAYER_REQUIRED'
        ? 'Doar administratorii au acces aici. <a href="../">Intră în cont pe UniPulse</a> cu contul de administrator, apoi revino.'
        : esc(error.message);
      return;
    }
    $('#adm-main').setAttribute('aria-busy', 'false');
    $('#adm-status').hidden = true;
    $('#adm-app').hidden = false;
    $('#adm-who').textContent = `${data.admin.name} · ${data.admin.email}`;
    stats(data.stats);
    renderAccounts();
    renderModeration();
  }

  $$('[data-tab]').forEach((tab) => tab.addEventListener('click', () => {
    $$('[data-tab]').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    $$('.adm-tab').forEach((panel) => { panel.hidden = panel.id !== 'tab-' + tab.dataset.tab; });
  }));
  $('#adm-search').addEventListener('submit', (event) => { event.preventDefault(); query = $('#adm-q').value.trim(); load(); });

  document.addEventListener('click', async (event) => {
    const account = event.target.closest('[data-account]');
    const moderation = event.target.closest('[data-kind]');
    const message = event.target.closest('[data-message]');
    try {
      if (account) {
        const { action, label } = account.dataset;
        const texts = {
          reset: ['Resetezi parola?', `Contul <b>${esc(label)}</b> primește o parolă temporară și iese de pe toate dispozitivele. La următoarea intrare trebuie să-și aleagă o parolă nouă.`, 'Resetează parola', false],
          disable: ['Dezactivezi contul?', `<b>${esc(label)}</b> iese de pe toate dispozitivele și nu mai poate intra până îl reactivezi. Datele rămân păstrate.`, 'Dezactivează', true],
          enable: ['Reactivezi contul?', `<b>${esc(label)}</b> poate intra din nou cu parola lui.`, 'Reactivează', false],
        }[action];
        if (!(await ask({ title: texts[0], body: `<p>${texts[1]}</p>`, ok: texts[2], danger: texts[3] }))) return;
        const result = await api.account(account.dataset.account, action);
        if (action === 'reset') {
          await ask({
            title: 'Parola temporară', info: true, ok: 'Am notat-o',
            body: `<p>Trimite-o personal lui <b>${esc(result.email)}</b>. Nu se mai afișează după ce închizi.</p>
              <p class="adm-secret"><code id="adm-temp">${esc(result.temporaryPassword)}</code>
              <button type="button" class="adm-btn small ghost" id="adm-copy">Copiază</button></p>`,
          });
        } else toast(action === 'disable' ? 'Contul a fost dezactivat.' : 'Contul a fost reactivat.');
        await load();
      } else if (moderation) {
        const { kind, id, status } = moderation.dataset;
        const noun = kind === 'event' ? 'evenimentul' : 'postarea';
        if (status !== 'visible' && !(await ask({
          title: status === 'deleted' ? `Ștergi ${noun}?` : `Ascunzi ${noun}?`,
          body: `<p>${status === 'deleted' ? 'Dispare pentru toți. Poți să-l restabilești din această listă.' : 'Nu mai apare pe hartă și în liste. Îl poți restabili oricând.'}</p>`,
          ok: status === 'deleted' ? 'Șterge' : 'Ascunde', danger: status === 'deleted',
        }))) return;
        await api.status(kind, id, status);
        toast(status === 'visible' ? 'Restabilit. Raportările vechi au fost șterse.' : status === 'deleted' ? 'Șters.' : 'Ascuns.');
        await load();
      } else if (message) {
        const remove = message.dataset.action === 'delete';
        if (remove && !(await ask({ title: 'Ștergi mesajul?', body: '<p>Mesajul dispare din discuție pentru toți participanții. Nu se poate anula.</p>', ok: 'Șterge mesajul', danger: true }))) return;
        await api.message(message.dataset.message, message.dataset.action);
        toast(remove ? 'Mesajul a fost șters.' : 'Raportarea a fost respinsă.');
        await load();
      } else if (event.target.id === 'adm-copy') {
        await navigator.clipboard.writeText($('#adm-temp').textContent);
        event.target.textContent = 'Copiată';
      }
    } catch (error) { toast(error.message); }
  });

  load();
})();

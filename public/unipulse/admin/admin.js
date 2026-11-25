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

  // ---------- Import automat ----------
  let imports = null;
  const KIND = { new: 'Eveniment nou', invalid: 'Date incomplete', possible_duplicate: 'Posibil duplicat', removed: 'Dispărut din sursă' };
  const ACTION = {
    approve: ['Publică', ''], reject: ['Respinge', 'ghost danger'], dismiss: ['Am văzut', 'ghost'],
    link: ['E același eveniment', ''], separate: ['Sunt diferite', 'ghost'], hide: ['Ascunde', 'ghost danger'], keep: ['Păstrează', 'ghost'],
  };
  const SOURCE_STATE = { ok: ['ok', 'Funcționează'], degraded: ['warn', 'Erori repetate'], blocked: ['bad', 'Blocată de sursă'] };
  const EVENT_STATUS = { scheduled: '', cancelled: 'Anulat', postponed: 'Amânat', rescheduled: 'Reprogramat', removed_at_source: 'Scos de la sursă' };
  const link = (url, text) => (url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text || url)}</a>` : esc(text || ''));

  function renderImport() {
    const d = imports;
    const note = $('#adm-import-note');
    note.classList.toggle('ok', d.ingestEnabled);
    note.textContent = d.ingestEnabled
      ? 'Importul automat este pornit. Sursele active rulează programat; evenimentele noi apar aici înainte de publicare, dacă sursa nu e în modul automat.'
      : 'Importul real este oprit până la aprobarea pentru producție. Poți rula simulări: citesc sursa și arată ce s-ar importa, fără să scrie nimic.';
    $('#adm-import-sources').innerHTML = d.sources.length ? table(['Sursă', 'Stare', 'Ultima rulare', 'Publicate', 'De verificat', 'Mod', 'Acțiuni'], d.sources.map((s) => {
      const [tone, label] = SOURCE_STATE[s.state] || ['', s.state];
      return `<tr>
        <td>${link(s.url, s.name)}<span class="adm-sub">${esc(s.terms || '')}</span></td>
        <td><span class="adm-tag ${s.enabled ? tone : ''}">${s.enabled ? label : 'Oprită'}</span>${s.lastError ? `<span class="adm-sub">${esc(s.lastError)}</span>` : ''}</td>
        <td>${date(s.lastRunAt)}${s.lastSuccessAt && s.lastSuccessAt !== s.lastRunAt ? `<span class="adm-sub">ultima reușită ${date(s.lastSuccessAt)}</span>` : ''}</td>
        <td>${s.published}${s.linked ? `<span class="adm-sub">${s.linked} legate de alte surse</span>` : ''}</td>
        <td>${s.pending ? `<span class="adm-tag warn">${s.pending}</span>` : '0'}</td>
        <td><label class="sr-only" for="mode-${esc(s.id)}">Mod de publicare</label>
          <select class="adm-select" id="mode-${esc(s.id)}" data-source-mode="${esc(s.id)}">
            <option value="review"${s.publishMode === 'review' ? ' selected' : ''}>Cu verificare</option>
            <option value="auto"${s.publishMode === 'auto' ? ' selected' : ''}>Automat</option>
          </select></td>
        <td class="adm-actions">
          <button type="button" class="adm-btn small ghost" data-source-run="${esc(s.id)}" data-dry="1"${s.manualRunAllowed ? '' : ' disabled title="O rulare la 10 minute"'}>Simulează</button>
          ${d.ingestEnabled ? `<button type="button" class="adm-btn small" data-source-run="${esc(s.id)}" data-dry="0"${s.manualRunAllowed && s.enabled ? '' : ' disabled'}>Rulează acum</button>` : ''}
          <button type="button" class="adm-btn small ${s.enabled ? 'ghost danger' : ''}" data-source-toggle="${esc(s.id)}" data-enabled="${s.enabled ? 0 : 1}">${s.enabled ? 'Oprește' : 'Pornește'}</button>
        </td>
      </tr>`;
    })) : empty('Nicio sursă configurată.');
    $('#adm-import-review').innerHTML = d.review.length ? table(['Propunere', 'Motiv', 'Când', 'Unde', 'Acțiuni'], d.review.map((r) => `
      <tr>
        <td><span class="adm-tag ${r.kind === 'new' ? 'ok' : 'warn'}">${KIND[r.kind] || esc(r.kind)}</span>
          <div>${link(r.candidate.url, r.candidate.title || '(fără titlu)')}</div>
          ${r.match ? `<span class="adm-sub">Seamănă cu: ${link(r.match.url, r.match.title)} · ${esc(r.match.source)} · ${date(r.match.startAt)}</span>` : ''}</td>
        <td>${esc(r.reason || (r.kind === 'new' ? 'Sursă cu verificare' : ''))}</td>
        <td>${date(r.candidate.startAt)}</td>
        <td>${esc(r.candidate.locationName || '')}${Number.isFinite(r.candidate.lat) ? `<span class="adm-sub"><a href="https://www.openstreetmap.org/?mlat=${r.candidate.lat}&mlon=${r.candidate.lng}#map=18/${r.candidate.lat}/${r.candidate.lng}" target="_blank" rel="noopener noreferrer">vezi pe hartă</a></span>` : '<span class="adm-sub">fără coordonate</span>'}</td>
        <td class="adm-actions">${r.actions.map((a) => `<button type="button" class="adm-btn small ${ACTION[a][1]}" data-review="${r.id}" data-action="${a}">${ACTION[a][0]}</button>`).join('')}</td>
      </tr>`)) : empty('Nimic de verificat.');
    $('#adm-import-upcoming').innerHTML = d.upcoming.length ? table(['Eveniment', 'Sursă', 'Începe', 'Stare', 'Verificat', 'Acțiuni'], d.upcoming.map((e) => `
      <tr>
        <td>${link(e.url, e.title)}<span class="adm-sub"><code>${esc(e.eventId)}</code></span></td>
        <td>${esc(e.source)}</td><td>${date(e.startAt)}</td>
        <td><span class="adm-tag ${e.state === 'published' ? 'ok' : 'bad'}">${e.state === 'published' ? 'Publicat' : 'Ascuns'}</span>${EVENT_STATUS[e.status] ? ` <span class="adm-tag warn">${EVENT_STATUS[e.status]}</span>` : ''}</td>
        <td>${date(e.lastChecked)}</td>
        <td class="adm-actions"><button type="button" class="adm-btn small ghost${e.state === 'published' ? ' danger' : ''}" data-import-event="${esc(e.eventId)}" data-state="${e.state === 'published' ? 'hidden' : 'published'}">${e.state === 'published' ? 'Ascunde' : 'Publică din nou'}</button></td>
      </tr>`)) : empty('Niciun eveniment importat încă.');
    $('#adm-import-runs').innerHTML = d.runs.length ? table(['Sursă', 'Tip', 'Când', 'Rezultat', 'Găsite', 'Noi', 'Actualizate', 'Neschimbate', 'Respinse / duplicate'], d.runs.map((r) => `
      <tr>
        <td>${esc(r.sourceId)}</td><td>${esc(r.job)}${r.dryRun ? ' <span class="adm-tag">simulare</span>' : ''}</td><td>${date(r.startedAt)}</td>
        <td><span class="adm-tag ${r.status === 'ok' ? 'ok' : 'bad'}">${r.status === 'ok' ? 'Reușită' : 'Eroare'}</span>${r.error ? `<span class="adm-sub">${esc(r.error)}</span>` : ''}</td>
        <td>${r.fetched}</td><td>${r.created}</td><td>${r.updated}</td><td>${r.unchanged}</td><td>${r.rejected} / ${r.linked + r.queued}</td>
      </tr>`)) : empty('Nicio rulare încă.');
    const fmt = (field, value) => (value === null || value === undefined ? '—' : /_at$/.test(field) ? date(Number(value)) : esc(value));
    $('#adm-import-changes').innerHTML = d.changes.length ? table(['Eveniment', 'Câmp', 'Înainte', 'Acum', 'Când'], d.changes.map((c) => `
      <tr><td>${esc(c.title || c.eventId)}</td><td>${esc(c.field)}</td><td class="adm-msg">${fmt(c.field, c.oldValue)}</td><td class="adm-msg">${fmt(c.field, c.newValue)}</td><td>${date(c.at)}</td></tr>`)) : empty('Nicio modificare înregistrată.');
  }

  async function loadImport() {
    try {
      imports = await api.importOverview();
      renderImport();
    } catch (error) {
      $('#adm-import-sources').innerHTML = empty(esc(error.message));
    }
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
    loadImport();
  }

  $$('[data-tab]').forEach((tab) => tab.addEventListener('click', () => {
    $$('[data-tab]').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    $$('.adm-tab').forEach((panel) => { panel.hidden = panel.id !== 'tab-' + tab.dataset.tab; });
  }));
  document.addEventListener('change', async (event) => {
    const select = event.target.closest('[data-source-mode]');
    if (!select) return;
    try {
      await api.importSource(select.dataset.sourceMode, { publishMode: select.value });
      toast(select.value === 'auto' ? 'Evenimentele valide se publică direct; duplicatele incerte rămân la verificat.' : 'Evenimentele noi așteaptă verificarea ta.');
      await loadImport();
    } catch (error) { toast(error.message); }
  });
  $('#adm-search').addEventListener('submit', (event) => { event.preventDefault(); query = $('#adm-q').value.trim(); load(); });

  document.addEventListener('click', async (event) => {
    const account = event.target.closest('[data-account]');
    const moderation = event.target.closest('[data-kind]');
    const message = event.target.closest('[data-message]');
    const run = event.target.closest('[data-source-run]');
    const toggle = event.target.closest('[data-source-toggle]');
    const review = event.target.closest('[data-review]');
    const imported = event.target.closest('[data-import-event]');
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
      } else if (run) {
        const dry = run.dataset.dry === '1';
        if (!dry && !(await ask({ title: 'Rulezi importul acum?', body: '<p>Sursa este citită, iar evenimentele noi intră în catalog (sau în lista de verificat, după modul sursei).</p>', ok: 'Rulează' }))) return;
        run.disabled = true;
        const result = await api.importRun(run.dataset.sourceRun, dry);
        const c = result.counts || {};
        await ask({
          title: dry ? 'Rezultatul simulării' : 'Import terminat', info: true, ok: 'Închide',
          body: `<p>${c.fetched ?? 0} găsite · ${c.created ?? 0} noi · ${c.updated ?? 0} actualizate · ${c.unchanged ?? 0} neschimbate · ${c.linked ?? 0} legate de alte surse · ${c.rejected ?? 0} cu date incomplete · ${c.skipped ?? 0} deja încheiate${c.missing ? ` · ${c.missing} lipsă din sursă` : ''}.</p>${dry ? '<p>Nu s-a scris nimic în catalog.</p>' : ''}`,
        });
        await loadImport();
      } else if (toggle) {
        const enable = toggle.dataset.enabled === '1';
        await api.importSource(toggle.dataset.sourceToggle, { enabled: enable });
        toast(enable ? 'Sursa a fost pornită.' : 'Sursa a fost oprită. Evenimentele deja publicate rămân.');
        await loadImport();
      } else if (review) {
        const { action } = review.dataset;
        if (['reject', 'hide'].includes(action) && !(await ask({ title: action === 'hide' ? 'Ascunzi evenimentul?' : 'Respingi propunerea?', body: '<p>Nu va apărea pe hartă. Participările și discuțiile existente rămân păstrate.</p>', ok: action === 'hide' ? 'Ascunde' : 'Respinge', danger: true }))) return;
        await api.importReview(review.dataset.review, action);
        toast({ approve: 'Publicat pe hartă.', reject: 'Respins.', link: 'Sursele au fost legate.', separate: 'Publicat ca eveniment separat.', hide: 'Ascuns.', keep: 'Păstrat.', dismiss: 'Gata.' }[action] || 'Gata.');
        await loadImport();
      } else if (imported) {
        await api.importEvent(imported.dataset.importEvent, imported.dataset.state);
        toast(imported.dataset.state === 'hidden' ? 'Evenimentul a fost ascuns.' : 'Evenimentul este din nou public.');
        await loadImport();
      } else if (event.target.id === 'adm-copy') {
        await navigator.clipboard.writeText($('#adm-temp').textContent);
        event.target.textContent = 'Copiată';
      }
    } catch (error) { toast(error.message); }
  });

  load();
})();

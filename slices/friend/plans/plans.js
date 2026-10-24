window.PRESENCE = window.PRESENCE || {};

// Plans — "a get-together next Friday, who's på?". A future meetup on the same
// place + passphrase as the live board: one fixed time, an optional title and
// minimum headcount, and a på / kanske / nej answer per person. Lives in its own
// band below today's board and never touches the "N här" count.

(function () {
  const ANSWERS = ['in', 'maybe', 'out'];
  let pendingCancel = null; // planId awaiting the second tap on "ställ in"

  function me() {
    return PRESENCE.myNickname || PRESENCE.storedNickname || '';
  }

  function sameNick(a, b) {
    return !!a && !!b && a.toLowerCase() === b.toLowerCase();
  }

  function myAnswer(plan) {
    const nick = me();
    const r = (plan.rsvps || []).find(function (x) { return sameNick(x.nickname, nick); });
    return r ? r.answer : null;
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  function fmtWhen(iso) {
    const locale = I18N.t('date_locale');
    const d = new Date(iso);
    const days = Math.round((startOfDay(d) - startOfDay(new Date())) / 86400000);
    const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    let day;
    if (days === 0) day = I18N.t('plan_today');
    else if (days === 1) day = I18N.t('plan_tomorrow');
    // sv-SE abbreviates as "tors 29 okt." — drop the abbreviation dot.
    else day = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\.$/, '');
    return day + ' · ' + time;
  }

  function quorumHtml(plan, inCount) {
    if (!plan.minAttendees) return '';
    if (inCount >= plan.minAttendees) {
      return `<div class="plan-quorum plan-quorum--met">${I18N.t('plan_quorum_met')}</div>`;
    }
    return `<div class="plan-quorum">${I18N.t('plan_quorum_missing', { n: plan.minAttendees - inCount, min: plan.minAttendees })}</div>`;
  }

  function renderPlanCard(plan) {
    const rsvps = plan.rsvps || [];
    const mine = myAnswer(plan);
    const byAnswer = {};
    ANSWERS.forEach(function (a) {
      byAnswer[a] = rsvps.filter(function (r) { return r.answer === a; });
    });
    const inCount = byAnswer.in.length;
    const isMine = sameNick(plan.by, me());

    const chips = ANSWERS.map(function (a) {
      const n = byAnswer[a].length;
      return `
        <button class="plan-chip${mine === a ? ' is-mine' : ''}" type="button"
                data-plan-rsvp="${a}" data-plan-id="${escapeHtml(plan.planId)}" aria-pressed="${mine === a}">
          ${mine === a ? '<span class="plan-chip-check" aria-hidden="true">✓</span>' : ''}<span>${I18N.t('plan_answer_' + a)}</span>${n ? `<span class="plan-chip-n">${n}</span>` : ''}
        </button>
      `;
    }).join('');

    const who = ['in', 'maybe'].map(function (a) {
      if (!byAnswer[a].length) return '';
      const names = byAnswer[a].map(function (r) {
        return `<span class="${sameNick(r.nickname, me()) ? 'plan-who-self' : ''}">${escapeHtml(r.nickname)}</span>`;
      }).join(', ');
      return `<div class="plan-who"><span class="plan-who-label">${I18N.t('plan_who_' + a)}</span> ${names}</div>`;
    }).join('');

    const cancelLabel = pendingCancel === plan.planId ? I18N.t('plan_cancel_confirm') : I18N.t('plan_cancel');
    const footer = isMine
      ? `<button class="plan-cancel-btn" type="button" data-plan-cancel="${escapeHtml(plan.planId)}">${cancelLabel}</button>`
      : `<span>${I18N.t('plan_by', { who: escapeHtml(plan.by) })}</span>`;

    return `
      <div class="plan-card" data-plan-card="${escapeHtml(plan.planId)}">
        <div class="plan-when">${fmtWhen(plan.when)}</div>
        <div class="plan-title">${plan.title ? escapeHtml(plan.title) : I18N.t('plan_untitled')}</div>
        ${quorumHtml(plan, inCount)}
        <div class="plan-chips">${chips}</div>
        ${who}
        <div class="plan-footer">${footer}</div>
      </div>
    `;
  }

  PRESENCE.renderPlansBand = function (plans) {
    plans = plans || [];
    const cards = plans.map(renderPlanCard).join('');
    return `
      <div class="plans-band">
        ${plans.length ? `
          <div class="history-divider plans-divider">
            <div class="rule"></div>
            <div class="section-label">${I18N.t('plans_label')}</div>
            <div class="rule"></div>
          </div>
          <div class="plan-cards">${cards}</div>
        ` : ''}
        <div class="plan-trigger">
          <button class="plan-trigger-btn" type="button" data-plan-new>${I18N.t('plan_new')}</button>
        </div>
      </div>
    `;
  };

  PRESENCE.plansHost = function (plans) {
    return `<div id="plans-host">${PRESENCE.renderPlansBand(plans)}</div>`;
  };

  PRESENCE.updatePlansSection = function (plans) {
    const host = document.getElementById('plans-host');
    if (!host) return false;
    PRESENCE._plans = plans || [];
    host.innerHTML = PRESENCE.renderPlansBand(PRESENCE._plans);
    PRESENCE.mountPlansHandlers();
    return true;
  };

  function refresh() {
    return AREYOUAT.getPresenceToday(PRESENCE.place, PRESENCE.passphrase)
      .then(function (data) {
        const snap = PRESENCE.normalizeToday(data);
        if (PRESENCE.cacheToday) PRESENCE.cacheToday(snap);
        if (!PRESENCE.updatePlansSection(snap.plans) && !PRESENCE.isFormOpen()) PRESENCE.renderToday(snap);
      })
      .catch(function () { PRESENCE.query({ silent: true }); });
  }

  function rememberName(name) {
    PRESENCE.myNickname = name;
    PRESENCE.storedNickname = name;
    localStorage.setItem(PRESENCE.storageKey, JSON.stringify({ nickname: name, passphrase: PRESENCE.passphrase }));
  }

  function rsvp(planId, answer, nickname) {
    // Optimistic: flip my answer locally so the chip responds instantly.
    const plans = (PRESENCE._plans || []).map(function (p) {
      if (p.planId !== planId) return p;
      const others = (p.rsvps || []).filter(function (r) { return !sameNick(r.nickname, nickname); });
      return Object.assign({}, p, { rsvps: others.concat([{ nickname: nickname, answer: answer, at: new Date().toISOString() }]) });
    });
    PRESENCE.updatePlansSection(plans);
    AREYOUAT.rsvpPlan(PRESENCE.place, PRESENCE.passphrase, planId, nickname, answer)
      .then(refresh, refresh);
  }

  PRESENCE.mountPlansHandlers = function () {
    document.querySelectorAll('[data-plan-new]').forEach(function (el) {
      el.addEventListener('click', function () { PRESENCE.renderPlanPrompt(); });
    });
    document.querySelectorAll('[data-plan-rsvp]').forEach(function (el) {
      el.addEventListener('click', function () {
        const planId = el.getAttribute('data-plan-id');
        const answer = el.getAttribute('data-plan-rsvp');
        const nick = me();
        if (nick) rsvp(planId, answer, nick);
        else renderNameStep(function (name) {
          PRESENCE.renderLoading();
          AREYOUAT.rsvpPlan(PRESENCE.place, PRESENCE.passphrase, planId, name, answer)
            .then(function () { PRESENCE.query(); }, function () { PRESENCE.query(); });
        });
      });
    });
    document.querySelectorAll('[data-plan-cancel]').forEach(function (el) {
      el.addEventListener('click', function () {
        const planId = el.getAttribute('data-plan-cancel');
        if (pendingCancel !== planId) {
          // Two-tap confirm instead of a blocking dialog.
          pendingCancel = planId;
          PRESENCE.updatePlansSection(PRESENCE._plans);
          return;
        }
        pendingCancel = null;
        PRESENCE.updatePlansSection((PRESENCE._plans || []).filter(function (p) { return p.planId !== planId; }));
        AREYOUAT.cancelPlan(PRESENCE.place, PRESENCE.passphrase, planId, me())
          .then(refresh, refresh);
      });
    });
  };

  function avatarBinder(input, avatar) {
    function update() {
      const v = input.value.trim();
      if (v && PRESENCE.nickInitials) {
        avatar.textContent = PRESENCE.nickInitials(v);
        avatar.classList.add('has-name');
        avatar.style.background = PRESENCE.nickBg(v);
        avatar.style.color = PRESENCE.nickInk(v);
      } else {
        avatar.textContent = '—';
        avatar.classList.remove('has-name');
        avatar.style.background = '';
        avatar.style.color = '';
      }
    }
    update();
    input.addEventListener('input', update);
  }

  function nameBlock(initial) {
    return `
      <div class="scandi-avatar-block">
        <div class="scandi-avatar" id="avatar">—</div>
        <input class="scandi-nickname-input" id="name-input" type="text" placeholder="${I18N.t('name_placeholder')}" value="${escapeHtml(initial)}" autocomplete="off" />
        <div class="scandi-hint">${I18N.t('name_saved_hint')}</div>
      </div>
    `;
  }

  function backToBoard() {
    PRESENCE.renderLoading();
    PRESENCE.query();
  }

  // Only needed when someone answers a plan before the device knows their name.
  function renderNameStep(then) {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="scandi-screen">
        <div class="scandi-chrome">
          <div class="section-label">${I18N.t('plans_label')}</div>
          <div class="lang-switcher"></div>
        </div>
        <div class="scandi-hero">
          <div class="display-heading">${I18N.t('name_prompt_a')} <span class="italic">${I18N.t('name_prompt_b')}</span></div>
        </div>
        ${nameBlock('')}
        <div style="flex:1"></div>
        <div style="display:flex; gap:10px; margin-top:28px;">
          <button class="scandi-btn" id="plan-name-submit" style="flex:2;"><span>${I18N.t('passphrase_submit')}</span><span>→</span></button>
          <button class="scandi-btn scandi-btn--ghost-soft" id="cancel-btn" style="flex:1;">${I18N.t('name_cancel')}</button>
        </div>
      </div>
    `;
    I18N.mountSwitcher();
    const input = document.getElementById('name-input');
    avatarBinder(input, document.getElementById('avatar'));
    function submit() {
      const name = input.value.trim();
      if (!name) { input.focus(); return; }
      rememberName(name);
      then(name);
    }
    document.getElementById('plan-name-submit').addEventListener('click', submit);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    document.getElementById('cancel-btn').addEventListener('click', backToBoard);
    input.focus();
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function isoDate(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  // Default suggestion: the coming Friday (a week out if today is Friday).
  function defaultDate() {
    const d = new Date();
    const ahead = ((5 - d.getDay() + 7) % 7) || 7;
    d.setDate(d.getDate() + ahead);
    return isoDate(d);
  }

  PRESENCE.renderPlanPrompt = function () {
    const app = document.getElementById('app');
    const initial = me();
    let min = 0;

    app.innerHTML = `
      <div class="scandi-screen">
        <div class="scandi-chrome">
          <div class="section-label">${I18N.t('plans_label')}</div>
          <div class="lang-switcher"></div>
        </div>

        <div class="scandi-hero">
          <div class="display-heading"><span class="italic">${I18N.t('plan_prompt')}</span></div>
          <div class="scandi-sub">${I18N.t('plan_hint')}</div>
        </div>

        ${nameBlock(initial)}

        <div class="plan-form">
          <input class="plan-input" id="plan-title-input" type="text" maxlength="40" placeholder="${I18N.t('plan_title_placeholder')}" autocomplete="off" />
          <div class="plan-form-row">
            <input class="plan-input" id="plan-date-input" type="date" value="${defaultDate()}" min="${isoDate(new Date())}" />
            <input class="plan-input" id="plan-time-input" type="time" value="18:00" />
          </div>
          <div class="plan-min">
            <div class="plan-min-label">${I18N.t('plan_min_label')}</div>
            <div class="plan-stepper">
              <button class="plan-step-btn" id="plan-min-dec" type="button" aria-label="−">−</button>
              <div class="plan-min-value" id="plan-min-value">${I18N.t('plan_min_none')}</div>
              <button class="plan-step-btn" id="plan-min-inc" type="button" aria-label="+">+</button>
            </div>
          </div>
          <div class="plan-error" id="plan-error" hidden></div>
        </div>

        <div style="flex:1"></div>

        <div style="display:flex; gap:10px; margin-top:28px;">
          <button class="scandi-btn" id="plan-submit" style="flex:2;"><span>${I18N.t('plan_submit')}</span><span>📅</span></button>
          <button class="scandi-btn scandi-btn--ghost-soft" id="cancel-btn" style="flex:1;">${I18N.t('name_cancel')}</button>
        </div>
      </div>
    `;

    I18N.mountSwitcher();

    const input = document.getElementById('name-input');
    avatarBinder(input, document.getElementById('avatar'));
    const minValue = document.getElementById('plan-min-value');
    function setMin(n) {
      min = Math.max(0, Math.min(50, n));
      minValue.textContent = min ? String(min) : I18N.t('plan_min_none');
    }
    document.getElementById('plan-min-dec').addEventListener('click', function () { setMin(min - 1); });
    document.getElementById('plan-min-inc').addEventListener('click', function () { setMin(min ? min + 1 : 2); });

    const error = document.getElementById('plan-error');
    function fail(msg) {
      error.textContent = msg;
      error.hidden = false;
    }

    function submit() {
      const name = input.value.trim();
      if (!name) { input.focus(); return; }
      const date = document.getElementById('plan-date-input').value;
      const time = document.getElementById('plan-time-input').value;
      if (!date || !time) { fail(I18N.t('plan_error_when')); return; }
      const when = new Date(date + 'T' + time);
      if (isNaN(when.getTime()) || when.getTime() < Date.now()) { fail(I18N.t('plan_error_when')); return; }
      const title = document.getElementById('plan-title-input').value.trim();
      rememberName(name);
      PRESENCE.renderLoading();
      AREYOUAT.proposePlan(PRESENCE.place, PRESENCE.passphrase, name, when.toISOString(), title, min || null)
        .then(function () { PRESENCE.query(); }, function () { PRESENCE.query(); });
    }

    document.getElementById('plan-submit').addEventListener('click', submit);
    document.getElementById('plan-title-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });
    document.getElementById('cancel-btn').addEventListener('click', backToBoard);
  };

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();

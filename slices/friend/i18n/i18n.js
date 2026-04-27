window.I18N = window.I18N || {};

(function () {
  const STRINGS = {
    sv: {
      app_title: 'Är du på?',
      app_title_short: 'är du på?',
      loading: 'kollar…',
      empty_heading: 'ingen e här',
      empty_time_sub: 'kl {time} · {date}',
      but_im_here: 'men jag är!',
      check_again: 'kolla igen',
      banner_zero: 'ingen e här nu',
      banner_one: 'någon e här!',
      banner_many: '{n} e här',
      banner_here: 'här',
      sub_alone: 'bara du',
      sub_you_plus_one: 'du · 1 till',
      sub_you_plus_many: 'du · {n} till',
      join_zero: 'jag med!',
      join_one: 'jag med!',
      join_many: 'jag med!',
      you_label: 'du',
      you_suffix: '(du)',
      time_now: 'nu',
      others_can_see: 'andra i gruppen kan se dig nu',
      history_label: 'var här tidigare',
      error_wrong_pass: 'fel lösenord eller nätverksfel — försök igen',
      error_generic: 'något gick fel — försök igen',
      leave: 'lämna',
      passphrase_prompt: 'vad brukar vi säga?',
      passphrase_submit: 'fortsätt',
      name_prompt_a: 'vem e',
      name_prompt_b: 'du?',
      name_placeholder: 'ditt namn',
      name_submit: 'jag är här!',
      name_cancel: 'avbryt',
      name_saved_hint: 'sparat på den här enheten · ändra när som helst',
      landing_heading_a: 'är du',
      landing_heading_b: 'på?',
      landing_place_label: 'platsen',
      landing_pp_label: 'magicword',
      landing_place_placeholder: 'bron, gymmet, kontoret…',
      landing_pp_placeholder: 'vad brukar vi säga?',
      landing_submit: 'fortsätt',
      landing_about: 'hitta på ett platsnamn och ett magicword som bara ni känner till — dela länken med vänner så ser ni vem som är där just nu.',
      landing_about2: 'ingen app. inget konto. allt nollställs vid midnatt.',
      enter_heading_a: 'är du',
      enter_heading_b: 'på?',
      section_label_01: 'N°01',
      section_label_02: 'N°02',
      share: 'dela',
      share_title: 'ge någon frasen.',
      share_copy: 'kopiera',
      share_copied: 'kopierat',
      on_the_way: 'på väg',
      eta_prompt: 'på väg dit?',
      eta_hint: 'sätt en tid så vet de att du kommer',
      set_eta: 'sätt tid',
      eta_after_work: 'efter jobbet',
      eta_custom: 'annan tid',
      eta_go: 'kör',
      eta_invalid: 'tiden har passerat',
      arrived: 'jag är här',
      cancel_eta: 'kommer inte',
      set_leaving: 'ska gå om…',
      cancel_leaving: 'stannar kvar',
      leaving_now: 'går nu',
      status_prompt: 'lägg till en lapp — var du är',
      status_placeholder: 'vid fönstret',
      show_more: 'visa {n} till',
      show_less: 'visa mindre',
      about_page_title: 'Är du på? — om',
      about_heading: 'hur funkar det?',
      about_intro: 'dela en plats med vänner — se vem som är där just nu.',
      about_step1: 'hitta på ett <strong>platsnamn</strong> — t.ex. <em>bron</em>, <em>gymmet</em>, <em>kontoret</em>',
      about_step2: 'hitta på ett <strong>magicword</strong> som bara ni i gruppen känner till',
      about_step3: 'dela länken <strong>rdp.itsybit.se/platsnamn</strong> med dina vänner',
      about_footer: 'ingen registrering. ingen app. allt nollställs vid midnatt.',
      about_back: '← tillbaka',
      bell_on: 'notiser på — klicka för att stänga av',
      bell_off: 'få notis när någon dyker upp',
      changelog_page_title: 'Är du på? — ändringar',
      changelog_heading: 'vad är nytt?',
      changelog_link: 'vad är nytt?',
      cl_type_feature: 'nytt',
      cl_type_fix: 'fix',
      cl_type_refactor: 'förbättrat',
      cl_type_update: 'uppdatering',
      pin_label: 'plats',
      pin_open: 'öppna i kartan',
      pin_drop: 'sätt pin',
      pin_replace: 'flytta pin',
      pin_remove: 'ta bort pin',
      pin_remove_confirm: 'tryck igen för att ta bort',
      pin_copy: 'kopiera kartlänk',
      pin_copied: 'kopierat',
      pin_set_by: 'satt av {who}',
      pin_set_anon: 'sparad plats',
      pin_just_now: 'nyss',
      pin_ago_min: '{n} min sedan',
      pin_ago_hr: '{n} t sedan',
      pin_ago_day: '{n} d sedan',
      pin_locating: 'letar dig…',
      pin_denied: 'platsåtkomst nekades',
      pin_unavailable: 'kunde inte hitta dig',
      date_locale: 'sv-SE'
    },
    en: {
      app_title: 'You in?',
      app_title_short: 'you in?',
      loading: 'peekin…',
      empty_heading: 'crickets — nobody here',
      empty_time_sub: '{time} · {date}',
      but_im_here: 'but i am tho!',
      check_again: 'peek again',
      banner_zero: 'nobody here rn',
      banner_one: 'someone\'s here!',
      banner_many: '{n}',
      banner_here: 'here',
      sub_alone: 'just you',
      sub_you_plus_one: 'you · 1 other',
      sub_you_plus_many: 'you · {n} others',
      join_zero: 'me too!',
      join_one: 'me too!',
      join_many: 'me too!',
      you_label: 'you',
      you_suffix: '(you)',
      time_now: 'now',
      others_can_see: 'others in the group can see you now',
      history_label: 'swung by earlier',
      error_wrong_pass: 'wrong magicword or network oopsie — try again',
      error_generic: 'something went sideways — try again',
      leave: 'out',
      passphrase_prompt: 'what\'s the magic word?',
      passphrase_submit: 'go!',
      name_prompt_a: 'and you',
      name_prompt_b: 'are…?',
      name_placeholder: 'your name',
      name_submit: 'i\'m here!',
      name_cancel: 'never mind',
      name_saved_hint: 'saved on this device · change anytime',
      landing_heading_a: 'are you',
      landing_heading_b: 'in?',
      landing_place_label: 'place',
      landing_pp_label: 'magicword',
      landing_place_placeholder: 'bridge, gym, office…',
      landing_pp_placeholder: 'what\'s the magic word?',
      landing_submit: 'go',
      landing_about: 'pick a place name and a magicword only your squad knows — share the link and see who\'s there right now.',
      landing_about2: 'no app. no account. resets at midnight.',
      enter_heading_a: 'you',
      enter_heading_b: 'in?',
      section_label_01: 'N°01',
      section_label_02: 'N°02',
      share: 'share',
      share_title: 'pass the phrase.',
      share_copy: 'copy',
      share_copied: 'copied',
      on_the_way: 'on the way',
      eta_prompt: 'heading over?',
      eta_hint: 'set an eta so people know you\'re coming',
      set_eta: 'set eta',
      eta_after_work: 'after work',
      eta_custom: 'other time',
      eta_go: 'go',
      eta_invalid: 'time has passed',
      arrived: 'i\'m here',
      cancel_eta: 'not coming',
      set_leaving: 'leaving in…',
      cancel_leaving: 'staying',
      leaving_now: 'heading out',
      status_prompt: 'add a note — where to find you',
      status_placeholder: 'by the window',
      show_more: 'show {n} more',
      show_less: 'show less',
      about_page_title: 'You in? — about',
      about_heading: 'how\'s it work?',
      about_intro: 'share a spot with friends — see who\'s there right now.',
      about_step1: 'pick a <strong>place name</strong> — e.g. <em>bridge</em>, <em>gym</em>, <em>office</em>',
      about_step2: 'pick a <strong>magicword</strong> only your squad knows',
      about_step3: 'share the link <strong>rdp.itsybit.se/placename</strong> with your friends',
      about_footer: 'no sign-up. no app. resets at midnight.',
      about_back: '← back',
      bell_on: 'alerts on — tap to mute',
      bell_off: 'get pinged when someone rolls up',
      changelog_page_title: 'You in? — what\'s new',
      changelog_heading: 'what\'s new?',
      changelog_link: 'what\'s new?',
      cl_type_feature: 'new',
      cl_type_fix: 'fix',
      cl_type_refactor: 'improved',
      cl_type_update: 'update',
      pin_label: 'location',
      pin_open: 'open in maps',
      pin_drop: 'drop a pin',
      pin_replace: 'move pin',
      pin_remove: 'remove pin',
      pin_remove_confirm: 'tap again to remove',
      pin_copy: 'copy maps link',
      pin_copied: 'copied',
      pin_set_by: 'set by {who}',
      pin_set_anon: 'saved location',
      pin_just_now: 'just now',
      pin_ago_min: '{n} min ago',
      pin_ago_hr: '{n}h ago',
      pin_ago_day: '{n}d ago',
      pin_locating: 'finding you…',
      pin_denied: 'location access denied',
      pin_unavailable: 'couldn\'t find you',
      date_locale: 'en-US'
    }
  };

  const STORAGE_KEY = 'i18n.lang';

  I18N.STRINGS = STRINGS;
  I18N.lang = localStorage.getItem(STORAGE_KEY) || 'sv';

  I18N.t = function (key, vars) {
    const dict = STRINGS[I18N.lang] || STRINGS.sv;
    const s = dict[key] != null ? dict[key] : key;
    if (!vars) return s;
    return s.replace(/\{(\w+)\}/g, function (_, k) {
      return vars[k] != null ? vars[k] : '';
    });
  };

  I18N.setLang = function (lang) {
    if (!STRINGS[lang] || lang === I18N.lang) return;
    localStorage.setItem(STORAGE_KEY, lang);
    location.reload();
  };

  I18N.applyStatic = function () {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const key = el.getAttribute('data-i18n');
      if (el.hasAttribute('data-i18n-html')) el.innerHTML = I18N.t(key);
      else el.textContent = I18N.t(key);
    });
    document.documentElement.setAttribute('lang', I18N.lang);
  };

  I18N.switcherHTML = function () {
    return ['sv', 'en'].map(function (lang) {
      return '<button class="lang-btn' + (lang === I18N.lang ? ' lang-btn--active' : '') +
        '" data-lang="' + lang + '" aria-label="switch to ' + lang + '">' +
        lang.toUpperCase() + '</button>';
    }).join('');
  };

  I18N.bindSwitcher = function (host) {
    if (!host) return;
    host.querySelectorAll('[data-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () { I18N.setLang(btn.getAttribute('data-lang')); });
    });
  };

  I18N.mountSwitcher = function () {
    const hosts = document.querySelectorAll('.lang-switcher');
    if (hosts.length === 0) {
      const host = document.createElement('div');
      host.className = 'lang-switcher lang-switcher--floating';
      host.innerHTML = I18N.switcherHTML();
      document.body.appendChild(host);
      I18N.bindSwitcher(host);
    } else {
      hosts.forEach(function (host) {
        host.innerHTML = I18N.switcherHTML();
        I18N.bindSwitcher(host);
      });
    }
  };

  function init() {
    I18N.applyStatic();
    I18N.mountSwitcher();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

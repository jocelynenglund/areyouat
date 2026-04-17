window.PRESENCE = window.PRESENCE || {};

PRESENCE.leave = function () {
  window.AREYOUAT.leavePresence(PRESENCE.place, PRESENCE.passphrase, PRESENCE.myNickname)
    .then(function () {
      localStorage.setItem(PRESENCE.storageKey, JSON.stringify({
        nickname: PRESENCE.myNickname,
        passphrase: PRESENCE.passphrase,
        checkedIn: false
      }));
      PRESENCE.myNickname = null;
      PRESENCE.renderLoading();
      PRESENCE.query();
    })
    .catch(function () { PRESENCE.renderLoading(); PRESENCE.query(); });
};

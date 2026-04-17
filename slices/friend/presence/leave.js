window.PRESENCE = window.PRESENCE || {};

PRESENCE.leave = function () {
  window.AREYOUAT.leavePresence(PRESENCE.place, PRESENCE.passphrase, PRESENCE.myNickname)
    .then(function () {
      PRESENCE.myNickname = null;
      localStorage.removeItem(PRESENCE.storageKey);
      PRESENCE.renderLoading();
      PRESENCE.query();
    })
    .catch(function () { PRESENCE.renderLoading(); PRESENCE.query(); });
};

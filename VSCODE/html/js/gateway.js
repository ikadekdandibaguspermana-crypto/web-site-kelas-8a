(function () {
  'use strict';

  var gateLanding = document.getElementById('gateLanding');
  if (!gateLanding) return;

  var SESSION_KEY = 'aventra_session';

  function hasActiveSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      return !!(data && data.token && data.expiry && Date.now() <= data.expiry);
    } catch (e) {
      return false;
    }
  }

  function dismissGate() {
    document.body.classList.remove('gate-pending');
    gateLanding.style.display = 'none';
  }

  if (hasActiveSession()) {
    dismissGate();
    return;
  }

  function chooseGate(role) {
    dismissGate();

    if (role === 'guest') {
      var guestBtn = document.getElementById('loginGuestBtn');
      if (guestBtn) guestBtn.click();
      return;
    }

    if (role === 'guru' || role === 'admin') {
      var toggleBtn = document.getElementById('loginToggle');
      var adminForm = document.getElementById('loginFormAdmin');
 
      if (toggleBtn && adminForm && adminForm.style.display === 'none') {
        toggleBtn.click();
      }
      var passInput = document.getElementById('loginAdminPass');
      if (passInput) setTimeout(function () { passInput.focus(); }, 50);
      return;
    }

    var nameInput = document.getElementById('loginName');
    if (nameInput) setTimeout(function () { nameInput.focus(); }, 50);
  }

  document.querySelectorAll('.gate-card').forEach(function (card) {
    card.addEventListener('click', function () {
      chooseGate(card.getAttribute('data-gate'));
    });
  });

  var gateBurgerBtn = document.getElementById('gateBurgerBtn');
  var gateMobileMenu = document.getElementById('gateMobileMenu');
  if (gateBurgerBtn && gateMobileMenu) {
    gateBurgerBtn.addEventListener('click', function () {
      gateMobileMenu.classList.toggle('open');
      gateBurgerBtn.classList.toggle('active');
    });
    gateMobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        gateMobileMenu.classList.remove('open');
        gateBurgerBtn.classList.remove('active');
      });
    });
  }

  var gateNavWrap = document.getElementById('gateNavWrap');
  if (gateNavWrap) {
    window.addEventListener('scroll', function () {
      if (!document.body.classList.contains('gate-pending')) return;
      gateNavWrap.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  }
})();
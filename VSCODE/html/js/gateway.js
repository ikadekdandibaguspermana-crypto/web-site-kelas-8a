(function () {
  'use strict';

  const gateLanding = document.getElementById('gateLanding');
  if (!gateLanding) return;

  const SESSION_KEY = 'aventra_session';

  function hasActiveSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return false;

      const data = JSON.parse(raw);

      return Boolean(
        data &&
        data.token &&
        data.expiry &&
        Date.now() <= Number(data.expiry)
      );
    } catch {
      return false;
    }
  }

  function closeGate() {
    document.body.classList.remove('gate-pending');
    gateLanding.style.display = 'none';
  }

  function openLogin() {
    const loginBox = document.getElementById('loginBox');

    if (loginBox) {
      loginBox.hidden = false;
      loginBox.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }

    const loginName = document.getElementById('loginName');

    if (loginName) {
      setTimeout(() => loginName.focus(), 150);
    }
  }

  if (hasActiveSession()) {
    closeGate();
    return;
  }

  document.querySelectorAll('.gate-card').forEach((card) => {
    card.addEventListener('click', () => {
      const role = card.dataset.gate;

      if (role === 'guest') {
        const guestButton =
          document.getElementById('loginGuestBtn');

        if (guestButton) {
          guestButton.click();
          return;
        }
      }

      closeGate();

      if (
        role === 'guru' ||
        role === 'admin' ||
        role === 'student'
      ) {
        openLogin();
      }
    });
  });

  const gateBurgerBtn =
    document.getElementById('gateBurgerBtn');

  const gateMobileMenu =
    document.getElementById('gateMobileMenu');

  if (gateBurgerBtn && gateMobileMenu) {
    gateBurgerBtn.addEventListener('click', () => {
      gateMobileMenu.classList.toggle('open');
      gateBurgerBtn.classList.toggle('active');
    });

    gateMobileMenu
      .querySelectorAll('a')
      .forEach((link) => {
        link.addEventListener('click', () => {
          gateMobileMenu.classList.remove('open');
          gateBurgerBtn.classList.remove('active');
        });
      });
  }

  const gateNavWrap =
    document.getElementById('gateNavWrap');

  if (gateNavWrap) {
    window.addEventListener(
      'scroll',
      () => {
        if (!document.body.classList.contains('gate-pending')) {
          return;
        }

        gateNavWrap.classList.toggle(
          'scrolled',
          window.scrollY > 40
        );
      },
      { passive: true }
    );
  }
})();
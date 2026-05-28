/* =============================================
   FIREBASE — Auth + Database (single instance)
   Barnet Nightingales FC 2026/27
   ============================================= */
import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider,
         signInWithPopup, signInWithRedirect, getRedirectResult,
         onAuthStateChanged, signOut as fbSignOut }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getDatabase, ref, get, set, onValue }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

// ── Single Firebase instance ────────────────────
const app  = initializeApp({
  apiKey:            "AIzaSyB7NtLjOjjrqxziUzNJhXmPAV1Wm3PYXbo",
  authDomain:        "bnfc-monitor.firebaseapp.com",
  databaseURL:       "https://bnfc-monitor-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "bnfc-monitor",
  storageBucket:     "bnfc-monitor.firebasestorage.app",
  messagingSenderId: "879329706564",
  appId:             "1:879329706564:web:0df7f3891e44120fb17211",
});
const auth = getAuth(app);
const db   = getDatabase(app);

// ── Expose database helpers to app.js ──────────
window.bnfc = {
  dbRead:     ()           => get(ref(db, 'bnfc')).then(s => s.exists() ? s.val() : null),
  dbWrite:    (key, value) => set(ref(db, 'bnfc/' + key), value),
  dbWriteAll: (data)       => set(ref(db, 'bnfc'), data),
  dbListen:   (cb)         => onValue(ref(db, 'bnfc'), s => { if (s.exists()) cb(s.val()); }),
};

// ── Approved users ──────────────────────────────
const APPROVED_EMAILS = [
  "athanchavales@gmail.com",
  "makropoulos.john@gmail.com",
];

function isApproved(email) {
  return APPROVED_EMAILS
    .map(e => e.toLowerCase().trim())
    .includes((email || '').toLowerCase().trim());
}

// ── Detect mobile ───────────────────────────────
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// ── UI helpers ──────────────────────────────────
function showLogin(errorMsg) {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app-root').classList.add('hidden');
  const err = document.getElementById('login-error');
  if (errorMsg) {
    err.textContent = errorMsg;
    err.classList.remove('hidden');
  } else {
    err.classList.add('hidden');
  }
  const btn = document.getElementById('google-signin-btn');
  if (btn) { btn.textContent = 'Sign in with Google'; btn.disabled = false; }
}

function showApp(user) {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-root').classList.remove('hidden');
  const photo = document.getElementById('user-photo');
  const name  = document.getElementById('user-name');
  if (photo && user.photoURL) { photo.src = user.photoURL; photo.style.display = 'block'; }
  if (name) name.textContent = user.displayName || user.email || 'Coach';
  const tryLoad = () => {
    if (typeof loadData === 'function') loadData();
    else setTimeout(tryLoad, 100);
  };
  tryLoad();
}

async function handleUser(user) {
  if (!user) { showLogin(); return; }
  if (isApproved(user.email)) {
    showApp(user);
  } else {
    await fbSignOut(auth);
    showLogin('Access denied. ' + user.email + ' is not authorised.');
  }
}

// ── Boot ────────────────────────────────────────
async function boot() {
  let handled = false;

  // On mobile: check if returning from a Google redirect
  if (isMobile) {
    try {
      const result = await getRedirectResult(auth);
      if (result?.user) {
        handled = true;
        await handleUser(result.user);
        // Still set up the sign-out watcher
        onAuthStateChanged(auth, u => { if (!u) showLogin(); });
        return;
      }
    } catch(e) { console.error('redirect result:', e); }
  }

  // Desktop + mobile (no redirect result): use auth state
  onAuthStateChanged(auth, async user => {
    if (!handled) {
      handled = true;
      await handleUser(user);
    } else {
      if (!user) showLogin();
    }
  });
}

boot();

// ── Sign-in button ──────────────────────────────
document.getElementById('google-signin-btn').addEventListener('click', async () => {
  const btn = document.getElementById('google-signin-btn');
  const err = document.getElementById('login-error');
  btn.disabled = true;
  err.classList.add('hidden');

  try {
    if (isMobile) {
      // Mobile: redirect flow (popup blocked on Android Chrome)
      btn.textContent = 'Redirecting to Google…';
      await signInWithRedirect(auth, new GoogleAuthProvider());
      // Page navigates away — boot() handles result on return
    } else {
      // Desktop: popup flow (instant, no page navigation)
      btn.textContent = 'Signing in…';
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      await handleUser(result.user);
      onAuthStateChanged(auth, u => { if (!u) showLogin(); });
    }
  } catch(e) {
    if (e.code === 'auth/popup-blocked') {
      // Desktop popup blocked — fall back to redirect
      btn.textContent = 'Redirecting…';
      await signInWithRedirect(auth, new GoogleAuthProvider());
    } else if (e.code !== 'auth/popup-closed-by-user' &&
               e.code !== 'auth/cancelled-popup-request') {
      err.textContent = 'Sign-in failed: ' + (e.message || e.code);
      err.classList.remove('hidden');
      btn.textContent = 'Sign in with Google';
      btn.disabled = false;
    } else {
      btn.textContent = 'Sign in with Google';
      btn.disabled = false;
    }
  }
});

// ── Sign out ────────────────────────────────────
window.signOut = async () => {
  await fbSignOut(auth);
  if (typeof players !== 'undefined') players = [];
  if (typeof records !== 'undefined') records = {};
  if (typeof photos  !== 'undefined') photos  = {};
  showLogin();
};

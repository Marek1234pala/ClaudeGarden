// API is on the same server that served this page — no hardcoded URL needed
const API = '/api/auth';

// ── Toggle forms ──────────────────────────────────────────────────────────────
const signUpButton = document.getElementById('signUpButton');
const signInButton = document.getElementById('signInButton');
const signInForm   = document.getElementById('signIn');
const signUpForm   = document.getElementById('signup');

signUpButton.addEventListener('click', () => {
  signInForm.style.display = 'none';
  signUpForm.style.display = 'block';
  document.getElementById('registerError').textContent = '';
});

signInButton.addEventListener('click', () => {
  signInForm.style.display = 'block';
  signUpForm.style.display = 'none';
  document.getElementById('loginError').textContent = '';
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function showError(elementId, message) {
  document.getElementById(elementId).textContent = message;
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  btn.disabled = loading;
  btn.value = loading ? 'Please wait…' : btn.dataset.originalValue;
}

document.getElementById('registerBtn').dataset.originalValue = 'Sign Up';
document.getElementById('loginBtn').dataset.originalValue    = 'Sign In';

// ── Register ──────────────────────────────────────────────────────────────────
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('registerError', '');
  setLoading('registerBtn', true);

  const body = {
    firstName: document.getElementById('fName').value.trim(),
    lastName:  document.getElementById('lName').value.trim(),
    email:     document.getElementById('regEmail').value.trim(),
    password:  document.getElementById('regPassword').value,
  };

  try {
    const res  = await fetch(`${API}/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    const data = await res.json();

    if (data.success) {
      window.location.href = '/homepage.html';
    } else {
      showError('registerError', data.errors?.[0]?.message || data.message || 'Registration failed.');
    }
  } catch {
    showError('registerError', 'Could not reach the server.');
  } finally {
    setLoading('registerBtn', false);
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('loginError', '');
  setLoading('loginBtn', true);

  const body = {
    email:    document.getElementById('loginEmail').value.trim(),
    password: document.getElementById('loginPassword').value,
  };

  try {
    const res  = await fetch(`${API}/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    const data = await res.json();

    if (data.success) {
      window.location.href = '/homepage.html';
    } else {
      showError('loginError', data.errors?.[0]?.message || data.message || 'Login failed.');
    }
  } catch {
    showError('loginError', 'Could not reach the server.');
  } finally {
    setLoading('loginBtn', false);
  }
});

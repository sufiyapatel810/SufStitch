// ============================================================
//  auth.js — SufStitch Firebase Authentication
// ============================================================

import {
  auth,
  db,
  doc,
  setDoc,
  serverTimestamp,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from './firebase.js'

// ── SIGN UP FUNCTION ──
async function signUp(name, email, password) {
  try {
    // Create account in Firebase Auth
    const userCredential = await 
      createUserWithEmailAndPassword(
        auth, email, password
      )

    const user = userCredential.user

    // Save extra info to Firestore
    await setDoc(doc(db, 'users', user.uid), {
      name:      name,
      email:     email,
      createdAt: serverTimestamp()
    })

    // Go to homepage after signup
    window.location.href = 'index.html'

  } catch (error) {
    // Return friendly error message
    return getErrorMessage(error.code)
  }
}

// ── SIGN IN FUNCTION ──
async function signIn(email, password) {
  try {
    await signInWithEmailAndPassword(
      auth, email, password
    )

    // Go to homepage after login
    window.location.href = 'index.html'

  } catch (error) {
    return getErrorMessage(error.code)
  }
}

// ── LOGOUT FUNCTION ──
async function logOut() {
  await signOut(auth)
  window.location.href = 'index.html'
}

// ── FRIENDLY ERROR MESSAGES ──
function getErrorMessage(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered.'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/user-not-found':
      return 'No account found with this email.'
    case 'auth/wrong-password':
      return 'Incorrect password. Try again.'
    case 'auth/invalid-credential':
      return 'Invalid email or password.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.'
    default:
      return 'Something went wrong. Try again.'
  }
}

// ── WATCH IF USER IS LOGGED IN ──
// This runs on every page automatically
onAuthStateChanged(auth, (user) => {
  const loginBtn  = document.getElementById('nav-login-btn')
  const logoutBtn = document.getElementById('nav-logout-btn')
  const userName  = document.getElementById('nav-user-name')

  if (user) {
    // User IS logged in
    if (loginBtn)  loginBtn.style.display  = 'none'
    if (logoutBtn) logoutBtn.style.display = 'block'
    if (userName)  userName.textContent    = 
                   user.displayName || user.email
  } else {
    // User is NOT logged in
    if (loginBtn)  loginBtn.style.display  = 'block'
    if (logoutBtn) logoutBtn.style.display = 'none'
    if (userName)  userName.textContent    = ''
  }
})

// ── BIND LOGIN FORM ──
document.getElementById('login-form')
  ?.addEventListener('submit', async (e) => {
    e.preventDefault()

    const btn      = document.getElementById('login-btn')
    const errorEl  = document.getElementById('auth-error')

    // Show loading state
    btn.disabled    = true
    btn.innerHTML   = `
      <i class="fas fa-spinner fa-spin"></i> 
      Signing in...`

    const email    = document.getElementById('login-email').value
    const password = document.getElementById('login-password').value

    const error = await signIn(email, password)

    if (error) {
      // Show error message
      errorEl.textContent = error
      btn.disabled        = false
      btn.innerHTML       = `
        <i class="fas fa-sign-in-alt"></i> 
        Sign In`
    }
  })

// ── BIND SIGNUP FORM ──
document.getElementById('signup-form')
  ?.addEventListener('submit', async (e) => {
    e.preventDefault()

    const btn     = document.getElementById('signup-btn')
    const errorEl = document.getElementById('auth-error')

    // Show loading state
    btn.disabled  = true
    btn.innerHTML = `
      <i class="fas fa-spinner fa-spin"></i> 
      Creating account...`

    const name     = document.getElementById('signup-name').value
    const email    = document.getElementById('signup-email').value
    const password = document.getElementById('signup-password').value

    const error = await signUp(name, email, password)

    if (error) {
      // Show error message
      errorEl.textContent = error
      btn.disabled        = false
      btn.innerHTML       = `
        <i class="fas fa-user-plus"></i> 
        Create Account`
    }
  })

// ── BIND LOGOUT BUTTON ──
document.getElementById('nav-logout-btn')
  ?.addEventListener('click', logOut)

export { signUp, signIn, logOut }
import { auth, fbAuth, db, fbStore, isFirebaseReady } from './firebase.js';
import { OWNER_UIDS } from '../config/app-config.js';
import { bus } from './events.js';

const { onAuthStateChanged, signInAnonymously, signInWithPopup, GoogleAuthProvider, signOut } = fbAuth;
const { doc, getDoc, setDoc, serverTimestamp } = fbStore;

let currentUser = null;
let currentRoles = null; // { isOwner, isAdmin, perms: string[] } | null trước khi resolve

export function getCurrentUser() {
  return currentUser;
}

export function getCurrentRoles() {
  return currentRoles;
}

export function isOwner() {
  return !!currentUser && OWNER_UIDS.includes(currentUser.uid);
}

export function isAdminOrOwner() {
  return isOwner() || !!currentRoles?.isAdmin;
}

export function hasPerm(group) {
  if (isOwner()) return true;
  return !!currentRoles?.perms?.includes(group);
}

/** Đăng nhập ẩn danh cho khách chưa đăng nhập — cần cho các quy tắc bảo mật dựa vào request.auth. */
export async function ensureSignedIn() {
  if (!isFirebaseReady()) throw new Error('Firebase chưa sẵn sàng (không tải được SDK).');
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function signOutUser() {
  await signOut(auth);
}

async function ensureUserDoc(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      displayName: user.displayName || 'Người bạn của Ong',
      photoURL: user.photoURL || null,
      isAnonymous: user.isAnonymous,
      createdAt: serverTimestamp(),
      level: 1,
      exp: 0,
      wallet: { coin: 0, gem: 0, ticket: 0, energy: 100 },
      energyUpdatedAt: serverTimestamp(),
    });
  }
}

async function loadRoles(uid) {
  try {
    const snap = await getDoc(doc(db, 'roles', uid));
    if (!snap.exists()) return { isAdmin: false, perms: [] };
    const data = snap.data();
    return { isAdmin: true, perms: data.perms || [] };
  } catch {
    return { isAdmin: false, perms: [] };
  }
}

const readyListeners = [];
let authReady = false;

export function onAuthReady(fn) {
  if (authReady) fn(currentUser);
  else readyListeners.push(fn);
}

if (isFirebaseReady()) {
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      await ensureUserDoc(user);
      currentRoles = await loadRoles(user.uid);
    } else {
      currentRoles = null;
    }
    authReady = true;
    bus.emit('auth:changed', { user, roles: currentRoles });
    while (readyListeners.length) readyListeners.shift()(user);
  });
} else {
  // Firebase không tải được — vẫn "giải phóng" onAuthReady(...) với user =
  // null để phần giao diện không phụ thuộc dữ liệu (nav, router...) chạy
  // bình thường thay vì treo mãi chờ một sự kiện auth không bao giờ tới.
  authReady = true;
  queueMicrotask(() => {
    while (readyListeners.length) readyListeners.shift()(null);
  });
}

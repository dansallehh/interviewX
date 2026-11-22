export async function registerServiceWorker(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }
  // Skip registration in automated unit tests
  if (typeof window === 'undefined' || window.location.protocol === 'file:') {
    return false;
  }
  try {
    await navigator.serviceWorker.register('./sw.js', { scope: './' });
    return true;
  } catch {
    return false;
  }
}

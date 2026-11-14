// The browser's fullscreen functions for one element, with the older webkit names. No React, so node tests can run them.
export function nativeApi(el, doc = globalThis.document) {
  const req = el && (el.requestFullscreen || el.webkitRequestFullscreen);
  const exit = doc && (doc.exitFullscreen || doc.webkitExitFullscreen);
  const enabled = doc ? (doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled ?? !!req) : false;
  return {
    supported: !!(req && exit && enabled),
    request: () => req.call(el),
    exit: () => exit.call(doc),
    current: () => (doc ? doc.fullscreenElement || doc.webkitFullscreenElement || null : null),
  };
}

// Asks for browser fullscreen. Resolves 'native' when the element really is fullscreen, otherwise 'viewport'
// (not supported, refused or failed): the caller then keeps the window-filling layer. Never throws.
export async function enterFullscreen(el, doc = globalThis.document) {
  const api = nativeApi(el, doc);
  if (!api.supported) return 'viewport';
  try {
    const r = api.request();
    if (r && typeof r.then === 'function') await r;
    return api.current() === el ? 'native' : 'viewport';
  } catch {
    return 'viewport';
  }
}

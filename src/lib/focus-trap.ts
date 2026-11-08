const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps Tab and Shift+Tab inside an open drawer (the cart and the phone menu),
 * so keyboard users don't wander into the page behind it. Call from a keydown handler.
 */
export function trapTab(e: KeyboardEvent, container: HTMLElement | null) {
  if (e.key !== 'Tab' || !container) return;
  const items = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  const outside = !container.contains(active);
  if (e.shiftKey && (active === first || outside)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (active === last || outside)) {
    e.preventDefault();
    first.focus();
  }
}

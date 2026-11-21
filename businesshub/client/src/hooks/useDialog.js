import { useEffect, useRef } from 'react';

// Shared behaviour for modal dialogs and the mobile menu drawer:
//  - Escape closes (only the top-most dialog reacts when several are open)
//  - Tab / Shift+Tab stay inside the dialog
//  - focus moves in when it opens and returns to what opened it when it closes
//  - the page behind does not scroll
// Put the returned ref on the element that has role="dialog" and tabIndex={-1}.
// Mark one control with data-autofocus to have it focused first (for example
// "Cancel" in a destructive confirmation); otherwise the dialog itself is.

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

const stack = [];
let lockCount = 0;
let savedOverflow = '';

export default function useDialog(open, onClose) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const token = {};
    stack.push(token);
    const previous = document.activeElement;

    if (lockCount === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount += 1;

    const node = ref.current;
    if (node) {
      const preferred = node.querySelector('[data-autofocus]');
      (preferred || node).focus({ preventScroll: true });
    }

    const onKey = (e) => {
      if (stack[stack.length - 1] !== token) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = ref.current;
      if (!root) return;
      const items = Array.from(root.querySelectorAll(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
      );
      if (items.length === 0) {
        e.preventDefault();
        root.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === root || !root.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !root.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      const i = stack.indexOf(token);
      if (i !== -1) stack.splice(i, 1);
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) document.body.style.overflow = savedOverflow;
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) {
        previous.focus({ preventScroll: true });
      }
    };
  }, [open]);

  return ref;
}

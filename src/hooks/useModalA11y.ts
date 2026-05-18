'use client';

import { useEffect, useId, useRef } from 'react';

interface UseModalA11yOptions {
  /** Whether the modal is currently open. */
  isOpen: boolean;
  /** Called when the user presses Escape. */
  onClose: () => void;
  /**
   * If false, Escape won't close the modal (e.g. while a destructive action
   * is in-flight). Defaults to true.
   */
  closeOnEscape?: boolean;
  /**
   * If false, we won't lock body scroll. Defaults to true. Drop-in popovers
   * (autocomplete, multi-select) typically don't need this.
   */
  lockScroll?: boolean;
}

/**
 * Shared a11y plumbing for any dialog-like surface (modal, sheet, drawer).
 *
 * Responsibilities:
 *  - Lock body scroll while open so the page underneath can't move.
 *  - Listen for Escape and close.
 *  - Remember the element that had focus before opening, and restore focus
 *    to it on close (so keyboard users don't get dumped back at the top).
 *  - Move focus into the dialog on open (first focusable, falling back to
 *    the container itself).
 *  - Provide stable ids for `aria-labelledby` / `aria-describedby` so callers
 *    can wire them up without inventing their own.
 *
 * Returns refs to spread on the dialog container (and a "title" id helper).
 *
 * Usage:
 *   const { dialogRef, titleId } = useModalA11y({ isOpen, onClose });
 *   <div role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialogRef}>
 *     <h2 id={titleId}>...</h2>
 *   </div>
 */
export function useModalA11y({
  isOpen,
  onClose,
  closeOnEscape = true,
  lockScroll = true,
}: UseModalA11yOptions) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  // Escape to close.
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [isOpen, closeOnEscape, onClose]);

  // Body scroll lock. We restore the previous `overflow` value on close so we
  // don't fight with whoever set it (e.g. another stacked modal).
  useEffect(() => {
    if (!isOpen || !lockScroll) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const previousPaddingRight = root.style.paddingRight;
    // Preserve layout: account for the scrollbar that disappears when we lock
    // overflow, so the page doesn't shift right when the modal opens.
    const scrollbarWidth = window.innerWidth - root.clientWidth;
    root.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      root.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      root.style.overflow = previousOverflow;
      root.style.paddingRight = previousPaddingRight;
    };
  }, [isOpen, lockScroll]);

  // Move focus into the dialog on open, and restore it on close.
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocusedRef.current = (document.activeElement as HTMLElement) || null;

    // Wait one frame so framer-motion / portal mounting can settle and the
    // first focusable child actually exists.
    const id = window.requestAnimationFrame(() => {
      const node = dialogRef.current;
      if (!node) return;
      const focusable = node.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      (focusable || node).focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(id);
      // Restore focus to the trigger element so keyboard users don't lose
      // their place. We guard with `isConnected` in case the trigger has
      // been unmounted (e.g. moving from one record to the next).
      const prev = previouslyFocusedRef.current;
      if (prev && prev.isConnected && typeof prev.focus === 'function') {
        prev.focus({ preventScroll: true });
      }
    };
  }, [isOpen]);

  // Keep focus inside the dialog (cheap focus trap — covers >95% of cases).
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const node = dialogRef.current;
      if (!node) return;
      const focusables = Array.from(
        node.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('inert') && el.offsetParent !== null);
      if (focusables.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !node.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [isOpen]);

  return { dialogRef, titleId, descriptionId };
}

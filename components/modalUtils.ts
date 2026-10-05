import { useEffect } from 'react';

interface UseModalEffectsOptions {
  onClose: () => void;
  containerRef: React.RefObject<HTMLElement | null>;
  backdropRef?: React.RefObject<HTMLElement | null>;
  isActive?: boolean;
}

export function useModalEffects({
  onClose,
  containerRef,
  backdropRef,
  isActive = true,
}: UseModalEffectsOptions) {
  // 1. Focus restoration to the active element that opened the modal
  useEffect(() => {
    if (!isActive) return;
    const previousActiveElement = document.activeElement as HTMLElement | null;
    return () => {
      if (previousActiveElement) {
        // Wait a tick for React DOM updates to resolve
        setTimeout(() => {
          previousActiveElement.focus();
        }, 30);
      }
    };
  }, [isActive]);

  // 2. ESC Key support
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, isActive]);

  // 3. Focus Trap inside the modal container
  useEffect(() => {
    if (!isActive) return;
    const container = containerRef.current;
    if (!container) return;

    const getFocusableElements = (): HTMLElement[] => {
      const elements = Array.from(
        container.querySelectorAll(
          'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable]'
        )
      ) as HTMLElement[];
      
      // Filter out elements that are hidden or part of SVG inside etc.
      return elements.filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0 && el.offsetHeight > 0;
      });
    };

    // Auto-focus the first element (or the close button, or input) inside the modal or the container itself
    const focusable = getFocusableElements();
    if (focusable.length > 0) {
      // If we are editing, we can let user start on their form input, but if there's a specific initial focus, we use it.
      // Otherwise, focus the first focusable element.
      focusable[0].focus();
    } else {
      container.focus();
    }

    const handleKeyTabTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyTabTrap);
    return () => {
      container.removeEventListener('keydown', handleKeyTabTrap);
    };
  }, [containerRef, isActive]);

  // 4. Outside close listener (as a fallback or direct binder)
  useEffect(() => {
    if (!isActive) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    // We register on document with capture/bubble check to avoid immediate fire during click events
    const timer = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [onClose, containerRef, isActive]);
}

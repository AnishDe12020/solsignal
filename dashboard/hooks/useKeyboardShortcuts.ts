'use client';

import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsOptions {
  onNext: () => void;
  onPrevious: () => void;
  onFocusSearch: () => void;
}

export function useKeyboardShortcuts({ onNext, onPrevious, onFocusSearch }: KeyboardShortcutsOptions) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore when typing in inputs/textareas/selects
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if ((e.target as HTMLElement).isContentEditable) return;

    switch (e.key) {
      case 'n':
        e.preventDefault();
        onNext();
        break;
      case 'p':
        e.preventDefault();
        onPrevious();
        break;
      case '/':
        e.preventDefault();
        onFocusSearch();
        break;
    }
  }, [onNext, onPrevious, onFocusSearch]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

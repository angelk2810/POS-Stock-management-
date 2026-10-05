
import React, { useEffect } from 'react';

interface Props {
  children: React.ReactNode;
  onHotkey: (key: string) => void;
}

export const KeyboardProvider: React.FC<Props> = ({ children, onHotkey }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default for system keys we override
      if (['F2', 'F10', 'F1'].includes(e.key)) {
        e.preventDefault();
        onHotkey(e.key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onHotkey]);

  return <>{children}</>;
};

import { useState, useEffect, useCallback } from 'react';

type Mode = 'NORMAL' | 'COMMAND';

interface VitoNavigationOptions {
  initialMode?: Mode;
  onModeChange?: (mode: Mode) => void;
  onCommand?: (command: string) => void;
}

export const useVitoNavigation = (options: VitoNavigationOptions = {}) => {
  const { initialMode = 'NORMAL', onModeChange, onCommand } = options;
  
  const [mode, setMode] = useState<Mode>(initialMode);
  const [commandBuffer, setCommandBuffer] = useState<string>('');
  const [position, setPosition] = useState({ row: 0, col: 0 });
  const [selected, setSelected] = useState<any[]>([]);

  // Mode switching
  const enterNormalMode = useCallback(() => {
    setMode('NORMAL');
    setCommandBuffer('');
    onModeChange?.('NORMAL');
  }, [onModeChange]);

  const enterCommandMode = useCallback(() => {
    setMode('COMMAND');
    setCommandBuffer(':');
    onModeChange?.('COMMAND');
  }, [onModeChange]);

  // Navigation functions
  const moveUp = useCallback(() => {
    setPosition(prev => ({ ...prev, row: Math.max(0, prev.row - 1) }));
  }, []);

  const moveDown = useCallback(() => {
    setPosition(prev => ({ ...prev, row: prev.row + 1 }));
  }, []);

  const moveLeft = useCallback(() => {
    setPosition(prev => ({ ...prev, col: Math.max(0, prev.col - 1) }));
  }, []);

  const moveRight = useCallback(() => {
    setPosition(prev => ({ ...prev, col: prev.col + 1 }));
  }, []);

  // Selection toggle
  const toggleSelection = useCallback((item: any) => {
    setSelected(prev => {
      const index = prev.indexOf(item);
      if (index === -1) {
        return [...prev, item];
      } else {
        return prev.filter((_, i) => i !== index);
      }
    });
  }, []);

  // Command execution
  const executeCommand = useCallback(() => {
    if (commandBuffer.startsWith(':')) {
      const command = commandBuffer.substring(1);
      onCommand?.(command);
      setCommandBuffer('');
      enterNormalMode();
    }
  }, [commandBuffer, onCommand, enterNormalMode]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is currently typing in an input field
      const activeElement = document.activeElement;
      const isTypingInInput = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true'
      );

      // Don't intercept keys when user is typing in input fields
      if (isTypingInInput) {
        return;
      }

      // Prevent default for navigation keys to avoid scrolling
      if (['j', 'k', 'h', 'l', 'Escape', ':'].includes(e.key)) {
        e.preventDefault();
      }

      if (mode === 'NORMAL') {
        switch(e.key) {
          case 'j': moveDown(); break;
          case 'k': moveUp(); break;
          case 'h': moveLeft(); break;
          case 'l': moveRight(); break;
          case ':': enterCommandMode(); break;
        }
      } else if (mode === 'COMMAND') {
        if (e.key === 'Escape') {
          enterNormalMode();
        } else if (e.key === 'Enter') {
          executeCommand();
        } else if (e.key === 'Backspace') {
          setCommandBuffer(prev => prev.length > 1 ? prev.slice(0, -1) : ':');
        } else if (!e.ctrlKey && !e.altKey && !e.metaKey) {
          setCommandBuffer(prev => prev + e.key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    mode, 
    moveDown, 
    moveUp, 
    moveLeft, 
    moveRight, 
    enterCommandMode, 
    enterNormalMode,
    executeCommand
  ]);

  return {
    mode,
    position,
    selected,
    commandBuffer,
    enterNormalMode,
    enterCommandMode,
    moveUp,
    moveDown,
    moveLeft,
    moveRight,
    toggleSelection
  };
};

export default useVitoNavigation; 
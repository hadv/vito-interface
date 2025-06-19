import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import useVitoNavigation from '@hooks/useVitoNavigation';

interface VitoListProps<T> {
  items: T[];
  renderItem: (item: T, isSelected: boolean, isFocused: boolean) => React.ReactNode;
  onItemSelect?: (item: T) => void;
  onItemEnter?: (item: T) => void;
}

interface ListItemProps {
  selected: boolean;
  focused: boolean;
}

const List = styled.ul`
  list-style-type: none;
  padding: 0;
  margin: 0;
  width: 100%;
`;

const ListItem = styled.li<ListItemProps>`
  padding: 0.5rem 1rem;
  border-bottom: 1px solid #333;
  background-color: ${props => 
    props.focused && props.selected ? '#264f78' : 
    props.focused ? '#37373d' : 
    props.selected ? '#0e639c' : 'transparent'
  };
  cursor: pointer;
  
  &:hover {
    background-color: ${props => 
      props.focused ? '#37373d' : 
      props.selected ? '#0e639c' : '#2a2d2e'
    };
  }
`;

function VitoList<T>({ 
  items, 
  renderItem, 
  onItemSelect, 
  onItemEnter 
}: VitoListProps<T>): React.ReactElement {
  const { 
    mode, 
    position, 
    selected, 
    toggleSelection,
    enterNormalMode 
  } = useVitoNavigation();
  
  const [focusedIndex, setFocusedIndex] = useState(0);
  
  // Update focused index based on position
  useEffect(() => {
    setFocusedIndex(Math.min(position.row, items.length - 1));
  }, [position, items.length]);
  
  // Handle item selection
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

      if (mode === 'NORMAL' && focusedIndex >= 0 && focusedIndex < items.length) {
        if (e.key === 'Enter') {
          // Enter key to execute action on item
          onItemEnter?.(items[focusedIndex]);
        } else if (e.key === ' ' || e.key === 'Space') {
          // Space to select/deselect
          const item = items[focusedIndex];
          toggleSelection(item);
          onItemSelect?.(item);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, focusedIndex, items, toggleSelection, onItemSelect, onItemEnter]);

  return (
    <List>
      {items.map((item, index) => {
        const isSelected = selected.includes(item);
        const isFocused = index === focusedIndex;
        
        return (
          <ListItem 
            key={index} 
            selected={isSelected} 
            focused={isFocused}
            onClick={() => {
              // Set focused item
              setFocusedIndex(index);
              enterNormalMode();
            }}
            onDoubleClick={() => onItemEnter?.(item)}
          >
            {renderItem(item, isSelected, isFocused)}
          </ListItem>
        );
      })}
    </List>
  );
}

export default VitoList; 
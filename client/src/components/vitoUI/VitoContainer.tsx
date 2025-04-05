import React, { ReactNode } from 'react';
import styled from 'styled-components';
import useVitoNavigation from '@hooks/useVitoNavigation';

interface VitoContainerProps {
  children: ReactNode;
  onCommand?: (command: string) => void;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Courier New', monospace;
  overflow: hidden; /* Prevent scrolling of the container */
  position: relative; /* For absolute positioning of status bar */
`;

const ContentArea = styled.div`
  flex: 1;
  overflow: auto;
  padding: 0 1rem 3rem 0;
  padding-left: 0;
  padding-bottom: 3rem; /* Add padding to account for the status bar height */
  height: calc(100vh - 2.5rem); /* Subtract the status bar height */
  box-sizing: border-box;
`;

const StatusBar = styled.div`
  display: flex;
  padding: 0.5rem 1rem;
  background-color: #252526;
  border-top: 1px solid #333;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2.5rem;
  z-index: 100;
  box-sizing: border-box;
`;

const ModeIndicator = styled.div`
  margin-right: 1rem;
  font-weight: bold;
`;

const CommandLine = styled.div`
  flex: 1;
  font-family: 'Courier New', monospace;
`;

const VitoContainer: React.FC<VitoContainerProps> = ({ children, onCommand }) => {
  const { mode, commandBuffer } = useVitoNavigation({
    onCommand,
  });

  return (
    <Container>
      <ContentArea>{children}</ContentArea>
      <StatusBar className="status-bar">
        <ModeIndicator>
          {mode === 'NORMAL' && 'NORMAL'}
          {mode === 'COMMAND' && 'COMMAND'}
        </ModeIndicator>
        <CommandLine>{commandBuffer}</CommandLine>
      </StatusBar>
    </Container>
  );
};

export default VitoContainer; 
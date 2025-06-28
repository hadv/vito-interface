import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
  containerId?: string;
}

const Portal: React.FC<PortalProps> = ({ children, containerId = 'modal-root' }) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Try to find existing container
    let containerElement = document.getElementById(containerId);
    
    // Create container if it doesn't exist
    if (!containerElement) {
      containerElement = document.createElement('div');
      containerElement.id = containerId;
      containerElement.style.position = 'relative';
      containerElement.style.zIndex = '10002'; // Higher than everything else
      document.body.appendChild(containerElement);
    }

    setContainer(containerElement);

    // Cleanup function to remove container if it's empty
    return () => {
      if (containerElement && containerElement.children.length === 0) {
        document.body.removeChild(containerElement);
      }
    };
  }, [containerId]);

  if (!container) {
    return null;
  }

  return createPortal(children, container);
};

export default Portal;

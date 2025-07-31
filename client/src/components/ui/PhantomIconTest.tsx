import React from 'react';
import PhantomIcon from './PhantomIcon';

/**
 * Test component to verify Phantom icon display using base64 image
 * This component can be temporarily added to any page to test the icon
 * Now uses official Phantom base64 image - no more SVG gradient conflicts!
 */
const PhantomIconTest: React.FC = () => {
  return (
    <div style={{ 
      padding: '20px', 
      background: '#0f172a', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '20px',
      alignItems: 'center'
    }}>
      <h3 style={{ color: 'white', margin: 0 }}>Phantom Icon Test (Base64 Image)</h3>
      
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ textAlign: 'center' }}>
          <PhantomIcon size={16} />
          <p style={{ color: 'white', fontSize: '12px', margin: '5px 0 0 0' }}>16px</p>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <PhantomIcon size={24} />
          <p style={{ color: 'white', fontSize: '12px', margin: '5px 0 0 0' }}>24px</p>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <PhantomIcon size={32} />
          <p style={{ color: 'white', fontSize: '12px', margin: '5px 0 0 0' }}>32px</p>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <PhantomIcon size={48} />
          <p style={{ color: 'white', fontSize: '12px', margin: '5px 0 0 0' }}>48px</p>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <PhantomIcon size={64} />
          <p style={{ color: 'white', fontSize: '12px', margin: '5px 0 0 0' }}>64px</p>
        </div>
      </div>
      
      <div style={{ 
        background: 'rgba(255,255,255,0.1)', 
        padding: '10px', 
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <PhantomIcon size={32} />
        <p style={{ color: 'white', fontSize: '14px', margin: '10px 0 0 0' }}>
          Standard 32px icon (base64 image - no SVG conflicts!)
        </p>
      </div>
    </div>
  );
};

export default PhantomIconTest;

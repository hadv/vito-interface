// Modern Design System for Safe Wallet Interface
export const theme = {
  // Color Palette - Professional & Secure
  colors: {
    // Primary Colors - Professional Blue Theme
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Main Blue
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },

    // Secondary Colors - Light Blue
    secondary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
    
    // Neutral Colors - Modern Grays
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0a0a0a',
    },
    
    // DARK THEME BACKGROUNDS
    background: {
      primary: '#0f172a',     // Dark blue-gray
      secondary: '#1e293b',   // Lighter dark
      tertiary: '#334155',    // Card backgrounds
      card: '#1e293b',        // Dark cards
      elevated: '#334155',    // Elevated elements
      glass: '#1e293b',       // Dark glass
      overlay: 'rgba(0, 0, 0, 0.8)', // Dark overlay
    },
    
    // DARK THEME HIGH CONTRAST
    text: {
      primary: '#ffffff',     // Pure white for maximum contrast
      secondary: '#e5e7eb',   // Very light gray
      tertiary: '#d1d5db',    // Light gray
      muted: '#9ca3af',       // Medium gray
      disabled: '#6b7280',    // Disabled gray
      inverse: '#000000',     // Black for light backgrounds
      accent: '#60a5fa',      // Bright blue
      success: '#38bdf8',     // Bright light blue
      warning: '#fbbf24',     // Bright yellow
      danger: '#f87171',      // Bright red
    },
    
    // Status Colors
    status: {
      success: '#0ea5e9',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    
    // Network Colors
    network: {
      ethereum: '#627EEA',
      arbitrum: '#96BEDC',
      optimism: '#FF0420',
      polygon: '#8247E5',
      base: '#0052FF',
      sepolia: '#CFB5F0',
      goerli: '#F6C343',
    },
    
    // Border Colors
    border: {
      primary: '#404040',
      secondary: '#525252',
      tertiary: '#262626',
      focus: '#3b82f6', // Blue focus color
    },
  },
  
  // Typography - Enhanced for better readability
  typography: {
    fontFamily: {
      sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', 'monospace'],
    },
    fontSize: {
      xs: '0.8125rem',  // 13px - elegant small text
      sm: '0.9375rem',  // 15px - refined secondary text
      base: '1rem',     // 16px - perfect base size
      lg: '1.125rem',   // 18px - prominent text
      xl: '1.25rem',    // 20px - important headings
      '2xl': '1.5rem',  // 24px - section headings
      '3xl': '1.875rem', // 30px - page headings
      '4xl': '2.25rem', // 36px - hero headings
      '5xl': '3rem',    // 48px - display headings
    },
    fontWeight: {
      light: '300',     // Light text
      normal: '400',    // Normal text
      medium: '500',    // Medium weight
      semibold: '600',  // Semibold
      bold: '700',      // Bold
      extrabold: '800', // Extra bold
      black: '900',     // Black
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  
  // Spacing
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
  },
  
  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    full: '9999px',
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    glow: '0 0 20px rgb(14 165 233 / 0.3)',
  },
  
  // Transitions
  transitions: {
    fast: '150ms ease-in-out',
    normal: '250ms ease-in-out',
    slow: '350ms ease-in-out',
  },

  // Flat Design Utilities
  flat: {
    // Subtle elevation without gradients
    elevation: {
      none: 'box-shadow: none;',
      low: 'box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);',
      medium: 'box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);',
      high: 'box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);',
    },
    // Flat color overlays
    overlay: {
      light: 'rgba(255, 255, 255, 0.05)',
      medium: 'rgba(255, 255, 255, 0.1)',
      dark: 'rgba(0, 0, 0, 0.1)',
    }
  },

  // Enhanced Typography Utilities for better readability
  textStyles: {
    // Headings with improved readability
    heading: {
      h1: `font-size: 2.25rem; font-weight: 700; line-height: 1.25; color: #ffffff;`,
      h2: `font-size: 1.875rem; font-weight: 700; line-height: 1.25; color: #ffffff;`,
      h3: `font-size: 1.5rem; font-weight: 600; line-height: 1.3; color: #ffffff;`,
      h4: `font-size: 1.25rem; font-weight: 600; line-height: 1.3; color: #e5e5e5;`,
      h5: `font-size: 1.125rem; font-weight: 600; line-height: 1.4; color: #e5e5e5;`,
      h6: `font-size: 1rem; font-weight: 600; line-height: 1.4; color: #e5e5e5;`,
    },
    // Body text with enhanced readability (optimized for Roboto)
    body: {
      large: `font-size: 1.125rem; font-weight: 400; line-height: 1.6; color: #e5e5e5;`,
      base: `font-size: 1rem; font-weight: 400; line-height: 1.5; color: #e5e5e5;`,
      small: `font-size: 0.9375rem; font-weight: 400; line-height: 1.5; color: #c4c4c4;`,
    },
    // UI text with better contrast (optimized for Roboto)
    ui: {
      label: `font-size: 0.9375rem; font-weight: 500; line-height: 1.4; color: #e5e5e5;`,
      button: `font-size: 1rem; font-weight: 500; line-height: 1.2; color: inherit;`,
      caption: `font-size: 0.8125rem; font-weight: 400; line-height: 1.4; color: #c4c4c4;`,
      helper: `font-size: 0.8125rem; font-weight: 400; line-height: 1.3; color: #9ca3af;`,
    }
  },
  
  // Z-Index
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
  },
  
  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
};

export type Theme = typeof theme;

// Utility functions for theme usage
export const getNetworkColor = (network: string): string => {
  const networkKey = network.toLowerCase() as keyof typeof theme.colors.network;
  return theme.colors.network[networkKey] || theme.colors.neutral[500];
};

export const rgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

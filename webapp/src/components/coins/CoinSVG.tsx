import React from 'react';

interface CoinSVGProps {
  coinType: string;
  side: 'heads' | 'tails';
  size?: number;
  className?: string;
}

export default function CoinSVG({ coinType, side, size = 64, className = '' }: CoinSVGProps) {
  const getHeadsSVG = (coinType: string) => {
    switch (coinType) {
      case 'us-quarter':
      case 'us-penny':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <circle cx="12" cy="12" r="9" stroke="#B59C00" strokeWidth="2" fill="#FFD700"/>
            <path d="M14.5 9.08333L14.3563 8.96356C13.9968 8.66403 13.5438 8.5 13.0759 8.5H10.75C9.7835 8.5 9 9.2835 9 10.25V10.25C9 11.2165 9.7835 12 10.75 12H13.25C14.2165 12 15 12.7835 15 13.75V13.75C15 14.7165 14.2165 15.5 13.25 15.5H10.412C9.8913 15.5 9.39114 15.2969 9.01782 14.934L9 14.9167" stroke="#B59C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 8L12 7" stroke="#B59C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 17V16" stroke="#B59C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'euro':
        return (
          <svg width={size} height={size} viewBox="0 0 512 512" className={className}>
            <circle cx="256" cy="256" r="230" stroke="#B59C00" strokeWidth="20" fill="#FFD700"/>
            <polygon fill="#B59C00" points="278.547,220.453 268.063,224.891 256.813,240.422 317.109,261.188 303.438,280.094 301.188,283.203 240.891,262.422 216.75,295.766 179.281,282.828 203.438,249.5 143.156,228.734 145.406,225.641 159.094,206.813 219.375,227.531 230.625,212.016 229.406,203.547 175.063,184.828 188.703,166.047 226.094,178.922 219.813,132.859 251.469,143.734 259.719,204.063 334.703,172.344 366.406,183.234 309.188,207.5 346.594,220.359 333,239.188"/>
          </svg>
        );
      case 'bitcoin':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <circle cx="12" cy="12" r="10" stroke="#B59C00" strokeWidth="2" fill="#FFD700"/>
            <path d="M9 7V17M15 7V17M11 7H14.5C15.328 7 16 7.672 16 8.5V8.5C16 9.328 15.328 10 14.5 10H11M11 10H14C14.828 10 15.5 10.672 15.5 11.5V11.5C15.5 12.328 14.828 13 14 13H11M11 10V13" stroke="#B59C00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'uk-pound':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <circle cx="12" cy="12" r="10" stroke="#B59C00" strokeWidth="2" fill="#FFD700"/>
            <path d="M10 19H17M10 19C10 17.8954 10.8954 17 12 17H14M10 19V11C10 9.34315 11.3431 8 13 8V8C14.6569 8 16 9.34315 16 11M8 13H16" stroke="#B59C00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'canadian':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <circle cx="12" cy="12" r="10" stroke="#B59C00" strokeWidth="2" fill="#FFD700"/>
            <path d="M14.5 9.08333L14.3563 8.96356C13.9968 8.66403 13.5438 8.5 13.0759 8.5H10.75C9.7835 8.5 9 9.2835 9 10.25V10.25C9 11.2165 9.7835 12 10.75 12H13.25C14.2165 12 15 12.7835 15 13.75V13.75C15 14.7165 14.2165 15.5 13.25 15.5H10.412C9.8913 15.5 9.39114 15.2969 9.01782 14.934L9 14.9167" stroke="#B59C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 8L12 7" stroke="#B59C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 17V16" stroke="#B59C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 5L12.5 6L12 7L11.5 6Z" fill="#B59C00"/> {/* Maple leaf symbol */}
          </svg>
        );
      default:
        return null;
    }
  };

  const getTailsSVG = (coinType: string) => {
    switch (coinType) {
      case 'us-quarter':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <circle cx="12" cy="12" r="9" stroke="#B59C00" strokeWidth="2" fill="#FFD700"/>
            <path d="M12 6L13.5 9H17L14.5 11L15.5 14L12 12L8.5 14L9.5 11L7 9H10.5L12 6Z" fill="#B59C00"/>
            <text x="12" y="17" textAnchor="middle" fontSize="3" fill="#B59C00" fontWeight="bold">EAGLE</text>
          </svg>
        );
      case 'us-penny':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <circle cx="12" cy="12" r="9" stroke="#8B4513" strokeWidth="2" fill="#CD853F"/>
            <rect x="8" y="8" width="8" height="8" rx="1" fill="#8B4513"/>
            <text x="12" y="13" textAnchor="middle" fontSize="2.5" fill="#CD853F" fontWeight="bold">ONE</text>
          </svg>
        );
      case 'euro':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <circle cx="12" cy="12" r="9" stroke="#B59C00" strokeWidth="2" fill="#FFD700"/>
            <text x="12" y="8" textAnchor="middle" fontSize="2" fill="#B59C00" fontWeight="bold">EUROPA</text>
            <circle cx="12" cy="12" r="3" stroke="#B59C00" strokeWidth="1" fill="none"/>
            <text x="12" y="17" textAnchor="middle" fontSize="1.5" fill="#B59C00">UNITY</text>
          </svg>
        );
      case 'bitcoin':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <circle cx="12" cy="12" r="10" stroke="#B59C00" strokeWidth="2" fill="#FFD700"/>
            <circle cx="12" cy="12" r="6" stroke="#B59C00" strokeWidth="1" fill="none"/>
            <path d="M8 8L16 16M16 8L8 16" stroke="#B59C00" strokeWidth="1"/>
            <text x="12" y="17.5" textAnchor="middle" fontSize="1.5" fill="#B59C00">DIGITAL</text>
          </svg>
        );
      case 'uk-pound':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <circle cx="12" cy="12" r="9" stroke="#B59C00" strokeWidth="2" fill="#FFD700"/>
            <path d="M12 6L13.5 9H17L14.5 11L15.5 14L12 12L8.5 14L9.5 11L7 9H10.5L12 6Z" fill="#B59C00"/>
            <text x="12" y="17" textAnchor="middle" fontSize="2" fill="#B59C00" fontWeight="bold">CROWN</text>
          </svg>
        );
      case 'canadian':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <circle cx="12" cy="12" r="9" stroke="#B59C00" strokeWidth="2" fill="#FFD700"/>
            <path d="M12 7L11 9L9 8L10 10L8 11L10 12L9 14L11 13L12 15L13 13L15 14L14 12L16 11L14 10L15 8L13 9L12 7Z" fill="#B59C00"/>
            <text x="12" y="17.5" textAnchor="middle" fontSize="1.5" fill="#B59C00">CANADA</text>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      {side === 'heads' ? getHeadsSVG(coinType) : getTailsSVG(coinType)}
    </div>
  );
}
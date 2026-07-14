import React from 'react';

const BotreeLogo = ({ size = 'md', variant = 'full' }) => {
  const sizes = {
    sm: { logo: 32, text: 80 },
    md: { logo: 48, text: 120 },
    lg: { logo: 64, text: 160 },
    xl: { logo: 80, text: 200 }
  };

  const currentSize = sizes[size];

  if (variant === 'icon') {
    return (
      <svg width={currentSize.logo} height={currentSize.logo} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 10 L80 30 L65 45 L50 35 L35 45 L20 30 Z" fill="url(#gradient-pink)" />
        <path d="M35 55 L50 65 L65 55 L80 70 L50 90 L20 70 Z" fill="url(#gradient-purple)" />
        <defs>
          <linearGradient id="gradient-pink" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F72585" />
            <stop offset="100%" stopColor="#B5179E" />
          </linearGradient>
          <linearGradient id="gradient-purple" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#B5179E" />
            <stop offset="100%" stopColor="#7209B7" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <svg width={currentSize.logo} height={currentSize.logo} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 10 L80 30 L65 45 L50 35 L35 45 L20 30 Z" fill="url(#gradient-pink)" />
        <path d="M35 55 L50 65 L65 55 L80 70 L50 90 L20 70 Z" fill="url(#gradient-purple)" />
        <defs>
          <linearGradient id="gradient-pink" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F72585" />
            <stop offset="100%" stopColor="#B5179E" />
          </linearGradient>
          <linearGradient id="gradient-purple" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#B5179E" />
            <stop offset="100%" stopColor="#7209B7" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex flex-col">
        <span className="font-black tracking-tight" style={{ fontFamily: 'Playfair Display, serif', fontSize: currentSize.text * 0.35, lineHeight: '1', fontWeight: 800 }}>BOTREE</span>
        <span className="font-bold tracking-[0.3em]" style={{ fontFamily: 'Manrope, sans-serif', fontSize: currentSize.text * 0.15, lineHeight: '1.2', fontWeight: 700 }}>SOFTWARE</span>
      </div>
    </div>
  );
};

export default BotreeLogo;
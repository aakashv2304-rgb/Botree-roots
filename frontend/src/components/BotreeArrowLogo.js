import React from 'react';

const BotreeArrowLogo = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 80
  };

  const currentSize = sizes[size];

  return (
    <svg 
      width={currentSize} 
      height={currentSize} 
      viewBox="0 0 100 120" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Pink top arrow/chevron */}
      <path 
        d="M 50 5 L 95 40 L 70 40 L 50 25 L 30 40 L 5 40 Z" 
        fill="#F72585"
      />
      {/* Purple bottom arrow/chevron */}
      <path 
        d="M 30 60 L 50 75 L 70 60 L 95 80 L 50 115 L 5 80 Z" 
        fill="#7209B7"
      />
    </svg>
  );
};

export default BotreeArrowLogo;

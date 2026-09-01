import React from 'react';

// size: pixel diameter. label: optional text shown under the spinner.
// fullScreen: centers itself in a full-viewport container with the page bg.
const LoadingSpinner = ({ size = 40, label, fullScreen = false }) => {
  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div className="brand-spinner" style={{ width: size, height: size }}>
        <div className="ring ring-outer"></div>
        <div className="ring ring-inner"></div>
      </div>
      {label && (
        <p className="brand-loading-label text-xs font-semibold text-[#5B4B7A] tracking-wide">{label}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F7F4FC]">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;

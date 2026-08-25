import React, { useEffect } from 'react';
import { WarningCircle, X } from '@phosphor-icons/react';

const ValidationModal = ({ message, onClose }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!message) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      style={{ animation: 'fadeIn 0.2s ease-out' }}
      onClick={onClose}
      data-testid="validation-modal-overlay"
    >
      <div
        className="bg-[#1F2937] border border-[#374151] rounded-2xl shadow-2xl px-8 py-7 max-w-sm w-[90%] text-center relative"
        style={{ animation: 'bounceIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
        onClick={(e) => e.stopPropagation()}
        data-testid="validation-modal"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div
          className="mx-auto mb-4 flex items-center justify-center w-14 h-14 rounded-full bg-red-500/15"
        >
          <WarningCircle size={30} weight="fill" className="text-red-400" />
        </div>

        <p className="font-heading font-bold text-lg text-white mb-1">
          {message}
        </p>
        <p className="text-sm text-gray-400 mb-5">
          Please fill this in before continuing.
        </p>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg text-white font-semibold text-sm transition-transform hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #9B30FF 0%, #E64AD1 100%)' }}
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export default ValidationModal;

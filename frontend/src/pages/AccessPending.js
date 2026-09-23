import React from 'react';
import { ClockCounterClockwise } from '@phosphor-icons/react';

const BOTREE_LOGO = "https://customer-assets-7cd3h4nn.emergentagent.net/job_proposal-tracker-app/artifacts/12kvgckj_Botree%20Logo-white-bg.webp";

const AccessPending = () => {
  return (
    <div className="min-h-screen bg-[#F7F4FC] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
        <div className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#1E1533] to-[#2D1F47] px-8 py-10">
          <div
            className="absolute w-56 h-56 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, #9B30FF 0%, transparent 70%)', top: '-10%', left: '-10%' }}
          ></div>
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="animate-float bg-white rounded-xl shadow-2xl px-6 py-4 flex items-center justify-center mb-4">
              <img src={BOTREE_LOGO} alt="Botree Software" className="h-10 w-auto" />
            </div>
          </div>
        </div>

        <div className="px-8 py-10 text-center">
          <div
            className="mx-auto mb-5 flex items-center justify-center w-14 h-14 rounded-full"
            style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)' }}
          >
            <ClockCounterClockwise size={30} weight="fill" className="text-amber-600" />
          </div>

          <h2 className="text-xl font-bold text-[#1E1533] mb-2">Access Request Submitted</h2>
          <p className="text-sm text-[#7A6B9E] leading-relaxed">
            You signed in with Zoho, but you don't have a Botree Roots account yet.
            An Admin has been notified and will review your request shortly.
          </p>
          <p className="text-sm text-[#7A6B9E] leading-relaxed mt-3">
            You'll be able to sign in once an Admin approves your access and assigns you a role.
          </p>

          <a
            href="/"
            className="inline-block mt-6 text-sm font-semibold text-[#9B30FF] hover:underline"
          >
            Back to login
          </a>
        </div>
      </div>
    </div>
  );
};

export default AccessPending;

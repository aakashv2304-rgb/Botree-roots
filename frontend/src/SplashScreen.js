import React from 'react';

const BOTREE_LOGO = "https://customer-assets-7cd3h4nn.emergentagent.net/job_proposal-tracker-app/artifacts/12kvgckj_Botree%20Logo-white-bg.webp";

const SplashScreen = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8E4F8] via-[#F5E8F4] to-[#FDD7ED] flex items-center justify-center fixed inset-0 z-50">
      <div className="flex flex-col items-center gap-8">
        <div className="animate-float">
          <div
            className="bg-white rounded-3xl shadow-2xl p-8 flex items-center justify-center"
            style={{ animation: 'splashLogoIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
          >
            <img
              src={BOTREE_LOGO}
              alt="Botree Software"
              className="h-16 w-auto"
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1.5">
            <span className="splash-dot" style={{ animationDelay: '0s' }} />
            <span className="splash-dot" style={{ animationDelay: '0.15s' }} />
            <span className="splash-dot" style={{ animationDelay: '0.3s' }} />
          </div>
          <p
            className="text-sm font-semibold tracking-wide bg-gradient-to-r from-[#7518F2] to-[#E64AD1] bg-clip-text text-transparent"
            style={{ animation: 'fadeIn 0.6s ease-in 0.3s both' }}
          >
            Botree Roots
          </p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;

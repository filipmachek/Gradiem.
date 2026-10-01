import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, Smartphone, Check, X } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>(isIOS ? 'ios' : 'android');

  if (isInstalled) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#4FA98A]/10 border border-[#4FA98A]/30 rounded-xl text-xs text-[#2F6F5E] dark:text-[#4FA98A]">
        <div className="flex items-center gap-1.5 font-medium">
          <Check className="w-4 h-4 text-[#4FA98A]" />
          <span>App installed on your home screen</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-[#2F6F5E]/8 dark:bg-[#4FA98A]/10 border border-[#2F6F5E]/20 dark:border-[#4FA98A]/20">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm flex-shrink-0 border border-white/10 bg-[#122820]">
            <img src="/icon.svg?v=12" alt="GD" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#211F1A] dark:text-[#EDEAE1]">
              Add Gradiem to Home Screen
            </div>
            <div className="text-[11px] text-[#8C8672] dark:text-[#8D897C]">
              Instant access, offline capable
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {isInstallable && (
            <button
              onClick={install}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2F6F5E] hover:bg-[#245A4C] text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
          )}

          <button
            onClick={() => {
              setActiveTab(isIOS ? 'ios' : 'android');
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2F6F5E]/15 hover:bg-[#2F6F5E]/25 text-[#2F6F5E] dark:text-[#4FA98A] text-xs font-semibold transition active:scale-95 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>How to add</span>
          </button>
        </div>
      </div>

      {/* Install Guide Modal (Android + iOS) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#151917] p-5 shadow-2xl border border-[#E8E2D2] dark:border-[#242A27]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl overflow-hidden shadow-xs flex-shrink-0 border border-white/10 bg-[#122820]">
                  <img src="/icon.svg?v=12" alt="GD" className="w-full h-full object-cover" />
                </div>
                <h3 className="font-semibold text-sm text-[#211F1A] dark:text-[#EDEAE1]">
                  Add Gradiem to Home Screen
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#8C8672] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Platform Selector Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-xl mb-4">
              <button
                onClick={() => setActiveTab('android')}
                className={`py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'android'
                    ? 'bg-white dark:bg-[#202724] text-[#2F6F5E] dark:text-[#4FA98A] shadow-xs'
                    : 'text-[#8C8672] hover:text-[#211F1A] dark:hover:text-[#EDEAE1]'
                }`}
              >
                <span>🤖 Android</span>
              </button>
              <button
                onClick={() => setActiveTab('ios')}
                className={`py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'ios'
                    ? 'bg-white dark:bg-[#202724] text-[#2F6F5E] dark:text-[#4FA98A] shadow-xs'
                    : 'text-[#8C8672] hover:text-[#211F1A] dark:hover:text-[#EDEAE1]'
                }`}
              >
                <span>🍎 iPhone / iPad</span>
              </button>
            </div>

            {/* Android Instructions */}
            {activeTab === 'android' && (
              <div className="space-y-2.5 my-3 text-xs text-[#211F1A] dark:text-[#EDEAE1]">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FBF8F0] dark:bg-[#1B221E] border border-black/5 dark:border-white/5">
                  <div className="w-6 h-6 rounded-full bg-[#2F6F5E] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    1
                  </div>
                  <div>
                    In <strong>Google Chrome</strong> (or your browser), tap the <strong>three dots (⋮)</strong> menu in the top right corner.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FBF8F0] dark:bg-[#1B221E] border border-black/5 dark:border-white/5">
                  <div className="w-6 h-6 rounded-full bg-[#2F6F5E] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    2
                  </div>
                  <div>
                    Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FBF8F0] dark:bg-[#1B221E] border border-black/5 dark:border-white/5">
                  <div className="w-6 h-6 rounded-full bg-[#2F6F5E] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    3
                  </div>
                  <div>
                    Confirm by tapping <strong>Install</strong>. The Day. app will now appear alongside your other native apps!
                  </div>
                </div>
              </div>
            )}

            {/* iOS Instructions */}
            {activeTab === 'ios' && (
              <div className="space-y-2.5 my-3 text-xs text-[#211F1A] dark:text-[#EDEAE1]">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FBF8F0] dark:bg-[#1B221E] border border-black/5 dark:border-white/5">
                  <div className="w-6 h-6 rounded-full bg-[#2F6F5E] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    1
                  </div>
                  <div>
                    In <strong>Safari</strong>, tap the <strong>Share</strong> button (box with an upward arrow) in the bottom toolbar.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FBF8F0] dark:bg-[#1B221E] border border-black/5 dark:border-white/5">
                  <div className="w-6 h-6 rounded-full bg-[#2F6F5E] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    2
                  </div>
                  <div>
                    Scroll down and tap <strong>"Add to Home Screen"</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FBF8F0] dark:bg-[#1B221E] border border-black/5 dark:border-white/5">
                  <div className="w-6 h-6 rounded-full bg-[#2F6F5E] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    3
                  </div>
                  <div>
                    Tap <strong>Add</strong> in the top-right corner. The Day. icon will appear on your home screen.
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-3 py-2.5 rounded-xl bg-[#2F6F5E] hover:bg-[#245A4C] text-white font-medium text-xs shadow-sm transition cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

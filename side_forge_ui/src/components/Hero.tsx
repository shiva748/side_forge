import React, { useState } from 'react';
import { ArrowRight, Check, ChevronRight } from 'lucide-react';
import { PhoneMockup, ScreenType } from './PhoneMockup';

interface HeroProps {
  onGetOnboarded: () => void;
  onExploreFeatures: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onGetOnboarded, onExploreFeatures }) => {
  const [activeScreen, setActiveScreen] = useState<ScreenType>('overview');

  return (
    <section className="relative pt-32 pb-20 lg:pt-38 lg:pb-28 overflow-hidden">
      {/* Subtle Background Glow & Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-indigo-200/30 via-violet-200/20 to-blue-100/30 blur-3xl -z-10 rounded-full pointer-events-none" 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headline, Value Proposition, Action CTAs */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-7">
            
            {/* Clean Unboxed Kicker for Indian Schools */}
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <span>Built Exclusively for Indian Schools</span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="text-slate-500 font-normal capitalize">CBSE, ICSE & State Boards</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-slate-900 leading-[1.12] text-balance">
              Smarter School Management.{' '}
              <span className="text-indigo-600">Simpler Everyday Operations.</span>
            </h1>

            {/* Supporting Copy Localized to India */}
            <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Bring your school's everyday operations together on one simple mobile platform. 
              Manage student admissions, daily roll call, fee collection with instant receipts, and official parent notices — without expensive computer setups or paper register books.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <button
                type="button"
                onClick={onGetOnboarded}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-base font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all duration-150 shadow-md shadow-indigo-600/20 whitespace-nowrap cursor-pointer"
              >
                <span>Request School Onboarding & Demo</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onExploreFeatures}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-medium text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap cursor-pointer shadow-xs"
              >
                <span>Explore Modules</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Key Trust Signals (No static pill sandwiches, clean text) */}
            <div className="pt-4 border-t border-slate-200/60 flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-6 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Dedicated mobile app for teachers & principals</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero server or computer lab setup required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Dedicated +91 onboarding assistance</span>
              </div>
            </div>

          </div>

          {/* Right Column: Hero Smartphone Mockup (Interactive Showcase) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            
            {/* Screen switcher tabs */}
            <div className="mb-4 inline-flex p-1 bg-white border border-slate-200/80 rounded-xl shadow-xs">
              {(
                [
                  { id: 'overview', label: 'Overview' },
                  { id: 'attendance', label: 'Roll Call' },
                  { id: 'fees', label: 'Fee Dues' },
                  { id: 'directory', label: 'Students' }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveScreen(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    activeScreen === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Smartphone Graphic */}
            <div className="relative group">
              <PhoneMockup 
                screen={activeScreen} 
                interactive={true} 
                onScreenChange={setActiveScreen}
              />
              <div className="text-center mt-3 text-[11px] text-slate-400">
                Interactive mobile preview · Tap tabs inside or above to switch screens
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};

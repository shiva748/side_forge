import React from 'react';
import { ArrowRight, Smartphone, Check } from 'lucide-react';

interface FinalCTAProps {
  onScrollToForm: () => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onScrollToForm }) => {
  return (
    <section className="py-20 lg:py-24 bg-gradient-to-b from-stone-50/60 to-white relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 lg:p-16 text-center text-white relative shadow-2xl overflow-hidden">
          {/* Subtle decorative background glow */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -top-20 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Modernize Indian School Operations</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight text-balance">
              Ready to Simplify Your School's Operations?
            </h2>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl mx-auto">
              Take the first step towards a more organized, paperless, and connected school.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={onScrollToForm}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 text-base font-semibold text-slate-900 bg-white hover:bg-stone-100 rounded-xl transition-all duration-150 shadow-lg cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Request School Onboarding & Demo</span>
                <ArrowRight className="w-4 h-4 text-slate-900" />
              </button>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-indigo-400" />
                Mobile-only rollout
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-indigo-400" />
                Dedicated +91 support for school staff
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-indigo-400" />
                CBSE, ICSE & State Board ready
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

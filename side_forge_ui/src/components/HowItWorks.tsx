import React from 'react';
import { ClipboardList, Users2, Rocket, ArrowRight } from 'lucide-react';

interface HowItWorksProps {
  onStartOnboarding: () => void;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ onStartOnboarding }) => {
  const steps = [
    {
      number: '01',
      icon: ClipboardList,
      title: 'Submit School Details',
      description: "Fill out the onboarding form below with your school's details, student strength, board affiliation (CBSE, ICSE, or State Board), and current record system."
    },
    {
      number: '02',
      icon: Users2,
      title: 'Connect With Our Onboarding Team',
      description: "Our school onboarding specialist will connect directly with your Principal, Director, or Trustee via call or interactive demo to align with your academic terms."
    },
    {
      number: '03',
      icon: Rocket,
      title: 'Launch On Mobile Across Campus',
      description: "We configure your school workspace, help onboard teachers for mobile roll call, and get your school started on mobile within 48 hours."
    }
  ];

  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-stone-50/70 border-b border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            <span>Simple 3-Step Process</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 text-balance">
            How It Works
          </h2>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Transitioning your school to a digital mobile foundation is effortless. 
            Here is how we bring your school onto SchoolForge.
          </p>
        </div>

        {/* Steps Grid with Visual Connection Line */}
        <div className="relative">
          {/* Subtle horizontal connecting line on desktop */}
          <div className="hidden lg:block absolute top-1/2 left-[12%] right-[12%] h-0.5 bg-slate-200 -translate-y-8 -z-0" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className="bg-white rounded-2xl p-7 border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    {/* Step Number & Icon */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-2xl font-bold font-mono text-slate-300">
                        {step.number}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-2.5">
                      {step.title}
                    </h3>

                    <p className="text-sm text-slate-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100 text-xs font-medium text-slate-400">
                    Step {idx + 1} of 3
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA prompt below steps */}
        <div className="mt-14 text-center">
          <button
            type="button"
            onClick={onStartOnboarding}
            className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-indigo-600 transition-colors shadow-sm cursor-pointer"
          >
            <span>Begin Step 1: Submit School Onboarding</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </section>
  );
};

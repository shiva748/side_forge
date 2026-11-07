import React, { useState } from 'react';
import { 
  Smartphone, 
  CheckCircle, 
  ArrowRight, 
  Zap, 
  IndianRupee
} from 'lucide-react';
import { PhoneMockup, ScreenType } from './PhoneMockup';

interface MobileExperienceSectionProps {
  onRequestEarlyAccess: () => void;
}

export const MobileExperienceSection: React.FC<MobileExperienceSectionProps> = ({ onRequestEarlyAccess }) => {
  const [activeScreen, setActiveScreen] = useState<ScreenType>('attendance');

  const mobileScreens = [
    { id: 'attendance' as ScreenType, label: 'Roll Call Attendance', desc: 'One-tap morning attendance with instant SMS and app alerts sent to parents of absent students.' },
    { id: 'fees' as ScreenType, label: 'Fee Collection (₹)', desc: 'Track term installments, pending dues, and fee receipts in Indian Rupees (₹) on the go.' },
    { id: 'directory' as ScreenType, label: 'Student Directory', desc: 'Instant student profiles with SRN numbers, parent +91 contact details, and emergency contacts.' },
    { id: 'overview' as ScreenType, label: 'Campus Overview', desc: 'Morning operational briefing, daily attendance percentages, and key institutional vitals.' },
    { id: 'notices' as ScreenType, label: 'School Circulars', desc: 'Publish official circulars for PTMs, exams, and holidays straight to parent smartphones.' },
  ];

  return (
    <section id="mobile-first" className="py-20 lg:py-28 bg-white border-b border-slate-200/60 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Dedicated Mobile Application</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 text-balance">
            Your School. Connected Through Mobile.
          </h2>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            SchoolForge is engineered exclusively as a dedicated mobile application for Indian schools. 
            There are no desktop servers to configure, no expensive computer lab software, and no complicated browser dashboards. 
            Everything needed to lead, teach, and manage your school fits right into the palm of your hand.
          </p>
        </div>

        {/* Screen Selection Tabs (Interactive Filter / Selector) */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {mobileScreens.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveScreen(s.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all duration-150 cursor-pointer ${
                activeScreen === s.id
                  ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900'
                  : 'bg-stone-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Showcase Area: Multi-Device Mobile Display */}
        <div className="relative py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left side: Explanatory benefits tailored to Indian school operations */}
            <div className="lg:col-span-5 space-y-6 order-2 lg:order-1">
              
              <div className="bg-stone-50 rounded-2xl p-6 border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {mobileScreens.find(s => s.id === activeScreen)?.label}
                    </h3>
                    <p className="text-xs text-slate-500">Live mobile preview active</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {mobileScreens.find(s => s.id === activeScreen)?.desc}
                </p>
              </div>

              <div className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Classroom-Ready for Teachers</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Class teachers mark attendance during morning assembly without walking to the administrative office or computer room.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Always-On Reach for Principals & Trustees</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Inspect today's fee collections in ₹ (INR), teacher attendance, and student strength from anywhere on your smartphone.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Zero Technical Barrier for Staff</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Familiar touch interactions mean teachers and non-teaching staff can use the app comfortably from day one.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onRequestEarlyAccess}
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <span>Request School Onboarding & Demo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>

            {/* Right side: Multi-Screen Smartphone Mockups Showcase */}
            <div className="lg:col-span-7 flex items-center justify-center order-1 lg:order-2">
              <div className="relative w-full max-w-lg flex items-center justify-center py-4">
                
                {/* Secondary Background Left Phone (Student Directory preview) */}
                <div className="hidden sm:block absolute left-0 top-6 -translate-x-4 opacity-40 scale-85 pointer-events-none filter blur-[0.5px]">
                  <PhoneMockup screen="directory" />
                </div>

                {/* Secondary Background Right Phone (Fee Management preview in ₹) */}
                <div className="hidden sm:block absolute right-0 top-6 translate-x-4 opacity-40 scale-85 pointer-events-none filter blur-[0.5px]">
                  <PhoneMockup screen="fees" />
                </div>

                {/* Foreground Primary Interactive Phone */}
                <div className="relative z-10 scale-100 shadow-2xl">
                  <PhoneMockup 
                    screen={activeScreen} 
                    interactive={true} 
                    onScreenChange={setActiveScreen} 
                  />
                </div>

              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

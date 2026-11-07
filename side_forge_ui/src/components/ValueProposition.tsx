import React from 'react';
import { 
  Smartphone, 
  Clock, 
  FileCheck2,
  Users2,
  IndianRupee,
  ShieldCheck
} from 'lucide-react';

export const ValueProposition: React.FC = () => {
  const valuePillars = [
    {
      icon: Smartphone,
      title: 'Mobile-First Independence',
      description: 'Your staff and teachers manage their classes straight from their smartphones. No desktop workstations, server rooms, or computer lab setups required.'
    },
    {
      icon: Clock,
      title: 'Quick 60-Second Roll Call',
      description: 'Class teachers record morning attendance in under a minute. Parents of absent students are notified automatically without office staff making manual calls.'
    },
    {
      icon: IndianRupee,
      title: 'Transparent ₹ Fee Tracking',
      description: 'Easily track term-wise tuition, transport, and annual fee collections in Indian Rupees (₹). Know exactly which student dues are pending with instant receipting.'
    },
    {
      icon: Users2,
      title: 'Official Parent Communication',
      description: 'Replace noisy, unofficial WhatsApp parent groups with structured school circulars, PTM announcements, and exam date sheets delivered securely to parents.'
    }
  ];

  return (
    <section className="py-20 lg:py-24 bg-white border-y border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            <span>Built for Indian Educational Leadership</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 text-balance">
            Everything Your School Needs, In One Place.
          </h2>
          
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            School administration in India should not be burdened by manual register books, missing fee counterfoils, or disconnected spreadsheets. 
            SchoolForge gives principals, trustees, and teachers a modern mobile app designed specifically for Indian school operations.
          </p>
        </div>

        {/* 4 Elegant Value Pillar Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {valuePillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="bg-stone-50/70 rounded-2xl p-6 border border-slate-200/80 hover:border-indigo-200 hover:bg-white transition-all duration-200 flex flex-col justify-between group shadow-xs hover:shadow-md"
              >
                <div>
                  <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 mb-5 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200 shadow-2xs">
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-2">
                    {pillar.title}
                  </h3>
                  
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {pillar.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200/60 text-xs font-medium text-indigo-600 flex items-center gap-1 group-hover:text-indigo-700">
                  <span>Streamlined for Indian schools</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

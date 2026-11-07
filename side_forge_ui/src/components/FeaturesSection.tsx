import React, { useState } from 'react';
import { 
  Users, 
  CalendarCheck, 
  IndianRupee, 
  Layers, 
  UserCheck, 
  MessageSquare, 
  BookOpen, 
  Megaphone,
  ArrowRight,
  CheckCircle2,
  X
} from 'lucide-react';

interface FeatureItem {
  id: string;
  icon: React.ElementType;
  title: string;
  tagline: string;
  bullets: string[];
  mobileHighlights: string[];
}

const featuresList: FeatureItem[] = [
  {
    id: 'student-management',
    icon: Users,
    title: 'Student Management',
    tagline: 'Organized student profiles, admission numbers, and parent contacts.',
    bullets: [
      'Maintain organized student profiles and records.',
      'Access important student information easily.'
    ],
    mobileHighlights: [
      'Quick student search by Student Registration Number (SRN), Roll No, or Name',
      'Instant access to parent mobile numbers and emergency contacts',
      'Class and section mapping stored in a unified mobile record'
    ]
  },
  {
    id: 'attendance-management',
    icon: CalendarCheck,
    title: 'Attendance Management',
    tagline: 'Simplify daily roll call without cumbersome paper registers.',
    bullets: [
      'Simplify daily attendance tracking.',
      'Monitor attendance records.'
    ],
    mobileHighlights: [
      'One-tap roll call for class teachers right in the classroom',
      'Automatic SMS/app alert sent to parents if a student is marked absent',
      'Monthly attendance register summaries viewable by the Principal anytime'
    ]
  },
  {
    id: 'fee-management',
    icon: IndianRupee,
    title: 'Fee Management',
    tagline: 'Track tuition, transport, and term fees in Indian Rupees (₹).',
    bullets: [
      'Organize fee records and payment status.',
      'Improve visibility into outstanding fees.'
    ],
    mobileHighlights: [
      'Track paid, pending, and overdue fee installments in ₹ (INR)',
      'Record payments via UPI, Cheque, Cash, or NetBanking with instant receipting',
      'Real-time fee defaulters list accessible to administrative leadership'
    ]
  },
  {
    id: 'class-section-management',
    icon: Layers,
    title: 'Class & Section Management',
    tagline: 'Organize Nursery through Class 12 sections with ease.',
    bullets: [
      'Organize classes, sections and student allocations.'
    ],
    mobileHighlights: [
      'Organize Classes 1 to 12 with sections (A, B, C) and subject streams',
      'Seamlessly allocate students to their respective classrooms and teachers',
      'Instant overview of student strength across each class and section'
    ]
  },
  {
    id: 'teacher-staff-management',
    icon: UserCheck,
    title: 'Teacher & Staff Management',
    tagline: 'Centralized directory for class teachers and subject instructors.',
    bullets: [
      'Manage teacher and staff information.'
    ],
    mobileHighlights: [
      'Maintain verified staff contact details and designated roles',
      'Assign Class Teachers and subject faculty to specific sections',
      'Convenient mobile directory for management and administrative coordination'
    ]
  },
  {
    id: 'parent-communication',
    icon: MessageSquare,
    title: 'Parent Communication',
    tagline: 'Keep parents informed about PTMs, exams, and attendance.',
    bullets: [
      'Keep parents informed through school updates and notifications.'
    ],
    mobileHighlights: [
      'Send direct automated alerts for unexcused morning absences',
      'Share Parent-Teacher Meeting (PTM) reminders and examination schedules',
      'Build institutional trust with consistent, official school broadcasts'
    ]
  },
  {
    id: 'academic-management',
    icon: BookOpen,
    title: 'Academic Management',
    tagline: 'Organize academic years, terms, and ongoing student records.',
    bullets: [
      'Organize academic sessions and student records.'
    ],
    mobileHighlights: [
      'Configure academic sessions (e.g., 2026–27) aligned with CBSE, ICSE, or State Boards',
      'Maintain continuous student academic history and progression',
      'Orderly record keeping aligned with Indian school calendar milestones'
    ]
  },
  {
    id: 'school-announcements',
    icon: Megaphone,
    title: 'School Announcements',
    tagline: 'Publish official circulars and notices straight to mobile devices.',
    bullets: [
      'Share important notices and updates.'
    ],
    mobileHighlights: [
      'Broadcast announcements for holidays, exam dates, or emergency school closures',
      'Digital circulars replace easily misplaced paper diary slips',
      'Archived notice board accessible to parents and teachers on their phones'
    ]
  }
];

interface FeaturesSectionProps {
  onSelectFeatureForOnboarding?: (featureTitle: string) => void;
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ onSelectFeatureForOnboarding }) => {
  const [selectedFeature, setSelectedFeature] = useState<FeatureItem | null>(null);

  return (
    <section id="features" className="py-20 lg:py-28 bg-stone-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            <span>Platform Modules</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 text-balance">
            Designed for the Rhythm of Indian Schools
          </h2>
          
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            SchoolForge provides dedicated mobile modules tailored to Indian school management, 
            helping principals, management committees, and teachers run daily operations seamlessly.
          </p>
        </div>

        {/* 8 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuresList.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-indigo-300 hover:shadow-lg transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  {/* Clean number index & Icon */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100/70 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-2xs">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-medium text-slate-400">
                      0{index + 1}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-2">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-500 mb-4 leading-relaxed font-medium">
                    {item.tagline}
                  </p>

                  <ul className="space-y-2 mb-6">
                    {item.bullets.map((bullet, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedFeature(item)}
                  className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors w-full text-left cursor-pointer group-hover:translate-x-0.5 transition-transform"
                >
                  <span>Explore module details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

      </div>

      {/* Feature Detail Modal */}
      {selectedFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <selectedFeature.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedFeature.title}</h3>
                  <p className="text-xs text-slate-500">Module Overview for Indian Schools</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFeature(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 my-5">
              <div className="bg-stone-50 rounded-xl p-3.5 border border-slate-200/70">
                <p className="text-xs font-semibold text-slate-700 mb-1">Core Functionality</p>
                <ul className="space-y-1.5">
                  {selectedFeature.bullets.map((b, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">Tailored for Indian School Workflows:</p>
                <ul className="space-y-2">
                  {selectedFeature.mobileHighlights.map((hl, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{hl}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedFeature(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedFeature(null);
                  const formEl = document.getElementById('onboarding-form');
                  if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-xs cursor-pointer"
              >
                Request Onboarding For This Module
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

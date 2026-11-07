import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'What is this School Management Platform?',
    answer: 'SchoolForge is a dedicated mobile SaaS application engineered specifically for Indian schools, educational trusts, and private institutions. It streamlines daily administrative tasks—including student records, morning roll call attendance, fee collection in Indian Rupees (₹), and parent circulars—without requiring expensive computers or IT infrastructure.'
  },
  {
    question: 'Is the platform available as a mobile application?',
    answer: 'Yes. The platform is initially available exclusively as a mobile application for smartphones. School principals, trustees, teachers, and administrative staff manage operations directly from their phones. There is no web-based admin dashboard or desktop installation needed.'
  },
  {
    question: 'Can multiple schools or branches use the platform?',
    answer: 'Yes. SchoolForge supports multi-school institutions and branch networks across India. Whether you manage a single campus or multiple school branches in different cities, each branch operates with its own secure student registers, fee heads, and staff rosters.'
  },
  {
    question: 'How can my school get onboarded?',
    answer: 'You can initiate onboarding by submitting the School Onboarding Request form on this page. Once submitted, our Indian onboarding team will connect with your designated contact person on their mobile number (+91) to understand your class structure, board affiliation, and fee cycle.'
  },
  {
    question: 'Can we request a product demonstration?',
    answer: 'Yes, absolutely. Upon receiving your onboarding submission, our team can arrange a live demonstration tailored for your school management, principal, or trustees, showing you how attendance, fees, and notices work on mobile.'
  },
  {
    question: 'How do we get in touch with your team?',
    answer: 'The fastest way to connect with our team is by submitting the onboarding request form on this website. Our representatives respond to inquiries submitted by Indian schools within 24 to 48 hours.'
  }
];

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 lg:py-28 bg-white border-b border-slate-200/60">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            <span>Got Questions?</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 text-balance">
            Frequently Asked Questions
          </h2>

          <p className="text-base text-slate-600 leading-relaxed">
            Everything you need to know about SchoolForge and onboarding your Indian school onto mobile.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3.5">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className={`rounded-2xl border transition-all duration-200 ${
                  isOpen 
                    ? 'border-indigo-200 bg-stone-50/50 shadow-xs' 
                    : 'border-slate-200/80 bg-white hover:border-slate-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left text-base font-bold text-slate-900 focus:outline-none cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="pr-4">{faq.question}</span>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-200 ${
                    isOpen ? 'rotate-180 bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

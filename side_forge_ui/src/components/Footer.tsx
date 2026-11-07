import React, { useState } from 'react';
import { Smartphone, Shield, FileText, Mail, X } from 'lucide-react';

interface FooterProps {
  onScrollToForm: () => void;
  onScrollToSection: (id: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onScrollToForm, onScrollToSection }) => {
  const [activeModal, setActiveModal] = useState<'contact' | 'privacy' | 'terms' | null>(null);

  return (
    <footer className="bg-white border-t border-slate-200 text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          
          {/* Brand & Description */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                <span className="font-extrabold text-sm tracking-tight">SF</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                School<span className="text-indigo-600">Forge</span>
              </span>
            </div>

            <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
              Smarter School Management. Simpler Everyday Operations. 
              A modern mobile SaaS platform built exclusively for Indian private schools, trusts, and K-12 institutions to digitize student records, daily roll call, fee tracking in Indian Rupees (₹), and parent circulars.
            </p>

            <div className="pt-2 text-xs text-slate-400">
              <span>Platform Availability: Dedicated Mobile Application for Indian Schools</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Platform
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onScrollToSection('features')}
                  className="hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  Features & Modules
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onScrollToSection('how-it-works')}
                  className="hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onScrollToSection('mobile-first')}
                  className="hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  Mobile Experience
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onScrollToSection('faq')}
                  className="hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  Frequently Asked Questions
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onScrollToForm}
                  className="text-indigo-600 font-medium hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  Request School Onboarding
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Info Placeholders */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Institutional Information
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal('contact')}
                  className="hover:text-indigo-600 transition-colors text-left cursor-pointer"
                >
                  Contact Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal('privacy')}
                  className="hover:text-indigo-600 transition-colors text-left cursor-pointer"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal('terms')}
                  className="hover:text-indigo-600 transition-colors text-left cursor-pointer"
                >
                  Terms of Service
                </button>
              </li>
            </ul>

            <div className="pt-3">
              <div className="bg-stone-50 rounded-xl p-3 border border-slate-200/80 text-xs text-slate-500">
                To request school onboarding or schedule an introductory demo for your Indian institution, please submit the request form above.
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar with Copyright */}
        <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} SchoolForge. Built for Indian Schools.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Exclusively available as a mobile application in India.</span>
          </div>
        </div>
      </div>

      {/* Institutional Modals (Contact, Privacy, Terms) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {activeModal === 'contact' && 'Contact Us'}
                {activeModal === 'privacy' && 'Privacy Policy'}
                {activeModal === 'terms' && 'Terms of Service'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 text-xs sm:text-sm text-slate-600 leading-relaxed space-y-3">
              {activeModal === 'contact' && (
                <>
                  <p>
                    Thank you for your interest in SchoolForge. We are actively partnering with Indian schools, trusts, and educational societies across CBSE, ICSE, and State Boards.
                  </p>
                  <p>
                    For institutional onboarding inquiries, demonstrations, and support coordination, please submit your school details through the onboarding request form on this page. Our team reviews all submissions and connects with authorized school leadership directly via mobile (+91).
                  </p>
                </>
              )}

              {activeModal === 'privacy' && (
                <>
                  <p>
                    <strong>Confidentiality First:</strong> SchoolForge treats all school records, student profiles, teacher rosters, and fee registers with uncompromising confidentiality.
                  </p>
                  <p>
                    Institutional data submitted via the onboarding form is used exclusively to evaluate school onboarding feasibility and establish communication with authorized school representatives in India. We do not monetize or share institutional or student data with third parties.
                  </p>
                </>
              )}

              {activeModal === 'terms' && (
                <>
                  <p>
                    <strong>Platform Provisioning:</strong> SchoolForge is provided to educational institutions in India subject to formal onboarding review and institutional service agreements.
                  </p>
                  <p>
                    The platform is deployed initially via dedicated mobile applications. Access is granted to verified teachers, principals, trustees, and designated staff following workspace configuration.
                  </p>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-indigo-600 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};

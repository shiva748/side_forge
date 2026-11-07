import React from 'react';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { ValueProposition } from '../components/ValueProposition';
import { FeaturesSection } from '../components/FeaturesSection';
import { MobileExperienceSection } from '../components/MobileExperienceSection';
import { HowItWorks } from '../components/HowItWorks';
import { OnboardingForm } from '../components/OnboardingForm';
import { FAQSection } from '../components/FAQSection';
import { FinalCTA } from '../components/FinalCTA';
import { Footer } from '../components/Footer';

export const LandingPage: React.FC = () => {
  const scrollToOnboarding = () => {
    const el = document.getElementById('onboarding-form');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        const firstInput = el.querySelector('input');
        if (firstInput) {
          firstInput.focus();
        }
      }, 500);
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-stone-50/40 text-slate-900 font-sans flex flex-col selection:bg-indigo-600 selection:text-white">
      {/* Sticky Top Navigation */}
      <Navbar onOpenOnboarding={scrollToOnboarding} />

      {/* Main Page Sections */}
      <main className="flex-1">
        {/* Hero Section with Live Smartphone Mockup */}
        <Hero
          onGetOnboarded={scrollToOnboarding}
          onExploreFeatures={() => scrollToSection('features')}
        />

        {/* Value Proposition & Trust Section */}
        <ValueProposition />

        {/* Core Features Grid (8 Modules) */}
        <FeaturesSection />

        {/* Mobile-First Experience Section */}
        <MobileExperienceSection onRequestEarlyAccess={scrollToOnboarding} />

        {/* Simple 3-Step Workflow */}
        <HowItWorks onStartOnboarding={scrollToOnboarding} />

        {/* School Onboarding Request Form */}
        <OnboardingForm />

        {/* Frequently Asked Questions */}
        <FAQSection />

        {/* Final Conversion CTA */}
        <FinalCTA onScrollToForm={scrollToOnboarding} />
      </main>

      {/* Footer */}
      <Footer
        onScrollToForm={scrollToOnboarding}
        onScrollToSection={scrollToSection}
      />
    </div>
  );
};

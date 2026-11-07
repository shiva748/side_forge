import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onOpenOnboarding: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenOnboarding }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, activeWorkspace } = useAuth();
  const workspaceHref = activeWorkspace === 'PLATFORM' ? '/platform' : '/app';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 16);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-xs border-b border-slate-200/80 py-3.5'
          : 'bg-stone-50/80 backdrop-blur-xs border-b border-slate-200/40 py-4.5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2.5 text-slate-900 group whitespace-nowrap shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs group-hover:bg-indigo-700 transition-colors">
              <span className="font-extrabold text-sm tracking-tight">SF</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              School<span className="text-indigo-600">Forge</span>
            </span>
          </a>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('mobile-first')}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              For Schools
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('faq')}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              FAQ
            </button>
          </nav>

          {/* Zone 3: Primary CTA */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <Link
              to={isAuthenticated ? workspaceHref : '/login'}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 rounded-xl hover:bg-slate-100/80 transition-colors whitespace-nowrap"
            >
              <LogIn className="w-4 h-4" />
              <span>{isAuthenticated ? 'Open Workspace' : 'Admin Sign In'}</span>
            </Link>
            <button
              type="button"
              onClick={onOpenOnboarding}
              className="inline-flex items-center justify-center gap-2 px-4.5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-indigo-600 active:scale-[0.98] transition-all duration-150 shadow-xs whitespace-nowrap cursor-pointer"
            >
              <span>Request School Onboarding</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 hover:text-slate-900 rounded-lg focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white/98 px-5 pt-3 pb-6 shadow-xl">
          <nav className="flex flex-col space-y-3 pt-2">
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="text-left py-2 text-base font-medium text-slate-800 hover:text-indigo-600 transition-colors"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="text-left py-2 text-base font-medium text-slate-800 hover:text-indigo-600 transition-colors"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('mobile-first')}
              className="text-left py-2 text-base font-medium text-slate-800 hover:text-indigo-600 transition-colors"
            >
              For Schools
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('faq')}
              className="text-left py-2 text-base font-medium text-slate-800 hover:text-indigo-600 transition-colors"
            >
              FAQ
            </button>

            <div className="pt-3 flex flex-col gap-2.5">
              <Link
                to={isAuthenticated ? workspaceHref : '/login'}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>{isAuthenticated ? 'Open Workspace' : 'Admin Sign In'}</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenOnboarding();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-indigo-600 transition-colors"
              >
                <span>Request School Onboarding</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

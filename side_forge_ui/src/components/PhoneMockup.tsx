import React from 'react';
import { 
  Users, 
  CalendarCheck, 
  IndianRupee, 
  Bell, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronRight, 
  PhoneCall, 
  Search, 
  FileText,
  Building2,
  GraduationCap
} from 'lucide-react';

export type ScreenType = 'overview' | 'attendance' | 'fees' | 'directory' | 'notices';

interface PhoneMockupProps {
  screen?: ScreenType;
  interactive?: boolean;
  onScreenChange?: (screen: ScreenType) => void;
  className?: string;
}

export const PhoneMockup: React.FC<PhoneMockupProps> = ({
  screen = 'overview',
  interactive = false,
  onScreenChange,
  className = ''
}) => {
  return (
    <div className={`relative mx-auto w-[300px] sm:w-[320px] rounded-[44px] bg-slate-900 p-3 shadow-2xl shadow-indigo-950/20 ring-1 ring-slate-800/80 ${className}`}>
      {/* Phone Outer Edge & Buttons */}
      <div className="absolute -left-[3px] top-24 h-10 w-[3px] rounded-l-sm bg-slate-700" />
      <div className="absolute -left-[3px] top-38 h-12 w-[3px] rounded-l-sm bg-slate-700" />
      <div className="absolute -left-[3px] top-54 h-12 w-[3px] rounded-l-sm bg-slate-700" />
      <div className="absolute -right-[3px] top-32 h-16 w-[3px] rounded-r-sm bg-slate-700" />

      {/* Screen Container */}
      <div className="relative h-[610px] w-full overflow-hidden rounded-[36px] bg-white text-slate-900 select-none flex flex-col">
        {/* Dynamic Island / Notch */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 h-5 w-24 rounded-full bg-slate-950 flex items-center justify-between px-2">
          <div className="h-2 w-2 rounded-full bg-slate-800" />
          <div className="h-1.5 w-1.5 rounded-full bg-indigo-950/80" />
        </div>

        {/* Status Bar */}
        <div className="relative z-20 flex h-10 items-center justify-between px-6 pt-1 text-[11px] font-semibold text-slate-800">
          <span className="tracking-tight">9:41</span>
          <div className="flex items-center gap-1.5 text-[10px]">
            {/* Cellular */}
            <div className="flex items-end gap-0.5 h-2.5">
              <span className="w-0.5 h-1 bg-slate-800 rounded-xs" />
              <span className="w-0.5 h-1.5 bg-slate-800 rounded-xs" />
              <span className="w-0.5 h-2 bg-slate-800 rounded-xs" />
              <span className="w-0.5 h-2.5 bg-slate-800 rounded-xs" />
            </div>
            {/* WiFi */}
            <svg className="w-3 h-3 text-slate-800" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3C7.79 3 3.96 4.63 1.09 7.33L12 21l10.91-13.67C20.04 4.63 16.21 3 12 3zm0 3c3.4 0 6.54 1.25 8.95 3.32L12 19.33 3.05 9.32C5.46 7.25 8.6 6 12 6z" />
            </svg>
            {/* Battery */}
            <div className="w-5 h-2.5 border border-slate-800 rounded-xs p-0.5 flex items-center">
              <div className="h-full w-full bg-slate-800 rounded-2xs" />
            </div>
          </div>
        </div>

        {/* App Bar Header (Indian School Example) */}
        <div className="bg-slate-900 text-white px-4 pt-2 pb-3.5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                SF
              </div>
              <div>
                <p className="text-xs font-semibold leading-tight tracking-tight">Delhi Heritage Public School</p>
                <p className="text-[10px] text-slate-300">CBSE Affiliated · AY 2026–27</p>
              </div>
            </div>
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center">
                <Bell className="w-3.5 h-3.5 text-slate-200" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-slate-900" />
            </div>
          </div>
        </div>

        {/* Content Body Based on Screen Type */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 bg-stone-50/70 text-left">
          {screen === 'overview' && (
            <>
              {/* Daily attendance summary card */}
              <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium text-slate-500">Today's Roll Call Attendance</span>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                    96.4% Present
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold tracking-tight text-slate-900 tabular-nums">1,182</span>
                  <span className="text-[11px] text-slate-400">/ 1,226 students</span>
                </div>
                <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: '96.4%' }} />
                </div>
              </div>

              {/* Fee overview metric (Indian Rupee / Indian Numbering) */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                    <IndianRupee className="w-3 h-3 text-indigo-600" />
                    <span className="text-[10px] font-medium">Term 2 Fees</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 tabular-nums">₹4,85,000</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">88% of target collected</p>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                    <CalendarCheck className="w-3 h-3 text-emerald-600" />
                    <span className="text-[10px] font-medium">Teaching Staff</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 tabular-nums">48 / 50</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">2 on sanctioned leave</p>
                </div>
              </div>

              {/* Quick Actions Strip */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-0.5 mb-1.5">
                  Quick Mobile Actions
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="bg-indigo-50 border border-indigo-100/80 rounded-lg p-2 text-center">
                    <CalendarCheck className="w-3.5 h-3.5 text-indigo-600 mx-auto mb-1" />
                    <span className="text-[9px] font-semibold text-indigo-950 block leading-tight">Mark Roll</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/70 rounded-lg p-2 text-center">
                    <Bell className="w-3.5 h-3.5 text-slate-700 mx-auto mb-1" />
                    <span className="text-[9px] font-semibold text-slate-800 block leading-tight">PTM Notice</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/70 rounded-lg p-2 text-center">
                    <IndianRupee className="w-3.5 h-3.5 text-slate-700 mx-auto mb-1" />
                    <span className="text-[9px] font-semibold text-slate-800 block leading-tight">Fee Receipt</span>
                  </div>
                </div>
              </div>

              {/* Recent School Log */}
              <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Recent Campus Updates
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2 pb-2 border-b border-slate-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-[11px] font-medium text-slate-800">Class 10-A attendance submitted</p>
                      <span className="text-[9px] text-slate-400">38 of 40 present · Class Teacher: S. Sharma · 12m ago</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 pb-2 border-b border-slate-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-[11px] font-medium text-slate-800">Fee Receipt #RCP-8842 issued</p>
                      <span className="text-[9px] text-slate-400">Aarav Patel (Class 7-B) · UPI Payment · 35m ago</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-[11px] font-medium text-slate-800">Circular sent to parents</p>
                      <span className="text-[9px] text-slate-400">Diwali Break & Winter Timing Notice · 1h ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {screen === 'attendance' && (
            <>
              <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
                <div>
                  <p className="text-xs font-bold text-slate-900">Class 9-B Roll Call</p>
                  <p className="text-[10px] text-slate-500">Class Teacher: Mrs. Sunita Rao</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-600 tabular-nums">36 / 38</span>
                  <p className="text-[9px] text-slate-400">2 absent today</p>
                </div>
              </div>

              {/* Indian student roster */}
              <div className="space-y-1.5">
                {[
                  { name: 'Aarav Sharma', roll: '01', status: 'present' },
                  { name: 'Ananya Iyer', roll: '02', status: 'present' },
                  { name: 'Rohan Verma', roll: '03', status: 'absent' },
                  { name: 'Diya Patel', roll: '04', status: 'present' },
                  { name: 'Priyansh Gupta', roll: '05', status: 'absent' },
                  { name: 'Meera Joshi', roll: '06', status: 'present' },
                ].map((s) => (
                  <div key={s.roll} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200/70">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400 w-4">{s.roll}</span>
                      <span className="text-xs font-medium text-slate-800">{s.name}</span>
                    </div>
                    {s.status === 'present' ? (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Present
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                        <XCircle className="w-3 h-3 text-rose-600" /> Absent
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-indigo-50 border border-indigo-100 p-2.5 rounded-xl text-center">
                <p className="text-[10px] text-indigo-950 font-medium">
                  Instant SMS & app alerts sent to parents of 2 absent students
                </p>
              </div>
            </>
          )}

          {screen === 'fees' && (
            <>
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Term 2 Fee Collection</span>
                <p className="text-lg font-bold text-slate-900 mt-0.5 tabular-nums">₹14,80,000</p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                  <span>Target: ₹16,50,000</span>
                  <span className="text-indigo-600 font-semibold">90% Collected</span>
                </div>
                <div className="mt-1.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: '90%' }} />
                </div>
              </div>

              <div className="space-y-1.5">
                {[
                  { name: 'Arjun Nair', class: 'Class 8-A', amount: '₹24,500', status: 'Paid', mode: 'UPI / GPay' },
                  { name: 'Kavya Deshmukh', class: 'Class 10-B', amount: '₹28,000', status: 'Pending', mode: 'Due in 5d' },
                  { name: 'Vihaan Kulkarni', class: 'Class 6-C', amount: '₹14,000', status: 'Partial', mode: 'Cheque Cleared' },
                  { name: 'Tanvi Agarwal', class: 'Class 11-Science', amount: '₹32,500', status: 'Paid', mode: 'NetBanking' },
                ].map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200/70">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{f.name}</p>
                      <p className="text-[10px] text-slate-400">{f.class} · {f.mode}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900 tabular-nums">{f.amount}</p>
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                        f.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' :
                        f.status === 'Pending' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {f.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {screen === 'directory' && (
            <>
              {/* Search input mock */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input 
                  type="text" 
                  readOnly 
                  value="Search 1,226 students (by SRN or Name)..." 
                  className="w-full bg-white border border-slate-200 text-slate-400 text-xs rounded-lg pl-8 pr-3 py-1.5 pointer-events-none"
                />
              </div>

              <div className="space-y-1.5">
                {[
                  { name: 'Ishaan Malhotra', class: 'Class 7-A', srn: 'SRN #10842', parent: 'Rajesh Malhotra', phone: '+91 98201 44552' },
                  { name: 'Bhavna Reddy', class: 'Class 9-B', srn: 'SRN #10321', parent: 'Srinivas Reddy', phone: '+91 94401 22890' },
                  { name: 'Devendra Singhania', class: 'Class 11-Comm', srn: 'SRN #09912', parent: 'Alok Singhania', phone: '+91 98110 56711' },
                  { name: 'Suhani Mukherjee', class: 'Class 8-A', srn: 'SRN #10554', parent: 'Dr. Debasish Mukherjee', phone: '+91 98300 77192' },
                ].map((s, i) => (
                  <div key={i} className="bg-white p-2.5 rounded-lg border border-slate-200/70 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{s.name}</p>
                      <p className="text-[10px] text-slate-500">{s.class} · {s.srn}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Parent: {s.parent}</p>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <PhoneCall className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {screen === 'notices' && (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900">Official Circulars</span>
                <span className="text-[10px] text-indigo-600 font-semibold">+ Publish Circular</span>
              </div>

              <div className="space-y-2">
                {[
                  { title: 'Parent-Teacher Meeting (PTM) & Term 1 Report Cards', target: 'Classes 1 to 12 Parents', date: '12/11/2026', unread: false },
                  { title: 'Inter-House Annual Sports Meet & March Past Selection', target: 'Secondary Section (6–12)', date: '08/11/2026', unread: true },
                  { title: 'Diwali Vacation & Winter School Timing Guidelines', target: 'All Classes & Staff', date: '02/11/2026', unread: false },
                ].map((n, i) => (
                  <div key={i} className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>{n.target}</span>
                      <span className="font-mono">{n.date}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 leading-snug">{n.title}</p>
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-500">
                      <span>Sent via Mobile App & Parent SMS</span>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bottom Tab Bar (Interactive or Static) */}
        <div className="bg-white border-t border-slate-200/80 px-2 py-2 shrink-0">
          <div className="grid grid-cols-4 gap-1 text-center">
            <button 
              type="button"
              onClick={() => onScreenChange && onScreenChange('overview')}
              className={`flex flex-col items-center py-1 transition-colors ${
                screen === 'overview' ? 'text-indigo-600 font-semibold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Building2 className="w-4 h-4 mb-0.5" />
              <span className="text-[9px] leading-none">Campus</span>
            </button>

            <button 
              type="button"
              onClick={() => onScreenChange && onScreenChange('attendance')}
              className={`flex flex-col items-center py-1 transition-colors ${
                screen === 'attendance' ? 'text-indigo-600 font-semibold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <CalendarCheck className="w-4 h-4 mb-0.5" />
              <span className="text-[9px] leading-none">Roll Call</span>
            </button>

            <button 
              type="button"
              onClick={() => onScreenChange && onScreenChange('fees')}
              className={`flex flex-col items-center py-1 transition-colors ${
                screen === 'fees' ? 'text-indigo-600 font-semibold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <IndianRupee className="w-4 h-4 mb-0.5" />
              <span className="text-[9px] leading-none">Fees</span>
            </button>

            <button 
              type="button"
              onClick={() => onScreenChange && onScreenChange('directory')}
              className={`flex flex-col items-center py-1 transition-colors ${
                screen === 'directory' ? 'text-indigo-600 font-semibold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Users className="w-4 h-4 mb-0.5" />
              <span className="text-[9px] leading-none">Students</span>
            </button>
          </div>
          {/* iOS Home Indicator Bar */}
          <div className="mx-auto mt-2 h-1 w-28 rounded-full bg-slate-300" />
        </div>
      </div>
    </div>
  );
};

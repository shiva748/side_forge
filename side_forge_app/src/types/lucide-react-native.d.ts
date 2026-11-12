declare module 'lucide-react-native' {
  import type { ComponentType } from 'react';
  import type { ColorValue } from 'react-native';
  import type { SvgProps } from 'react-native-svg';

  export interface LucideProps extends SvgProps {
    size?: string | number;
    color?: ColorValue;
    strokeWidth?: string | number;
    absoluteStrokeWidth?: boolean;
  }

  export type LucideIcon = ComponentType<LucideProps>;

  export const Activity: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const ArrowLeftRight: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const Award: LucideIcon;
  export const Bell: LucideIcon;
  export const BookOpen: LucideIcon;
  export const Building2: LucideIcon;
  export const Calendar: LucideIcon;
  export const CalendarCheck: LucideIcon;
  export const Camera: LucideIcon;
  export const Check: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ClipboardCheck: LucideIcon;
  export const Clock: LucideIcon;
  export const CreditCard: LucideIcon;
  export const Download: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const FileCheck: LucideIcon;
  export const FileSpreadsheet: LucideIcon;
  export const FileText: LucideIcon;
  export const Globe: LucideIcon;
  export const GraduationCap: LucideIcon;
  export const HelpCircle: LucideIcon;
  export const Home: LucideIcon;
  export const Inbox: LucideIcon;
  export const Info: LucideIcon;
  export const KeyRound: LucideIcon;
  export const LayoutGrid: LucideIcon;
  export const Lock: LucideIcon;
  export const LogIn: LucideIcon;
  export const LogOut: LucideIcon;
  export const Mail: LucideIcon;
  export const Megaphone: LucideIcon;
  export const Menu: LucideIcon;
  export const MessageSquare: LucideIcon;
  export const Monitor: LucideIcon;
  export const Moon: LucideIcon;
  export const Palette: LucideIcon;
  export const Paperclip: LucideIcon;
  export const Phone: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const Search: LucideIcon;
  export const Server: LucideIcon;
  export const Settings: LucideIcon;
  export const Shield: LucideIcon;
  export const ShieldAlert: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const Smartphone: LucideIcon;
  export const Sparkles: LucideIcon;
  export const Sun: LucideIcon;
  export const Ticket: LucideIcon;
  export const Trash2: LucideIcon;
  export const Upload: LucideIcon;
  export const User: LucideIcon;
  export const UserCheck: LucideIcon;
  export const UserPlus: LucideIcon;
  export const Users: LucideIcon;
  export const WifiOff: LucideIcon;
  export const X: LucideIcon;
  export const XCircle: LucideIcon;
}



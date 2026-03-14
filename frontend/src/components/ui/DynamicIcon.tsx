import type { LucideProps } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  Target,
  Wallet,
  Columns3,
  MessageSquare,
  Bell,
  Settings,
  Search,
  Users,
  TrendingUp,
  Heart,
  DollarSign,
  Plus,
  ArrowRight,
  LogOut,
  Menu,
  X,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  LayoutDashboard,
  Building2,
  Target,
  Wallet,
  Columns3,
  MessageSquare,
  Bell,
  Settings,
  Search,
  Users,
  TrendingUp,
  Heart,
  DollarSign,
  Plus,
  ArrowRight,
  LogOut,
  Menu,
  X,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
};

interface DynamicIconProps extends LucideProps {
  name: string;
}

export function DynamicIcon({ name, ...props }: DynamicIconProps) {
  const Icon = iconMap[name];
  if (!Icon) return null;
  return <Icon {...props} />;
}

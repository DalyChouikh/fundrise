export type UserRole = "founder" | "team_member" | "investor" | "admin";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  role: UserRole;
  bio: string;
  role_selected: boolean;
  created_at: string;
  updated_at: string;
}

export type StartupStatus = "pending_approval" | "active" | "suspended";

export interface Startup {
  id: number;
  name: string;
  description: string;
  industry: string;
  location: string;
  founding_date: string;
  status: StartupStatus;
  pitch_deck_url: string;
  logo_url: string;
  website: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CampaignStatus =
  | "draft"
  | "pending_approval"
  | "active"
  | "completed"
  | "rejected";

export interface Campaign {
  id: number;
  startup: number;
  title: string;
  description: string;
  funding_goal: string;
  current_funding: string;
  equity_offered: string;
  deadline: string;
  status: CampaignStatus;
  funding_percentage: number;
  created_at: string;
  updated_at: string;
}

export type InvestmentStatus = "pending" | "confirmed" | "cancelled";

export interface Investment {
  id: number;
  investor: string;
  campaign: number;
  amount: string;
  status: InvestmentStatus;
  created_at: string;
  updated_at: string;
}

export type NotificationType =
  | "investment_received"
  | "investment_confirmed"
  | "campaign_update"
  | "campaign_approved"
  | "campaign_rejected"
  | "milestone_completed"
  | "startup_approved"
  | "new_message"
  | "new_follower"
  | "task_assigned"
  | "task_comment";

export interface Notification {
  id: number;
  notification_type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles?: UserRole[];
}

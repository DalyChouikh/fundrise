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

export interface UserProfileMinimal {
  id: string;
  full_name: string;
  avatar_url: string;
  role: UserRole;
}

export type StartupStatus = "pending_approval" | "active" | "suspended";

export interface StartupMember {
  id: number;
  user: UserProfileMinimal;
  role: "founder" | "team_member";
  joined_at: string;
}

export interface Startup {
  id: number;
  name: string;
  description: string;
  industry: string;
  location: string;
  founding_date: string;
  status: StartupStatus;
  logo_url: string;
  website: string;
  created_by: UserProfileMinimal;
  members_count: number;
  followers_count: number;
  is_following: boolean;
  created_at: string;
  updated_at: string;
}

export interface StartupDetail extends Startup {
  pitch_deck_url: string;
  members: StartupMember[];
  is_member: boolean;
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
  startup_name: string;
  title: string;
  description: string;
  funding_goal: string;
  current_funding: string;
  funding_percentage: number;
  equity_offered: string;
  deadline: string;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
}

export interface CampaignDetail extends Campaign {
  updates_count: number;
  milestones_count: number;
  is_startup_member: boolean;
}

export interface CampaignUpdate {
  id: number;
  title: string;
  content: string;
  created_by: UserProfileMinimal;
  created_at: string;
  updated_at: string;
}

export interface CampaignMilestone {
  id: number;
  title: string;
  description: string;
  target_date: string;
  is_completed: boolean;
  completed_at: string | null;
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

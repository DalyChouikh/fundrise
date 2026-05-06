export type UserRole = "founder" | "team_member" | "investor" | "admin";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  role: UserRole;
  bio: string;
  role_selected: boolean;
  onboarding_completed: boolean;
  company: string;
  job_title: string;
  linkedin_url: string;
  approval_status: "pending_approval" | "approved" | "rejected";
  rejection_reason: string;
  identity_document_url?: string | null;
  company_document_url?: string | null;
  date_of_birth?: string | null;
  id_number?: string | null;
  has_passkeys: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfileMinimal {
  id: string;
  full_name: string;
  avatar_url: string;
  role: UserRole;
}

export interface InvestorProfile {
  preferred_industries: string[];
  check_size_min: number | null;
  check_size_max: number | null;
  preferred_stage: string;
  accreditation_status: string;
  accreditation_description: string;
  created_at: string;
  updated_at: string;
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
  startup_logo_url: string;
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

export interface InvestmentCampaignDetail {
  id: number;
  title: string;
  startup: number;
  startup_name: string;
  funding_goal: string;
  current_funding: string;
  status: CampaignStatus;
}

export interface Investment {
  id: number;
  investor: string;
  investor_name: string;
  campaign: number;
  campaign_detail: InvestmentCampaignDetail;
  amount: string;
  status: InvestmentStatus;
  card_last4: string | null;
  card_type: string | null;
  created_at: string;
  updated_at: string;
}

export type CardType = "visa" | "mastercard" | "amex" | "discover";

export interface SavedPaymentInfo {
  card_holder: string;
  card_last4: string;
  card_type: CardType;
  expiry_month: number;
  expiry_year: number;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStatsFounder {
  active_campaigns: number;
  total_raised: string;
  team_members: number;
  followers: number;
}

export interface DashboardStatsInvestor {
  total_invested: string;
  active_investments: number;
  following_count: number;
  portfolio_value: string;
}

export interface DashboardStatsAdmin {
  total_users: number;
  active_startups: number;
  active_campaigns: number;
  total_invested: string;
  pending_users: number;
}

// Analytics types
export interface FounderAnalytics {
  funding_over_time: { month: string; amount: number }[];
  investments_per_period: { month: string; count: number }[];
  campaign_comparison: { title: string; raised: number; goal: number }[];
  follower_growth: { month: string; count: number }[];
}

export interface InvestorAnalytics {
  portfolio_allocation: { startup_name: string; amount: number }[];
  investment_history: { month: string; amount: number }[];
  portfolio_performance: { campaign_title: string; invested: number; current_value: number }[];
}

export interface AdminAnalytics {
  user_registrations: { month: string; count: number }[];
  platform_growth: { month: string; users: number; startups: number; campaigns: number }[];
  approval_funnel: { status: string; count: number }[];
  investment_volume: { month: string; amount: number }[];
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
  | "task_comment"
  | "user_approved"
  | "user_rejected";

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

// Kanban types
export interface KanbanTask {
  id: number;
  column: number;
  title: string;
  description: string;
  assignee: string | null;
  assignee_detail: UserProfileMinimal | null;
  order: number;
  comments_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface KanbanColumn {
  id: number;
  startup: number;
  name: string;
  order: number;
  tasks: KanbanTask[];
  created_at: string;
}

export interface TaskComment {
  id: number;
  task: number;
  author: string;
  author_name: string;
  author_avatar: string;
  content: string;
  created_at: string;
}

// Chat types
export interface ChatMessageDetail {
  id: number;
  room: number;
  sender: string;
  sender_detail: UserProfileMinimal;
  content: string;
  created_at: string;
}

export interface ChatRoom {
  id: number;
  room_type: "campaign" | "direct";
  campaign: number | null;
  campaign_title: string | null;
  participants_detail: UserProfileMinimal[];
  last_message: ChatMessageDetail | null;
  created_at: string;
}

export interface ChatMessagePage {
  count: number;
  next: string | null;
  previous: string | null;
  results: ChatMessageDetail[];
}

// Campaign Discussion types
export interface CampaignComment {
  id: number;
  campaign: number;
  author: string;
  author_detail: UserProfileMinimal;
  parent: number | null;
  content: string;
  replies: CampaignComment[];
  reply_count: number;
  created_at: string;
  updated_at: string;
}

// Invitation types
export interface StartupInvitation {
  id: string;
  email: string;
  status: "pending" | "accepted" | "cancelled";
  invited_by: UserProfileMinimal;
  created_at: string;
}

export interface InvitationPublicInfo {
  startup_name: string;
  startup_id: number;
  startup_logo_url: string;
  invited_by_name: string;
  masked_email: string;
  status: string;
}

export interface InvitationCreateResponse {
  id: string;
  email: string;
  invite_url: string;
  email_sent: boolean;
}

// Copilot types
export interface CopilotMessage {
  id: number;
  role: "user" | "assistant" | "tool";
  content: string;
  media_url?: string | null;
  media_type?: string | null;
  thinking_content?: string | null;
  thinking_duration?: number | null;
  tool_calls?: ToolCallState[];
  created_at: string;
}

export interface CopilotConversation {
  id: string;
  title: string;
  last_message: CopilotMessage | null;
  created_at: string;
  updated_at: string;
}

export interface CopilotConversationDetail {
  id: string;
  title: string;
  messages: CopilotMessage[];
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  value: string;
}

export interface QuestionDef {
  id: string;
  type: "radio" | "checkbox" | "text" | "textarea";
  label: string;
  options?: string[];
  placeholder?: string;
  required?: boolean;
}

export interface QuestionForm {
  tool_call_id: string;
  title: string;
  questions: QuestionDef[];
}

export interface ToolCallState {
  tool_call_id: string;
  tool_name: string;
  input: Record<string, unknown>;
  result?: unknown;
}

export interface AIStreamState {
  pendingUserContent: string | null;
  pendingMediaUrl: string | null;
  pendingMediaType: string | null;
  liveThinking: string;
  thinkingDuration: number | null;
  liveText: string;
  toolCalls: ToolCallState[];
  questionForm: QuestionForm | null;
  isStreaming: boolean;
  streamError: string | null;
}

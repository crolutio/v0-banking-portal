// User & Role Types
export type UserRole = "retail_customer" | "sme_customer" | "relationship_manager" | "risk_compliance" | "admin"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  rmId?: string // For customers assigned to an RM
  segment?: "VIP" | "Premium" | "Standard" | "At Risk"
  kycStatus?: "Verified" | "Pending" | "Review Required"
  createdAt: string
}

// Account Types
export type AccountType = "current" | "savings" | "business" | "fx_wallet"

export interface Account {
  id: string
  userId: string
  name: string
  type: AccountType
  currency: string
  balance: number
  availableBalance: number
  accountNumber: string
  iban?: string
  status: "active" | "frozen" | "closed"
}

// Transaction Types
export type TransactionCategory =
  | "groceries"
  | "restaurants"
  | "shopping"
  | "entertainment"
  | "utilities"
  | "transport"
  | "healthcare"
  | "travel"
  | "transfer"
  | "salary"
  | "investment"
  | "fees"
  | "subscriptions"
  | "other"

export type TransactionCategorySource = "seed" | "auto_rule" | "manual" | "ai"

export interface Transaction {
  id: string
  accountId: string
  date: string
  description: string
  merchant?: string
  category: TransactionCategory
  categorySource?: TransactionCategorySource
  categoryConfidence?: number
  categoryReason?: string
  isUnusual?: boolean
  unusualReason?: string
  amount: number
  balance: number
  type: "credit" | "debit"
  status: "completed" | "pending" | "failed"
  reference?: string
}

// Card Types
export type CardType = "debit" | "credit" | "virtual"

export interface Card {
  id: string
  userId: string
  accountId: string
  type: CardType
  brand: "Visa" | "Mastercard"
  lastFour: string
  expiryDate: string
  status: "active" | "frozen" | "expired" | "cancelled"
  limit?: number
  spent?: number
  cardholderName: string
}

// Loan Types
export type LoanType = "personal" | "mortgage" | "auto" | "business" | "credit_line"

export interface LoanOffer {
  id: string
  type: LoanType
  name: string
  minAmount: number
  maxAmount: number
  minTerm: number
  maxTerm: number
  interestRate: number
  apr: number
  features: string[]
}

export interface Loan {
  id: string
  userId: string
  type: LoanType
  amount: number
  remainingBalance: number
  interestRate: number
  term: number
  monthlyPayment: number
  nextPaymentDate: string
  status: "active" | "paid_off" | "delinquent"
}

// Investment Types
export interface PortfolioHolding {
  id: string
  userId: string
  symbol: string
  name: string
  type: "stock" | "bond" | "etf" | "mutual_fund" | "crypto"
  quantity: number
  avgCost: number
  currentPrice: number
  value: number
  gain: number
  gainPercent: number
}

export interface RiskProfile {
  userId: string
  score: number
  category: "Conservative" | "Moderate" | "Aggressive"
  lastUpdated: string
}

// Policy & Document Types
export interface Policy {
  id: string
  title: string
  version: string
  category: "fees" | "disputes" | "cards" | "privacy" | "kyc" | "lending" | "complaints" | "general"
  content: string
  effectiveDate: string
}

export interface ProductTerms {
  id: string
  productType: string
  title: string
  version: string
  content: string
  effectiveDate: string
}

// Risk & Compliance Types
export type AlertSeverity = "low" | "medium" | "high" | "critical"
export type AlertType = "aml" | "kyc" | "fraud" | "policy_breach" | "unusual_activity"

export interface RiskAlert {
  id: string
  userId?: string
  type: AlertType
  severity: AlertSeverity
  title: string
  description: string
  status: "open" | "investigating" | "resolved" | "escalated"
  createdAt: string
  assignedTo?: string
  evidence?: string[]
}

// Audit Log Types
export interface AuditEvent {
  id: string
  userId: string
  userRole: UserRole
  action: string
  actionType: "ai_response" | "transfer" | "dispute" | "loan_application" | "card_action" | "policy_change" | "login"
  sourcesAccessed: string[]
  timestamp: string
  redactions: string[]
  riskFlags: string[]
  details: string
  aiSuggestion?: string
  userConfirmed?: boolean
}

// AI Response Types
export interface Citation {
  id: string
  source: string
  type: "account_ledger" | "policy" | "product_terms" | "transaction_history" | "crm_notes" | "risk_rules"
  excerpt?: string
}

export interface AIResponse {
  id: string
  message: string
  citations: Citation[]
  dataUsed: string[]
  confidence: "high" | "medium" | "low"
  actions?: AIAction[]
  requiresEscalation?: boolean
  piiMasked?: boolean
}

export interface AIAction {
  id: string
  type:
    | "create_transfer"
    | "dispute_charge"
    | "freeze_card"
    | "start_loan_application"
    | "schedule_meeting"
    | "negotiate_bill"
    | "simulate_purchase"
  label: string
  data?: Record<string, unknown>
}

// RM Workspace Types
export interface ClientInteraction {
  id: string
  clientId: string
  rmId: string
  type: "call" | "email" | "meeting" | "note"
  summary: string
  date: string
}

export interface NextBestAction {
  id: string
  clientId: string
  action: string
  reason: string
  priority: "high" | "medium" | "low"
  product?: string
}

// Support Types
export interface SupportTicket {
  id: string
  userId: string
  subject: string
  status: "open" | "in_progress" | "resolved" | "closed"
  priority: "low" | "medium" | "high"
  createdAt: string
  messages: SupportMessage[]
}

export interface SupportMessage {
  id: string
  sender: "user" | "agent" | "ai"
  content: string
  timestamp: string
  citations?: Citation[]
}

// Database Types for Support Conversations
export type DbConversation = {
  id: string;
  customer_id: string;
  subject: string | null;
  channel: string;
  status: string;
  priority: string;
  assigned_agent_id: string | null;
  last_message: string | null;
  created_at: string;
  updated_at: string;
};

export type DbMessage = {
  id: string;
  conversation_id: string;
  sender_type: "customer" | "agent";
  sender_customer_id: string | null;
  sender_agent_id: string | null;
  content: string;
  is_internal: boolean;
  created_at: string;
};

// Savings Goal Types
export type SavingsGoalCategory =
  | "travel"
  | "shopping"
  | "home"
  | "education"
  | "emergency"
  | "vehicle"
  | "wedding"
  | "retirement"
  | "other"

export interface SavingsGoal {
  id: string
  userId: string
  name: string
  category: SavingsGoalCategory
  targetAmount: number
  currentAmount: number
  currency: string
  targetDate: string
  monthlyContribution: number
  autoDebit: boolean
  sourceAccountId: string
  status: "active" | "paused" | "completed" | "cancelled"
  createdAt: string
  image?: string
}

export interface SavingsGoalTransaction {
  id: string
  goalId: string
  amount: number
  type: "deposit" | "withdrawal"
  date: string
  description: string
}

// Reward Types
export interface RewardProfile {
  userId: string
  totalPoints: number
  lifetimePoints: number
  tier: "Bronze" | "Silver" | "Gold" | "Platinum"
  nextTierProgress: number
}

export type RewardCategory = "purchase" | "referral" | "login_streak" | "account_opening" | "marketplace_bonus" | "gift_card" | "travel" | "cashback" | "charity" | "gadget"

export interface RewardItem {
  id: string
  name: string
  description: string
  pointsCost: number
  category: RewardCategory
  imageUrl: string
  isFeatured: boolean
  stockQuantity?: number
}

export interface RewardActivity {
  id: string
  userId: string
  amount: number
  type: "earned" | "redeemed" | "expired" | "adjusted"
  category: RewardCategory
  description: string
  createdAt: string
}

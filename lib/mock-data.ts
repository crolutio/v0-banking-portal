import type {
  User,
  Account,
  Transaction,
  Card,
  LoanOffer,
  Loan,
  PortfolioHolding,
  Policy,
  ProductTerms,
  RiskAlert,
  AuditEvent,
  ClientInteraction,
  NextBestAction,
  SupportTicket,
  SavingsGoal,
  SavingsGoalTransaction,
} from "./types"

// Users
export const users: User[] = [
  {
    id: "4e140685-8f38-49ff-aae0-d6109c46873d",
    name: "Sarah Chen",
    email: "sarah.chen@email.com",
    role: "retail_customer",
    avatar: "/professional-woman-portrait.png",
    rmId: "51880b1d-3935-49dd-bac6-9469d33d3ee3",
    segment: "Premium",
    kycStatus: "Verified",
    createdAt: "2022-03-15",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Mohammed Ali",
    email: "mohammed.ali@email.com",
    role: "retail_customer",
    avatar: "/professional-man-portrait.png",
    rmId: "51880b1d-3935-49dd-bac6-9469d33d3ee3",
    segment: "Premium",
    kycStatus: "Verified",
    createdAt: "2021-08-22",
  },
  {
    id: "e9c42918-fad4-422f-b4ba-24bb5943bb67",
    name: "Fatima Hassan",
    email: "fatima.hassan@email.com",
    role: "sme_customer",
    avatar: "/professional-woman-portrait.png",
    rmId: "77777777-7777-7777-7777-777777777777",
    segment: "Premium",
    kycStatus: "Pending",
    createdAt: "2023-01-10",
  },
  {
    id: "51880b1d-3935-49dd-bac6-9469d33d3ee3",
    name: "James Rodriguez",
    email: "james.rm@bank.com",
    role: "relationship_manager",
    avatar: "/professional-banker-portrait.jpg",
    createdAt: "2020-06-01",
  },
  {
    id: "2be06428-7933-41f5-a426-f27478e75c1c",
    name: "David Kim",
    email: "david.risk@bank.com",
    role: "risk_compliance",
    avatar: "/professional-woman-compliance.jpg",
    createdAt: "2019-11-15",
  },
  {
    id: "730b0c66-1feb-432a-9718-e3a9755eea7b",
    name: "System Administrator",
    email: "admin@bank.com",
    role: "admin",
    avatar: "/professional-admin-portrait.png",
    createdAt: "2018-04-20",
  },
]

// Accounts
export const accounts: Account[] = [
  {
    id: "acc_1",
    userId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    name: "Primary Current Account",
    type: "current",
    currency: "AED",
    balance: 45750.5,
    availableBalance: 45250.5,
    accountNumber: "1234567890",
    iban: "AE070331234567890123456",
    status: "active",
  },
  {
    id: "acc_2",
    userId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    name: "Savings Account",
    type: "savings",
    currency: "AED",
    balance: 125000.0,
    availableBalance: 125000.0,
    accountNumber: "1234567891",
    iban: "AE070331234567891123456",
    status: "active",
  },
  {
    id: "acc_3",
    userId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    name: "USD Wallet",
    type: "fx_wallet",
    currency: "USD",
    balance: 5200.0,
    availableBalance: 5200.0,
    accountNumber: "1234567892",
    status: "active",
  },
  {
    id: "acc_4",
    userId: "22222222-2222-2222-2222-222222222222",
    name: "VIP Current Account",
    type: "current",
    currency: "AED",
    balance: 892450.75,
    availableBalance: 890450.75,
    accountNumber: "2345678901",
    iban: "AE070332345678901234567",
    status: "active",
  },
  {
    id: "acc_5",
    userId: "22222222-2222-2222-2222-222222222222",
    name: "Investment Savings",
    type: "savings",
    currency: "AED",
    balance: 2500000.0,
    availableBalance: 2500000.0,
    accountNumber: "2345678902",
    status: "active",
  },
  {
    id: "acc_6",
    userId: "e9c42918-fad4-422f-b4ba-24bb5943bb67",
    name: "Business Operating Account",
    type: "business",
    currency: "AED",
    balance: 567890.25,
    availableBalance: 520890.25,
    accountNumber: "3456789012",
    iban: "AE070333456789012345678",
    status: "active",
  },
  {
    id: "acc_7",
    userId: "e9c42918-fad4-422f-b4ba-24bb5943bb67",
    name: "Business Savings",
    type: "savings",
    currency: "AED",
    balance: 1250000.0,
    availableBalance: 1250000.0,
    accountNumber: "3456789013",
    status: "active",
  },
]

// Transactions (sample - 100 transactions)
const categories: Transaction["category"][] = [
  "groceries",
  "restaurants",
  "shopping",
  "entertainment",
  "utilities",
  "transport",
  "healthcare",
  "travel",
  "transfer",
  "salary",
  "fees",
  "other",
]

const merchants: Record<string, string[]> = {
  groceries: ["Carrefour", "Spinneys", "Lulu Hypermarket", "Waitrose"],
  restaurants: ["Zuma Dubai", "La Petite Maison", "Nobu", "Catch"],
  shopping: ["Dubai Mall", "Harvey Nichols", "Bloomingdales", "Amazon UAE"],
  entertainment: ["VOX Cinemas", "Spotify", "Netflix", "Apple Music"],
  utilities: ["DEWA", "Etisalat", "Du", "Empower"],
  transport: ["Uber", "Careem", "RTA", "Emirates Airlines"],
  healthcare: ["Mediclinic", "American Hospital", "Aster Clinic"],
  travel: ["Booking.com", "Emirates", "Marriott", "Hilton"],
}

function generateTransactions(accountId: string, count: number, startBalance: number): Transaction[] {
  const txns: Transaction[] = []
  let balance = startBalance
  const now = new Date()

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 90)
    const date = new Date(now)
    date.setDate(date.getDate() - daysAgo)

    const isCredit = Math.random() > 0.7
    const category = isCredit
      ? Math.random() > 0.5
        ? "salary"
        : "transfer"
      : categories[Math.floor(Math.random() * (categories.length - 3))]

    const amount = isCredit ? Math.floor(Math.random() * 50000) + 5000 : Math.floor(Math.random() * 5000) + 50

    balance = isCredit ? balance + amount : balance - amount

    const merchantList = merchants[category] || ["Bank of the Future"]
    const merchant = merchantList[Math.floor(Math.random() * merchantList.length)]

    txns.push({
      id: `txn_${accountId}_${i}`,
      accountId,
      date: date.toISOString().split("T")[0],
      description: isCredit
        ? category === "salary"
          ? "Monthly Salary"
          : `Transfer from ${merchant}`
        : `Payment to ${merchant}`,
      merchant,
      category,
      amount,
      balance,
      type: isCredit ? "credit" : "debit",
      status: Math.random() > 0.05 ? "completed" : "pending",
      reference: `REF${Date.now()}${i}`,
    })
  }

  return txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export const transactions: Transaction[] = [
  ...generateTransactions("acc_1", 35, 45750.5),
  ...generateTransactions("acc_4", 40, 892450.75),
  ...generateTransactions("acc_6", 25, 567890.25),
]

// Cards
export const cards: Card[] = [
  {
    id: "card_1",
    userId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    accountId: "acc_1",
    type: "debit",
    brand: "Visa",
    lastFour: "4532",
    expiryDate: "12/27",
    status: "active",
    cardholderName: "SARAH JOHNSON",
  },
  {
    id: "card_2",
    userId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    accountId: "acc_1",
    type: "credit",
    brand: "Mastercard",
    lastFour: "8901",
    expiryDate: "06/28",
    status: "active",
    limit: 50000,
    spent: 12450,
    cardholderName: "SARAH JOHNSON",
  },
  {
    id: "card_3",
    userId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    accountId: "acc_1",
    type: "virtual",
    brand: "Visa",
    lastFour: "2211",
    expiryDate: "03/26",
    status: "active",
    limit: 10000,
    spent: 3200,
    cardholderName: "SARAH JOHNSON",
  },
  {
    id: "card_4",
    userId: "22222222-2222-2222-2222-222222222222",
    accountId: "acc_4",
    type: "credit",
    brand: "Visa",
    lastFour: "7788",
    expiryDate: "09/28",
    status: "active",
    limit: 250000,
    spent: 45000,
    cardholderName: "MICHAEL CHEN",
  },
  {
    id: "card_5",
    userId: "e9c42918-fad4-422f-b4ba-24bb5943bb67",
    accountId: "acc_6",
    type: "debit",
    brand: "Mastercard",
    lastFour: "3344",
    expiryDate: "11/27",
    status: "active",
    cardholderName: "TECHSTART SOLUTIONS",
  },
]

// Loan Offers
export const loanOffers: LoanOffer[] = [
  {
    id: "offer_1",
    type: "personal",
    name: "Personal Loan",
    minAmount: 5000,
    maxAmount: 500000,
    minTerm: 12,
    maxTerm: 60,
    interestRate: 5.99,
    apr: 6.49,
    features: ["No processing fees", "Flexible repayment", "Quick approval"],
  },
  {
    id: "offer_2",
    type: "mortgage",
    name: "Home Loan",
    minAmount: 500000,
    maxAmount: 10000000,
    minTerm: 60,
    maxTerm: 300,
    interestRate: 3.49,
    apr: 3.89,
    features: ["Up to 80% LTV", "Fixed rate options", "Free property valuation"],
  },
  {
    id: "offer_3",
    type: "auto",
    name: "Auto Loan",
    minAmount: 25000,
    maxAmount: 1000000,
    minTerm: 12,
    maxTerm: 60,
    interestRate: 2.99,
    apr: 3.29,
    features: ["Same day approval", "No down payment option", "Insurance included"],
  },
  {
    id: "offer_4",
    type: "credit_line",
    name: "SME Credit Line",
    minAmount: 50000,
    maxAmount: 2000000,
    minTerm: 12,
    maxTerm: 36,
    interestRate: 7.99,
    apr: 8.49,
    features: ["Revolving credit", "Draw as needed", "Business growth support"],
  },
]

// Active Loans
export const loans: Loan[] = [
  {
    id: "loan_1",
    userId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    type: "personal",
    amount: 50000,
    remainingBalance: 32500,
    interestRate: 5.99,
    term: 36,
    monthlyPayment: 1521.25,
    nextPaymentDate: "2025-01-15",
    status: "active",
  },
  {
    id: "loan_2",
    userId: "22222222-2222-2222-2222-222222222222",
    type: "mortgage",
    amount: 2500000,
    remainingBalance: 2150000,
    interestRate: 3.49,
    term: 240,
    monthlyPayment: 14875.5,
    nextPaymentDate: "2025-01-01",
    status: "active",
  },
  {
    id: "loan_3",
    userId: "e9c42918-fad4-422f-b4ba-24bb5943bb67",
    type: "credit_line",
    amount: 500000,
    remainingBalance: 325000,
    interestRate: 7.99,
    term: 24,
    monthlyPayment: 22650.0,
    nextPaymentDate: "2025-01-10",
    status: "active",
  },
]

// Portfolio Holdings
export const portfolioHoldings: PortfolioHolding[] = [
  {
    id: "hold_1",
    userId: "22222222-2222-2222-2222-222222222222",
    symbol: "AAPL",
    name: "Apple Inc.",
    type: "stock",
    quantity: 150,
    avgCost: 165.5,
    currentPrice: 195.25,
    value: 29287.5,
    gain: 4462.5,
    gainPercent: 17.98,
  },
  {
    id: "hold_2",
    userId: "22222222-2222-2222-2222-222222222222",
    symbol: "MSFT",
    name: "Microsoft Corporation",
    type: "stock",
    quantity: 100,
    avgCost: 320.0,
    currentPrice: 378.5,
    value: 37850.0,
    gain: 5850.0,
    gainPercent: 18.28,
  },
  {
    id: "hold_3",
    userId: "22222222-2222-2222-2222-222222222222",
    symbol: "VTI",
    name: "Vanguard Total Stock Market ETF",
    type: "etf",
    quantity: 200,
    avgCost: 215.0,
    currentPrice: 248.75,
    value: 49750.0,
    gain: 6750.0,
    gainPercent: 15.7,
  },
  {
    id: "hold_4",
    userId: "22222222-2222-2222-2222-222222222222",
    symbol: "BND",
    name: "Vanguard Total Bond Market ETF",
    type: "bond",
    quantity: 300,
    avgCost: 72.5,
    currentPrice: 74.25,
    value: 22275.0,
    gain: 525.0,
    gainPercent: 2.41,
  },
]

// Policies
export const policies: Policy[] = [
  {
    id: "policy_1",
    title: "Account Fees and Charges",
    version: "2.1",
    category: "fees",
    content: `Monthly maintenance fee: AED 25 (waived with minimum balance of AED 5,000).
    ATM withdrawal: Free for in-network, AED 5 for out-of-network.
    International transfer fee: 0.5% of amount (min AED 25, max AED 500).
    Currency conversion: 2.5% markup on interbank rate.`,
    effectiveDate: "2024-01-01",
  },
  {
    id: "policy_2",
    title: "Transaction Dispute Policy",
    version: "1.3",
    category: "disputes",
    content: `Disputes must be raised within 60 days of transaction.
    Provisional credit issued within 10 business days for eligible disputes.
    Investigation completed within 45 days.
    Customer must provide supporting documentation.`,
    effectiveDate: "2024-03-15",
  },
  {
    id: "policy_3",
    title: "Card Terms and Conditions",
    version: "3.0",
    category: "cards",
    content: `Daily transaction limit: AED 50,000 (can be increased upon request).
    Cash advance fee: 3% of amount (min AED 100).
    Late payment fee: AED 200 or 3% of minimum due.
    Card replacement fee: AED 50 for standard, free for premium.`,
    effectiveDate: "2024-02-01",
  },
  {
    id: "policy_4",
    title: "Privacy and Data Protection",
    version: "2.0",
    category: "privacy",
    content: `Customer data is encrypted and stored securely.
    Data shared only with consent or legal requirement.
    Right to access, correct, and delete personal data.
    Data retention: 7 years after account closure.`,
    effectiveDate: "2024-01-01",
  },
  {
    id: "policy_5",
    title: "KYC and AML Policy",
    version: "4.2",
    category: "kyc",
    content: `Identity verification required for all accounts.
    Enhanced due diligence for high-risk customers.
    Suspicious activity reported to authorities.
    Periodic review of customer information.`,
    effectiveDate: "2024-04-01",
  },
  {
    id: "policy_6",
    title: "Lending and Credit Policy",
    version: "2.5",
    category: "lending",
    content: `Affordability assessment required for all loans.
    Maximum debt-to-income ratio: 50%.
    Cooling-off period: 5 business days for personal loans.
    Early repayment: No penalty for personal loans.`,
    effectiveDate: "2024-01-15",
  },
  {
    id: "policy_7",
    title: "Complaints Handling Procedure",
    version: "1.1",
    category: "complaints",
    content: `Acknowledgment within 2 business days.
    Resolution within 15 business days.
    Escalation to ombudsman if unresolved.
    Regular reporting to senior management.`,
    effectiveDate: "2024-02-01",
  },
  {
    id: "policy_8",
    title: "General Terms of Service",
    version: "5.0",
    category: "general",
    content: `Account holders must be 18+ years.
    One primary account per customer.
    Bank reserves right to close accounts with notice.
    Governing law: UAE Federal Law.`,
    effectiveDate: "2024-01-01",
  },
]

// Product Terms
export const productTerms: ProductTerms[] = [
  {
    id: "terms_1",
    productType: "Current Account",
    title: "Current Account Terms",
    version: "2.0",
    content: "Minimum opening balance: AED 3,000. Free online banking. Overdraft available upon request.",
    effectiveDate: "2024-01-01",
  },
  {
    id: "terms_2",
    productType: "Savings Account",
    title: "Savings Account Terms",
    version: "1.5",
    content: "Interest rate: 3.5% p.a. for balances above AED 50,000. Monthly interest credit. No minimum balance.",
    effectiveDate: "2024-01-01",
  },
  {
    id: "terms_3",
    productType: "Credit Card",
    title: "Premium Credit Card Terms",
    version: "3.0",
    content:
      "Annual fee: AED 500 (waived first year). Reward points: 1 point per AED 5 spent. Airport lounge access: 4 visits/year.",
    effectiveDate: "2024-02-01",
  },
  {
    id: "terms_4",
    productType: "Personal Loan",
    title: "Personal Loan Terms",
    version: "2.2",
    content: "Fixed interest rate for loan term. No prepayment penalty. Insurance optional but recommended.",
    effectiveDate: "2024-03-01",
  },
  {
    id: "terms_5",
    productType: "Mortgage",
    title: "Home Loan Terms",
    version: "4.0",
    content:
      "LTV up to 80% for UAE nationals, 75% for expats. Property insurance mandatory. Early settlement: 1% of outstanding.",
    effectiveDate: "2024-01-15",
  },
]

// Risk Alerts
export const riskAlerts: RiskAlert[] = [
  {
    id: "alert_1",
    userId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    type: "unusual_activity",
    severity: "medium",
    title: "Unusual spending pattern detected",
    description: "Multiple high-value transactions in different countries within 24 hours",
    status: "investigating",
    createdAt: "2024-12-18T14:30:00Z",
    assignedTo: "2be06428-7933-41f5-a426-f27478e75c1c",
  },
  {
    id: "alert_2",
    userId: "e9c42918-fad4-422f-b4ba-24bb5943bb67",
    type: "aml",
    severity: "high",
    title: "Large cash deposits flagged",
    description: "Multiple cash deposits exceeding threshold within 7 days",
    status: "open",
    createdAt: "2024-12-17T09:15:00Z",
  },
  {
    id: "alert_3",
    type: "policy_breach",
    severity: "low",
    title: "Expired KYC document",
    description: "Customer passport expired, renewal required",
    status: "open",
    createdAt: "2024-12-16T11:00:00Z",
  },
  {
    id: "alert_4",
    userId: "22222222-2222-2222-2222-222222222222",
    type: "fraud",
    severity: "critical",
    title: "Potential account takeover attempt",
    description: "Multiple failed login attempts followed by password reset from new device",
    status: "escalated",
    createdAt: "2024-12-15T16:45:00Z",
    assignedTo: "2be06428-7933-41f5-a426-f27478e75c1c",
  },
  {
    id: "alert_5",
    type: "kyc",
    severity: "medium",
    title: "Incomplete enhanced due diligence",
    description: "High-value customer missing source of wealth documentation",
    status: "open",
    createdAt: "2024-12-14T10:30:00Z",
  },
  {
    id: "alert_6",
    userId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    type: "unusual_activity",
    severity: "low",
    title: "First international transfer",
    description: "Customer made first international transfer to new beneficiary",
    status: "resolved",
    createdAt: "2024-12-13T14:20:00Z",
  },
  {
    id: "alert_7",
    type: "aml",
    severity: "high",
    title: "Sanctions screening match",
    description: "Beneficiary name matches sanctions list entry - requires review",
    status: "investigating",
    createdAt: "2024-12-12T08:00:00Z",
    assignedTo: "2be06428-7933-41f5-a426-f27478e75c1c",
  },
  {
    id: "alert_8",
    userId: "e9c42918-fad4-422f-b4ba-24bb5943bb67",
    type: "fraud",
    severity: "medium",
    title: "Unusual payroll pattern",
    description: "Payroll amount significantly higher than historical average",
    status: "open",
    createdAt: "2024-12-11T12:15:00Z",
  },
  {
    id: "alert_9",
    type: "policy_breach",
    severity: "low",
    title: "Credit limit override",
    description: "RM approved credit limit above standard threshold",
    status: "resolved",
    createdAt: "2024-12-10T15:30:00Z",
  },
  {
    id: "alert_10",
    userId: "22222222-2222-2222-2222-222222222222",
    type: "unusual_activity",
    severity: "medium",
    title: "Dormant account reactivation",
    description: "Account dormant for 6 months, large withdrawal requested",
    status: "investigating",
    createdAt: "2024-12-09T09:45:00Z",
  },
  {
    id: "alert_11",
    type: "kyc",
    severity: "high",
    title: "PEP identification",
    description: "Customer identified as Politically Exposed Person - enhanced monitoring required",
    status: "open",
    createdAt: "2024-12-08T11:00:00Z",
  },
  {
    id: "alert_12",
    type: "aml",
    severity: "critical",
    title: "Structuring detected",
    description: "Multiple transactions just below reporting threshold",
    status: "escalated",
    createdAt: "2024-12-07T14:00:00Z",
    assignedTo: "2be06428-7933-41f5-a426-f27478e75c1c",
  },
]

// Audit Events
export const auditEvents: AuditEvent[] = [
  {
    id: "audit_1",
    userId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    userRole: "retail_customer",
    action: "AI query: Account balance inquiry",
    actionType: "ai_response",
    sourcesAccessed: ["Account ledger", "Transaction history"],
    timestamp: "2024-12-18T10:30:00Z",
    redactions: [],
    riskFlags: [],
    details: "Customer asked about current balance and recent transactions",
    aiSuggestion: "Your current balance is AED 45,750.50",
    userConfirmed: true,
  },
  {
    id: "audit_2",
    userId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    userRole: "retail_customer",
    action: "Transfer initiated",
    actionType: "transfer",
    sourcesAccessed: ["Account ledger", "Beneficiary list"],
    timestamp: "2024-12-18T11:15:00Z",
    redactions: ["Beneficiary IBAN (partial)"],
    riskFlags: [],
    details: "Internal transfer AED 5,000 to savings account",
    userConfirmed: true,
  },
  {
    id: "audit_3",
    userId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    userRole: "retail_customer",
    action: "Dispute filed",
    actionType: "dispute",
    sourcesAccessed: ["Transaction history", "Dispute policy v1.3"],
    timestamp: "2024-12-17T14:00:00Z",
    redactions: [],
    riskFlags: [],
    details: "Disputed transaction at merchant XYZ for AED 350",
    aiSuggestion: "Based on dispute policy, provisional credit will be issued within 10 business days",
    userConfirmed: true,
  },
  {
    id: "audit_4",
    userId: "51880b1d-3935-49dd-bac6-9469d33d3ee3",
    userRole: "relationship_manager",
    action: "AI query: Client portfolio summary",
    actionType: "ai_response",
    sourcesAccessed: ["CRM notes", "Product holdings", "Transaction history"],
    timestamp: "2024-12-17T09:00:00Z",
    redactions: ["Account numbers"],
    riskFlags: [],
    details: "RM requested meeting prep summary for VIP client",
    userConfirmed: true,
  },
  {
    id: "audit_5",
    userId: "22222222-2222-2222-2222-222222222222",
    userRole: "retail_customer",
    action: "Loan application started",
    actionType: "loan_application",
    sourcesAccessed: ["Lending policy v2.5", "Product terms"],
    timestamp: "2024-12-16T16:30:00Z",
    redactions: ["Income details"],
    riskFlags: ["High debt-to-income ratio warning"],
    details: "Personal loan application for AED 100,000",
    aiSuggestion: "Based on your income, maximum recommended loan is AED 75,000",
    userConfirmed: false,
  },
  {
    id: "audit_6",
    userId: "2be06428-7933-41f5-a426-f27478e75c1c",
    userRole: "risk_compliance",
    action: "Alert investigation",
    actionType: "ai_response",
    sourcesAccessed: ["Risk rules", "Transaction history", "KYC documents"],
    timestamp: "2024-12-16T10:00:00Z",
    redactions: [],
    riskFlags: ["AML flag - under investigation"],
    details: "Investigated unusual activity alert for customer",
    userConfirmed: true,
  },
  {
    id: "audit_7",
    userId: "730b0c66-1feb-432a-9718-e3a9755eea7b",
    userRole: "admin",
    action: "Policy update",
    actionType: "policy_change",
    sourcesAccessed: ["Policy studio"],
    timestamp: "2024-12-15T14:00:00Z",
    redactions: [],
    riskFlags: [],
    details: "Updated dispute policy from v1.2 to v1.3",
    userConfirmed: true,
  },
  {
    id: "audit_8",
    userId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    userRole: "retail_customer",
    action: "Card frozen",
    actionType: "card_action",
    sourcesAccessed: ["Card management"],
    timestamp: "2024-12-15T08:30:00Z",
    redactions: ["Card number (partial)"],
    riskFlags: [],
    details: "Customer froze debit card via mobile app",
    userConfirmed: true,
  },
  {
    id: "audit_9",
    userId: "e9c42918-fad4-422f-b4ba-24bb5943bb67",
    userRole: "sme_customer",
    action: "AI query: Fee explanation",
    actionType: "ai_response",
    sourcesAccessed: ["Fees policy v2.1", "Transaction history"],
    timestamp: "2024-12-14T11:00:00Z",
    redactions: [],
    riskFlags: [],
    details: "Customer asked about international transfer fees",
    aiSuggestion: "International transfer fee is 0.5% of amount (min AED 25, max AED 500)",
    userConfirmed: true,
  },
  {
    id: "audit_10",
    userId: "51880b1d-3935-49dd-bac6-9469d33d3ee3",
    userRole: "relationship_manager",
    action: "Client meeting logged",
    actionType: "ai_response",
    sourcesAccessed: ["CRM notes"],
    timestamp: "2024-12-13T15:00:00Z",
    redactions: [],
    riskFlags: [],
    details: "Quarterly review meeting with VIP client",
    userConfirmed: true,
  },
  {
    id: "audit_11",
    userId: "730b0c66-1feb-432a-9718-e3a9755eea7b",
    userRole: "admin",
    action: "Permission change",
    actionType: "policy_change",
    sourcesAccessed: ["RBAC matrix"],
    timestamp: "2024-12-12T09:00:00Z",
    redactions: [],
    riskFlags: ["Permission escalation"],
    details: "Added new RM to VIP client access group",
    userConfirmed: true,
  },
  {
    id: "audit_12",
    userId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    userRole: "retail_customer",
    action: "Login",
    actionType: "login",
    sourcesAccessed: [],
    timestamp: "2024-12-18T10:25:00Z",
    redactions: [],
    riskFlags: [],
    details: "Successful login from mobile app",
    userConfirmed: true,
  },
  {
    id: "audit_13",
    userId: "22222222-2222-2222-2222-222222222222",
    userRole: "retail_customer",
    action: "AI query: Investment explanation",
    actionType: "ai_response",
    sourcesAccessed: ["Portfolio holdings", "Product terms"],
    timestamp: "2024-12-11T14:30:00Z",
    redactions: [],
    riskFlags: [],
    details: "Customer asked about portfolio allocation",
    aiSuggestion: "Your portfolio is 75% equities, 25% bonds. This aligns with your Moderate risk profile.",
    userConfirmed: true,
  },
  {
    id: "audit_14",
    userId: "2be06428-7933-41f5-a426-f27478e75c1c",
    userRole: "risk_compliance",
    action: "Case resolved",
    actionType: "ai_response",
    sourcesAccessed: ["Risk rules", "Case management"],
    timestamp: "2024-12-10T16:00:00Z",
    redactions: [],
    riskFlags: [],
    details: "Closed false positive AML alert",
    userConfirmed: true,
  },
  {
    id: "audit_15",
    userId: "e9c42918-fad4-422f-b4ba-24bb5943bb67",
    userRole: "sme_customer",
    action: "Bulk payment initiated",
    actionType: "transfer",
    sourcesAccessed: ["Account ledger", "Beneficiary list"],
    timestamp: "2024-12-09T10:00:00Z",
    redactions: ["Employee details"],
    riskFlags: [],
    details: "Monthly payroll processed - 15 payments totaling AED 125,000",
    userConfirmed: true,
  },
]

// Client Interactions (for RM)
export const clientInteractions: ClientInteraction[] = [
  {
    id: "interaction_1",
    clientId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    rmId: "51880b1d-3935-49dd-bac6-9469d33d3ee3",
    type: "meeting",
    summary: "Quarterly portfolio review. Discussed investment options and savings goals.",
    date: "2024-12-10T10:00:00Z",
  },
  {
    id: "interaction_2",
    clientId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    rmId: "51880b1d-3935-49dd-bac6-9469d33d3ee3",
    type: "call",
    summary: "Follow-up on loan application status. Customer satisfied with progress.",
    date: "2024-12-15T14:30:00Z",
  },
  {
    id: "interaction_3",
    clientId: "user_retail_2",
    rmId: "51880b1d-3935-49dd-bac6-9469d33d3ee3",
    type: "email",
    summary: "Sent VIP benefits summary and exclusive investment opportunities.",
    date: "2024-12-12T09:00:00Z",
  },
  {
    id: "interaction_4",
    clientId: "user_retail_2",
    rmId: "51880b1d-3935-49dd-bac6-9469d33d3ee3",
    type: "meeting",
    summary: "Wealth planning session. Discussed estate planning and trust services.",
    date: "2024-12-05T11:00:00Z",
  },
  {
    id: "interaction_5",
    clientId: "e9c42918-fad4-422f-b4ba-24bb5943bb67",
    rmId: "51880b1d-3935-49dd-bac6-9469d33d3ee3",
    type: "call",
    summary: "Discussed credit line increase for business expansion.",
    date: "2024-12-08T16:00:00Z",
  },
]

// Next Best Actions (for RM)
export const nextBestActions: NextBestAction[] = [
  {
    id: "nba_1",
    clientId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    action: "Offer premium credit card upgrade",
    reason: "High spending pattern qualifies for Platinum card benefits",
    priority: "high",
    product: "Platinum Credit Card",
  },
  {
    id: "nba_2",
    clientId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    action: "Schedule savings goal review",
    reason: "Approaching target date for travel savings goal",
    priority: "medium",
  },
  {
    id: "nba_3",
    clientId: "user_retail_2",
    action: "Present structured investment products",
    reason: "Large cash balance in savings could be optimized",
    priority: "high",
    product: "Structured Notes",
  },
  {
    id: "nba_4",
    clientId: "user_retail_2",
    action: "Renew mortgage discussion",
    reason: "Mortgage rate renewal in 3 months",
    priority: "high",
    product: "Home Loan",
  },
  {
    id: "nba_5",
    clientId: "e9c42918-fad4-422f-b4ba-24bb5943bb67",
    action: "Propose business insurance",
    reason: "Growing business with no liability coverage",
    priority: "medium",
    product: "Business Insurance",
  },
]

// Support Tickets
export const supportTickets: SupportTicket[] = [
  {
    id: "ticket_1",
    userId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    subject: "International transfer pending review",
    status: "open",
    priority: "high",
    createdAt: "2024-12-20T09:10:00Z",
    messages: [
      {
        id: "msg_1",
        sender: "user",
        content: "My international transfer is pending for 3 days. It says compliance review.",
        timestamp: "2024-12-20T09:10:00Z",
      },
      {
        id: "msg_2",
        sender: "ai",
        content:
          "Transfers over AED 50,000 are reviewed for sanctions screening. I have flagged this for expedited review.",
        timestamp: "2024-12-20T09:12:00Z",
        citations: [{ id: "cite_1", source: "International Transfer Guidelines", type: "policy" }],
      },
      {
        id: "msg_3",
        sender: "agent",
        content: "We are reviewing beneficiary details and will update you today.",
        timestamp: "2024-12-20T10:30:00Z",
      },
    ],
  },
  {
    id: "ticket_2",
    userId: "22222222-2222-2222-2222-222222222222",
    subject: "Business account statement for visa",
    status: "in_progress",
    priority: "medium",
    createdAt: "2024-12-17T08:40:00Z",
    messages: [
      {
        id: "msg_4",
        sender: "user",
        content: "Need official statements for the last 6 months for visa processing.",
        timestamp: "2024-12-17T08:40:00Z",
      },
      {
        id: "msg_5",
        sender: "agent",
        content: "We will email stamped statements within 24 hours.",
        timestamp: "2024-12-17T12:15:00Z",
      },
    ],
  },
  {
    id: "ticket_3",
    userId: "e9c42918-fad4-422f-b4ba-24bb5943bb67",
    subject: "Chargeback on card transaction",
    status: "open",
    priority: "high",
    createdAt: "2024-12-16T16:05:00Z",
    messages: [
      {
        id: "msg_6",
        sender: "user",
        content: "I have a card transaction I do not recognize and want to dispute it.",
        timestamp: "2024-12-16T16:05:00Z",
      },
      {
        id: "msg_7",
        sender: "ai",
        content: "Please confirm the merchant name and date so we can proceed with the dispute.",
        timestamp: "2024-12-16T16:10:00Z",
        citations: [{ id: "cite_2", source: "Transaction Dispute Policy", type: "policy" }],
      },
    ],
  },
  {
    id: "ticket_4",
    userId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    subject: "Mobile app login verification loop",
    status: "resolved",
    priority: "medium",
    createdAt: "2024-12-14T09:30:00Z",
    messages: [
      {
        id: "msg_8",
        sender: "user",
        content: "The verification code works, but the app sends me back to login.",
        timestamp: "2024-12-14T09:30:00Z",
      },
      {
        id: "msg_9",
        sender: "ai",
        content: "Clearing cached data usually resolves this. I can also reset your session token.",
        timestamp: "2024-12-14T09:35:00Z",
        citations: [{ id: "cite_3", source: "Mobile App Support Playbook", type: "policy" }],
      },
      {
        id: "msg_10",
        sender: "agent",
        content: "We reset the session token and confirmed login works now.",
        timestamp: "2024-12-14T11:25:00Z",
      },
    ],
  },
]

// Savings Goals
export const savingsGoals: SavingsGoal[] = [
  {
    id: "goal_1",
    userId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    name: "Dream Vacation to Japan",
    category: "travel",
    targetAmount: 25000,
    currentAmount: 18500,
    currency: "AED",
    targetDate: "2025-06-15",
    monthlyContribution: 2000,
    autoDebit: true,
    sourceAccountId: "acc_1",
    status: "active",
    createdAt: "2024-08-01",
    image: "/maldives-beach-resort-tropical-paradise.jpg",
  },
  {
    id: "goal_2",
    userId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    name: "New MacBook Pro",
    category: "shopping",
    targetAmount: 12000,
    currentAmount: 7200,
    currency: "AED",
    targetDate: "2025-04-01",
    monthlyContribution: 1500,
    autoDebit: true,
    sourceAccountId: "acc_1",
    status: "active",
    createdAt: "2024-09-15",
    image: "/macbook-pro-laptop-sleek-modern.jpg",
  },
  {
    id: "goal_3",
    userId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    name: "Emergency Fund",
    category: "emergency",
    targetAmount: 50000,
    currentAmount: 35000,
    currency: "AED",
    targetDate: "2025-12-31",
    monthlyContribution: 2500,
    autoDebit: true,
    sourceAccountId: "acc_2",
    status: "active",
    createdAt: "2024-01-01",
    image: "/safety-umbrella-protection-financial-security.jpg",
  },
  {
    id: "goal_4",
    userId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    name: "Home Down Payment",
    category: "home",
    targetAmount: 200000,
    currentAmount: 45000,
    currency: "AED",
    targetDate: "2027-06-01",
    monthlyContribution: 5000,
    autoDebit: false,
    sourceAccountId: "acc_2",
    status: "active",
    createdAt: "2024-03-01",
    image: "/modern-house-keys-home-ownership-dream.jpg",
  },
  {
    id: "goal_5",
    userId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    name: "iPhone 16 Pro Max",
    category: "shopping",
    targetAmount: 6500,
    currentAmount: 6500,
    currency: "AED",
    targetDate: "2024-11-01",
    monthlyContribution: 1500,
    autoDebit: true,
    sourceAccountId: "acc_1",
    status: "completed",
    createdAt: "2024-07-01",
    image: "/iphone-smartphone-latest-model.jpg",
  },
  {
    id: "goal_6",
    userId: "4e140685-8f38-49ff-aae0-d6109c46873d",
    name: "Wedding Fund",
    category: "wedding",
    targetAmount: 150000,
    currentAmount: 22000,
    currency: "AED",
    targetDate: "2026-09-01",
    monthlyContribution: 4000,
    autoDebit: true,
    sourceAccountId: "acc_2",
    status: "active",
    createdAt: "2024-06-01",
    image: "/wedding-celebration-rings-romantic.jpg",
  },
]

// Savings Goal Transactions
export const savingsGoalTransactions: SavingsGoalTransaction[] = [
  {
    id: "sgt_1",
    goalId: "goal_1",
    amount: 2000,
    type: "deposit",
    date: "2024-11-01",
    description: "Monthly auto-debit",
  },
  {
    id: "sgt_2",
    goalId: "goal_1",
    amount: 2000,
    type: "deposit",
    date: "2024-10-01",
    description: "Monthly auto-debit",
  },
  {
    id: "sgt_3",
    goalId: "goal_1",
    amount: 5000,
    type: "deposit",
    date: "2024-09-15",
    description: "Bonus contribution",
  },
  {
    id: "sgt_4",
    goalId: "goal_2",
    amount: 1500,
    type: "deposit",
    date: "2024-11-01",
    description: "Monthly auto-debit",
  },
  {
    id: "sgt_5",
    goalId: "goal_3",
    amount: 2500,
    type: "deposit",
    date: "2024-11-01",
    description: "Monthly auto-debit",
  },
  {
    id: "sgt_6",
    goalId: "goal_4",
    amount: 5000,
    type: "deposit",
    date: "2024-11-01",
    description: "Monthly auto-debit",
  },
]

// Helper functions
export function getUserById(id: string): User | undefined {
  return users.find((u) => u.id === id)
}

export function getAccountsByUserId(userId: string): Account[] {
  return accounts.filter((a) => a.userId === userId)
}

export function getTransactionsByAccountId(accountId: string): Transaction[] {
  return transactions.filter((t) => t.accountId === accountId)
}

export function getCardsByUserId(userId: string): Card[] {
  return cards.filter((c) => c.userId === userId)
}

export function getLoansByUserId(userId: string): Loan[] {
  return loans.filter((l) => l.userId === userId)
}

export function getPortfolioByUserId(userId: string): PortfolioHolding[] {
  return portfolioHoldings.filter((h) => h.userId === userId)
}

export function getAlertsByStatus(status: RiskAlert["status"]): RiskAlert[] {
  return riskAlerts.filter((a) => a.status === status)
}

export function getClientsByRmId(rmId: string): User[] {
  return users.filter((u) => u.rmId === rmId)
}

export function getInteractionsByClientId(clientId: string): ClientInteraction[] {
  return clientInteractions.filter((i) => i.clientId === clientId)
}

export function getNbaByClientId(clientId: string): NextBestAction[] {
  return nextBestActions.filter((n) => n.clientId === clientId)
}

export function getSavingsGoalsByUserId(userId: string): SavingsGoal[] {
  return savingsGoals.filter((g) => g.userId === userId)
}

export function getSavingsGoalTransactionsByGoalId(goalId: string): SavingsGoalTransaction[] {
  return savingsGoalTransactions.filter((t) => t.goalId === goalId)
}

/**
 * Scenario Detection System
 * Automatically detects special user intents and routes to specialized handlers
 */

export interface ScenarioDetection {
  type: 'loan_with_travel' | 'travel_context' | 'loan_request' | 'spending_analysis' | 'loan_details' | 'payment_schedule' | 'dispute_transaction' | 'review_suspicious_transactions' | 'standard'
  confidence: number
  context?: {
    travelDestination?: string
    loanAmount?: number
    loanTerm?: number
    interestRate?: number
    loanPurpose?: string
    clickedLoanId?: string
    transactionDescription?: string
    transactionAmount?: number
  }
}

/**
 * Main scenario detection function
 * Analyzes user message and conversation history to identify special scenarios
 */
export function detectScenario(
  message: string,
  conversationHistory?: string[]
): ScenarioDetection {
  const lowerMessage = message.toLowerCase()

  // Check for loan with travel context (highest priority)
  const loanTravelDetection = detectLoanWithTravel(lowerMessage)
  if (loanTravelDetection.confidence > 0.7) {
    return loanTravelDetection
  }

  // Check for loan request
  const loanRequestDetection = detectLoanRequest(lowerMessage)
  if (loanRequestDetection.confidence > 0.7) {
    return loanRequestDetection
  }

  // Check for spending analysis
  const spendingAnalysisDetection = detectSpendingAnalysis(lowerMessage)
  if (spendingAnalysisDetection.confidence > 0.7) {
    return spendingAnalysisDetection
  }

  // Check for travel context (lower priority than loan+travel)
  const travelDetection = detectTravelContext(lowerMessage)
  if (travelDetection.confidence > 0.6) {
    return travelDetection
  }

  // Check for payment schedule request
  const paymentScheduleDetection = detectPaymentScheduleRequest(lowerMessage)
  if (paymentScheduleDetection.confidence > 0.7) {
    return paymentScheduleDetection
  }

  // Check for review suspicious transactions request
  const reviewSuspiciousDetection = detectReviewSuspiciousTransactions(lowerMessage)
  if (reviewSuspiciousDetection.confidence > 0.7) {
    return reviewSuspiciousDetection
  }

  // Check for dispute transaction request
  const disputeDetection = detectDisputeRequest(lowerMessage, conversationHistory)
  if (disputeDetection.confidence > 0.7) {
    return disputeDetection
  }

  // Check for loan details request
  const loanDetailsDetection = detectLoanDetailsRequest(lowerMessage)
  if (loanDetailsDetection.confidence > 0.6) {
    return loanDetailsDetection
  }

  // Default to standard
  return {
    type: 'standard',
    confidence: 1.0
  }
}

/**
 * Detects requests for loan with travel context
 * Example: "I want a loan for my Japan trip"
 */
function detectLoanWithTravel(message: string): ScenarioDetection {
  const loanKeywords = ['loan', 'borrow', 'credit', 'financing', 'finance']
  const travelKeywords = ['trip', 'travel', 'vacation', 'holiday', 'journey', 'visit', 'tour']
  
  const hasLoanKeyword = loanKeywords.some(keyword => message.includes(keyword))
  const hasTravelKeyword = travelKeywords.some(keyword => message.includes(keyword))
  
  if (hasLoanKeyword && hasTravelKeyword) {
    // Extract destination if mentioned
    const destination = extractTravelDestination(message)
    
    return {
      type: 'loan_with_travel',
      confidence: 0.95,
      context: {
        travelDestination: destination
      }
    }
  }

  return {
    type: 'standard',
    confidence: 0.0
  }
}

/**
 * Detects travel/location mentions
 * Example: "I'm traveling to London next week"
 */
function detectTravelContext(message: string): ScenarioDetection {
  const travelKeywords = [
    'traveling', 'travelling', 'trip', 'vacation', 'holiday',
    'visiting', 'going to', 'flying to', 'headed to', 'journey'
  ]
  
  const hasTravelKeyword = travelKeywords.some(keyword => message.includes(keyword))
  
  if (hasTravelKeyword) {
    const destination = extractTravelDestination(message)
    
    return {
      type: 'travel_context',
      confidence: 0.85,
      context: {
        travelDestination: destination
      }
    }
  }

  return {
    type: 'standard',
    confidence: 0.0
  }
}

/**
 * Detects loan application requests
 * Example: "I want to request a new loan", "Apply for 50,000 AED loan"
 */
function detectLoanRequest(message: string): ScenarioDetection {
  const requestKeywords = [
    'request a loan', 'apply for loan', 'new loan', 'take a loan',
    'get a loan', 'need a loan', 'want a loan', 'loan application',
    'apply for a personal loan', 'borrow money'
  ]
  
  const hasRequestKeyword = requestKeywords.some(keyword => message.includes(keyword))
  
  if (hasRequestKeyword) {
    // Extract loan amount if mentioned
    const amount = extractLoanAmount(message)
    
    return {
      type: 'loan_request',
      confidence: 0.9,
      context: {
        loanAmount: amount
      }
    }
  }

  return {
    type: 'standard',
    confidence: 0.0
  }
}

/**
 * Detects spending analysis requests
 * Example: "Analyze my spending", "Find ways to save money"
 */
function detectSpendingAnalysis(message: string): ScenarioDetection {
  const analysisKeywords = [
    'analyze spending', 'spending analysis', 'optimize spending',
    'save money', 'savings opportunities', 'reduce expenses',
    'cut costs', 'find savings', 'where can i save', 'spending patterns',
    'optimize my budget', 'reduce my bills'
  ]
  
  const hasAnalysisKeyword = analysisKeywords.some(keyword => message.includes(keyword))
  
  if (hasAnalysisKeyword) {
    return {
      type: 'spending_analysis',
      confidence: 0.9
    }
  }

  return {
    type: 'standard',
    confidence: 0.0
  }
}

/**
 * Detects loan analysis/details requests
 * Example: "Analyze my mortgage loan", "Tell me about my auto loan"
 */
function detectLoanDetailsRequest(message: string): ScenarioDetection {
  const detailsKeywords = [
    'analyze my loan', 'about my loan', 'loan details', 'loan information',
    'explain my loan', 'tell me about my', 'mortgage details', 'auto loan details'
  ]
  
  const hasDetailsKeyword = detailsKeywords.some(keyword => message.includes(keyword))
  
  if (hasDetailsKeyword) {
    return {
      type: 'loan_details',
      confidence: 0.8
    }
  }

  return {
    type: 'standard',
    confidence: 0.0
  }
}

/**
 * Helper: Extract travel destination from message
 */
function extractTravelDestination(message: string): string | undefined {
  // Common destinations
  const destinations = [
    'japan', 'tokyo', 'london', 'paris', 'dubai', 'new york', 'maldives',
    'singapore', 'thailand', 'bangkok', 'bali', 'italy', 'spain', 'greece',
    'switzerland', 'germany', 'france', 'uk', 'usa', 'canada', 'australia'
  ]
  
  for (const destination of destinations) {
    if (message.includes(destination)) {
      return destination.charAt(0).toUpperCase() + destination.slice(1)
    }
  }
  
  return undefined
}

/**
 * Detects requests for payment schedule simulation
 * Example: "Can you simulate the payment schedule for a loan of AED 50,000 at 5.99% APR over 24 months?"
 */
function detectPaymentScheduleRequest(message: string): ScenarioDetection {
  const scheduleKeywords = ['simulate', 'payment schedule', 'amortization', 'breakdown', 'payment plan', 'schedule']
  const loanKeywords = ['loan', 'payment']
  
  const hasScheduleKeyword = scheduleKeywords.some(keyword => message.includes(keyword))
  const hasLoanKeyword = loanKeywords.some(keyword => message.includes(keyword))
  
  if (hasScheduleKeyword && hasLoanKeyword) {
    const amount = extractLoanAmount(message)
    const term = extractLoanTerm(message)
    const rate = extractInterestRate(message)
    
    return {
      type: 'payment_schedule',
      confidence: 0.9,
      context: {
        loanAmount: amount,
        loanTerm: term,
        interestRate: rate
      }
    }
  }
  
  return {
    type: 'standard',
    confidence: 0.0
  }
}

/**
 * Helper: Extract loan term from message
 */
function extractLoanTerm(message: string): number | undefined {
  // Look for patterns like "24 months" or "2 years" or "24"
  const termPattern = /(\d+)\s*(?:months?|years?|month|year)/i
  const match = message.match(termPattern)
  
  if (match) {
    let term = parseInt(match[1])
    // Convert years to months
    if (message.toLowerCase().includes('year')) {
      term = term * 12
    }
    return term
  }
  
  // Try to find standalone number that might be term
  const standalonePattern = /\b(\d{1,2})\b/
  const standaloneMatch = message.match(standalonePattern)
  if (standaloneMatch && parseInt(standaloneMatch[1]) <= 60) {
    return parseInt(standaloneMatch[1])
  }
  
  return undefined
}

/**
 * Helper: Extract interest rate from message
 */
function extractInterestRate(message: string): number | undefined {
  // Look for patterns like "5.99% APR" or "5.99%" or "5.99 percent"
  const ratePattern = /(\d+\.?\d*)\s*%?\s*(?:apr|interest|rate|percent)?/i
  const match = message.match(ratePattern)
  
  if (match) {
    return parseFloat(match[1])
  }
  
  return undefined
}

/**
 * Helper: Extract loan amount from message
 */
function extractLoanAmount(message: string): number | undefined {
  // Look for patterns like "50,000 AED" or "50000" or "50k"
  const amountPattern = /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:aed|dirham)?/i
  const match = message.match(amountPattern)
  
  if (match) {
    const amountStr = match[1].replace(/,/g, '')
    return parseFloat(amountStr)
  }
  
  // Look for "k" notation (50k = 50,000)
  const kPattern = /(\d+)k/i
  const kMatch = message.match(kPattern)
  
  if (kMatch) {
    return parseInt(kMatch[1]) * 1000
  }
  
  return undefined
}


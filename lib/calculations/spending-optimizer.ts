/**
 * Spending Optimizer
 * Analyzes transactions to find savings opportunities
 */

import type { Transaction } from '@/lib/types'

export interface SavingsOpportunity {
  category: string
  subcategory: string
  currentMonthlySpending: number
  targetMonthlySpending: number
  monthlySavings: number
  annualSavings: number
  actions: string[]
  icon: string
  priority: 'high' | 'medium' | 'low'
}

export interface SpendingOptimizationResult {
  totalMonthlySavings: number
  totalAnnualSavings: number
  opportunities: SavingsOpportunity[]
  recommendations: string[]
}

/**
 * Main function to analyze spending and find optimization opportunities
 */
export function analyzeSpendingOptimization(transactions: Transaction[]): SpendingOptimizationResult {
  const opportunities: SavingsOpportunity[] = []

  // Find all types of savings opportunities
  const duplicateSubscriptions = findDuplicateSubscriptions(transactions)
  const negotiableServices = findNegotiableServices(transactions)
  const wastefulSpending = analyzeSpendingWaste(transactions)
  const recurringPayments = identifyRecurringPayments(transactions)

  // Add duplicate subscriptions opportunities
  opportunities.push(...duplicateSubscriptions)

  // Add negotiable services opportunities
  opportunities.push(...negotiableServices)

  // Add wasteful spending opportunities
  opportunities.push(...wastefulSpending)

  // Calculate totals
  const totalMonthlySavings = opportunities.reduce((sum, opp) => sum + opp.monthlySavings, 0)
  const totalAnnualSavings = totalMonthlySavings * 12

  // Generate recommendations
  const recommendations = generateRecommendations(opportunities, recurringPayments)

  return {
    totalMonthlySavings,
    totalAnnualSavings,
    opportunities: opportunities.sort((a, b) => b.monthlySavings - a.monthlySavings), // Sort by savings amount
    recommendations
  }
}

/**
 * Identify recurring payments from transactions
 */
export function identifyRecurringPayments(transactions: Transaction[]): Map<string, Transaction[]> {
  const merchantPayments = new Map<string, Transaction[]>()

  // Group transactions by merchant
  transactions.forEach(tx => {
    if (tx.type === 'debit' && tx.merchant) {
      const existing = merchantPayments.get(tx.merchant) || []
      merchantPayments.set(tx.merchant, [...existing, tx])
    }
  })

  // Filter to only recurring (2+ transactions)
  const recurring = new Map<string, Transaction[]>()
  merchantPayments.forEach((txs, merchant) => {
    if (txs.length >= 2) {
      recurring.set(merchant, txs)
    }
  })

  return recurring
}

/**
 * Find duplicate subscriptions (e.g., Spotify + Apple Music)
 */
export function findDuplicateSubscriptions(transactions: Transaction[]): SavingsOpportunity[] {
  const opportunities: SavingsOpportunity[] = []

  // Music streaming duplicates
  const spotifyTxs = transactions.filter(tx => 
    tx.merchant?.toLowerCase().includes('spotify') ||
    tx.description.toLowerCase().includes('spotify')
  )
  const appleMusicTxs = transactions.filter(tx => 
    tx.merchant?.toLowerCase().includes('apple music') ||
    tx.description.toLowerCase().includes('apple music')
  )

  if (spotifyTxs.length > 0 && appleMusicTxs.length > 0) {
    const spotifyMonthly = spotifyTxs.length > 0 ? spotifyTxs[0].amount : 30
    const appleMusicMonthly = appleMusicTxs.length > 0 ? appleMusicTxs[0].amount : 30
    const monthlySavings = Math.min(spotifyMonthly, appleMusicMonthly)

    opportunities.push({
      category: 'Subscriptions',
      subcategory: 'Duplicate Music Streaming',
      currentMonthlySpending: spotifyMonthly + appleMusicMonthly,
      targetMonthlySpending: Math.max(spotifyMonthly, appleMusicMonthly),
      monthlySavings,
      annualSavings: monthlySavings * 12,
      actions: [
        'Cancel one music streaming service',
        'Keep the service you use most',
        `Save ${formatCurrency(monthlySavings, 'AED')}/month`
      ],
      icon: '🎵',
      priority: 'medium'
    })
  }

  // Video streaming duplicates
  const netflixTxs = transactions.filter(tx => 
    tx.merchant?.toLowerCase().includes('netflix') ||
    tx.description.toLowerCase().includes('netflix')
  )
  const shahidTxs = transactions.filter(tx => 
    tx.merchant?.toLowerCase().includes('shahid') ||
    tx.description.toLowerCase().includes('shahid')
  )

  if (netflixTxs.length > 0 && shahidTxs.length > 0) {
    const netflixMonthly = netflixTxs[0].amount
    const shahidMonthly = shahidTxs[0].amount
    
    // Suggest consolidating if both are premium
    if (netflixMonthly > 40 && shahidMonthly > 40) {
      const monthlySavings = Math.min(netflixMonthly, shahidMonthly)
      
      opportunities.push({
        category: 'Subscriptions',
        subcategory: 'Multiple Video Streaming',
        currentMonthlySpending: netflixMonthly + shahidMonthly,
        targetMonthlySpending: Math.max(netflixMonthly, shahidMonthly),
        monthlySavings,
        annualSavings: monthlySavings * 12,
        actions: [
          'Consider keeping only one premium streaming service',
          'Rotate subscriptions based on content availability',
          `Potential savings: ${formatCurrency(monthlySavings, 'AED')}/month`
        ],
        icon: '📺',
        priority: 'low'
      })
    }
  }

  return opportunities
}

/**
 * Find negotiable services (utilities, telecom)
 */
export function findNegotiableServices(transactions: Transaction[]): SavingsOpportunity[] {
  const opportunities: SavingsOpportunity[] = []

  // Check entertainment spending (movies, concerts, events, gaming, etc.)
  const entertainmentTxs = transactions.filter(tx => 
    tx.category === 'entertainment' ||
    tx.merchant?.toLowerCase().includes('cinema') ||
    tx.merchant?.toLowerCase().includes('movie') ||
    tx.merchant?.toLowerCase().includes('concert') ||
    tx.merchant?.toLowerCase().includes('event') ||
    tx.merchant?.toLowerCase().includes('gaming') ||
    tx.merchant?.toLowerCase().includes('playstation') ||
    tx.merchant?.toLowerCase().includes('xbox') ||
    tx.description.toLowerCase().includes('entertainment') ||
    tx.description.toLowerCase().includes('cinema') ||
    tx.description.toLowerCase().includes('movie')
  )

  if (entertainmentTxs.length > 5) { // More than 5 entertainment transactions
    const monthlyEntertainmentSpend = entertainmentTxs.reduce((sum, tx) => sum + tx.amount, 0)
    const avgEntertainmentValue = monthlyEntertainmentSpend / entertainmentTxs.length
    
    // Suggest reducing by 25% (prioritize experiences, reduce frequency)
    const targetReduction = 0.25
    const potentialSavings = monthlyEntertainmentSpend * targetReduction
    const targetMonthlySpending = monthlyEntertainmentSpend - potentialSavings
    
    opportunities.push({
      category: 'Shopping',
      subcategory: 'Entertainment',
      currentMonthlySpending: monthlyEntertainmentSpend,
      targetMonthlySpending: targetMonthlySpending,
      monthlySavings: potentialSavings,
      annualSavings: potentialSavings * 12,
      actions: [
        `You spent ${formatCurrency(monthlyEntertainmentSpend, 'AED')} on entertainment this period`,
        'Reduce entertainment spending by 25%',
        'Prioritize free or low-cost activities',
        'Look for discounts and promotions before booking',
        `Target savings: ${formatCurrency(potentialSavings, 'AED')}/month`
      ],
      icon: '🎬',
      priority: 'medium'
    })
  }

  // Check utilities (DEWA, Empower)
  const dewaTxs = transactions.filter(tx => 
    tx.merchant?.toLowerCase().includes('dewa') ||
    tx.description.toLowerCase().includes('dewa')
  )

  if (dewaTxs.length > 0) {
    const avgMonthlyDewa = dewaTxs.reduce((sum, tx) => sum + tx.amount, 0) / Math.max(dewaTxs.length, 1)
    
    if (avgMonthlyDewa > 500) {
      const potentialSavings = avgMonthlyDewa * 0.15 // Assume 15% efficiency savings
      
      opportunities.push({
        category: 'Utilities',
        subcategory: 'Electricity & Water',
        currentMonthlySpending: avgMonthlyDewa,
        targetMonthlySpending: avgMonthlyDewa - potentialSavings,
        monthlySavings: potentialSavings,
        annualSavings: potentialSavings * 12,
        actions: [
          'Install energy-efficient LED bulbs',
          'Use AC timer to reduce overnight consumption',
          'Fix any water leaks promptly',
          `Potential savings: ${formatCurrency(potentialSavings, 'AED')}/month`
        ],
        icon: '⚡',
        priority: 'medium'
      })
    }
  }

  return opportunities
}

/**
 * Analyze wasteful spending patterns
 */
export function analyzeSpendingWaste(transactions: Transaction[]): SavingsOpportunity[] {
  const opportunities: SavingsOpportunity[] = []

  // Restaurant spending opportunity
  const restaurantTxs = transactions.filter(tx => 
    tx.category === 'restaurants' && 
    !tx.merchant?.toLowerCase().includes('talabat') &&
    !tx.merchant?.toLowerCase().includes('deliveroo') &&
    !tx.merchant?.toLowerCase().includes('uber eats')
  )
  
  if (restaurantTxs.length > 8) { // More than 8 restaurant visits
    const monthlyRestaurantSpend = restaurantTxs.reduce((sum, tx) => sum + tx.amount, 0)
    const avgVisitValue = monthlyRestaurantSpend / restaurantTxs.length
    
    // Suggest reducing by 20% (cooking at home more often)
    const targetReduction = 0.20
    const potentialSavings = monthlyRestaurantSpend * targetReduction
    const targetMonthlySpending = monthlyRestaurantSpend - potentialSavings
    
    opportunities.push({
      category: 'Shopping',
      subcategory: 'Restaurant Dining',
      currentMonthlySpending: monthlyRestaurantSpend,
      targetMonthlySpending: targetMonthlySpending,
      monthlySavings: potentialSavings,
      annualSavings: potentialSavings * 12,
      actions: [
        `You dined out ${restaurantTxs.length} times this period`,
        'Reduce restaurant visits by 20%',
        'Cook at home more often to save money',
        `Target savings: ${formatCurrency(potentialSavings, 'AED')}/month`
      ],
      icon: '🍽️',
      priority: 'medium'
    })
  }

  // Unused gym memberships (if no recent transactions)
  const gymTxs = transactions.filter(tx => 
    tx.merchant?.toLowerCase().includes('gym') ||
    tx.merchant?.toLowerCase().includes('fitness') ||
    tx.description.toLowerCase().includes('gym')
  )

  if (gymTxs.length >= 2) {
    const monthlyGymCost = gymTxs[0].amount
    
    // Check if there are any fitness-related purchases (shoes, gear) indicating usage
    const fitnessGearTxs = transactions.filter(tx =>
      tx.description.toLowerCase().includes('nike') ||
      tx.description.toLowerCase().includes('adidas') ||
      tx.description.toLowerCase().includes('sport')
    )

    // If paying for gym but no gear purchases, might be unused
    if (fitnessGearTxs.length === 0 && monthlyGymCost > 200) {
      opportunities.push({
        category: 'Lifestyle',
        subcategory: 'Gym Membership',
        currentMonthlySpending: monthlyGymCost,
        targetMonthlySpending: 0,
        monthlySavings: monthlyGymCost,
        annualSavings: monthlyGymCost * 12,
        actions: [
          'Review gym membership usage',
          'Consider canceling if not used regularly',
          'Switch to pay-per-visit or outdoor activities',
          `Potential savings: ${formatCurrency(monthlyGymCost, 'AED')}/month`
        ],
        icon: '💪',
        priority: 'medium'
      })
    }
  }

  return opportunities
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(
  opportunities: SavingsOpportunity[],
  recurringPayments: Map<string, Transaction[]>
): string[] {
  const recommendations: string[] = []

  if (opportunities.length === 0) {
    recommendations.push('Your spending is already well-optimized!')
    recommendations.push('Continue monitoring for new subscription services')
    return recommendations
  }

  // Priority recommendations based on opportunities
  const highPriority = opportunities.filter(o => o.priority === 'high')
  if (highPriority.length > 0) {
    recommendations.push(`Focus on ${highPriority.length} high-priority savings first`)
  }

  const totalSavings = opportunities.reduce((sum, o) => o.monthlySavings, 0)
  if (totalSavings > 500) {
    recommendations.push(`Total potential savings of ${formatCurrency(totalSavings * 12, 'AED')}/year`)
    recommendations.push('These savings could fund a vacation or emergency fund')
  }

  // Subscription management
  const subscriptionOpps = opportunities.filter(o => o.category === 'Subscriptions')
  if (subscriptionOpps.length > 0) {
    recommendations.push('Review all subscriptions quarterly to avoid waste')
  }

  // Utility optimization
  const utilityOpps = opportunities.filter(o => o.category === 'Utilities')
  if (utilityOpps.length > 0) {
    recommendations.push('Set calendar reminders to renegotiate utility contracts annually')
  }

  // Recurring payment audit
  if (recurringPayments.size > 10) {
    recommendations.push(`You have ${recurringPayments.size} recurring payments - audit them monthly`)
  }

  return recommendations
}

/**
 * Helper to format currency
 */
function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${Math.round(amount).toLocaleString('en-US')}`
}


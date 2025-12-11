"use client"

import { useState } from "react"
import {
  ShoppingCart,
  Tv,
  Home,
  Phone,
  Zap,
  Car,
  Plane,
  Utensils,
  Dumbbell,
  GraduationCap,
  Check,
  Plus,
  TrendingUp,
  Shield,
  Gift,
  Sparkles,
  ArrowRight,
  Star,
  Info,
  ChevronRight,
  Wallet,
  CreditCard,
  Link2,
  BadgePercent,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"

interface ConnectedApp {
  id: string
  name: string
  logo: string
  category: string
  description: string
  connected: boolean
  connectedDate?: string
  creditImpact: number // Points boost to credit score
  offers: AppOffer[]
  dataShared: string[]
  benefits: string[]
  monthlySpend?: number
  paymentHistory?: "excellent" | "good" | "fair"
}

interface AppOffer {
  id: string
  title: string
  description: string
  discount?: string
  validUntil: string
  type: "discount" | "cashback" | "points" | "emi" | "bnpl"
}

const appCategories = [
  { id: "all", label: "All Apps", icon: Sparkles },
  { id: "shopping", label: "Shopping", icon: ShoppingCart },
  { id: "entertainment", label: "Entertainment", icon: Tv },
  { id: "telecom", label: "Telecom", icon: Phone },
  { id: "utilities", label: "Utilities", icon: Zap },
  { id: "home", label: "Home & Living", icon: Home },
  { id: "travel", label: "Travel", icon: Plane },
  { id: "food", label: "Food & Dining", icon: Utensils },
  { id: "fitness", label: "Fitness", icon: Dumbbell },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "transport", label: "Transport", icon: Car },
]

const connectedApps: ConnectedApp[] = [
  // Shopping
  {
    id: "amazon",
    name: "Amazon",
    logo: "/amazon-logo-orange.jpg",
    category: "shopping",
    description: "World's largest online marketplace",
    connected: true,
    connectedDate: "2024-08-15",
    creditImpact: 15,
    monthlySpend: 1250,
    paymentHistory: "excellent",
    offers: [
      {
        id: "1",
        title: "5% Cashback",
        description: "On all purchases with your card",
        discount: "5%",
        validUntil: "2025-03-31",
        type: "cashback",
      },
      { id: "2", title: "0% EMI", description: "On electronics above AED 500", validUntil: "2025-02-28", type: "emi" },
    ],
    dataShared: ["Purchase history", "Payment regularity", "Wishlist data"],
    benefits: [
      "Builds credit through consistent payments",
      "Qualifies for higher credit limits",
      "Priority loan processing",
    ],
  },
  {
    id: "noon",
    name: "Noon",
    logo: "/noon-logo-yellow.jpg",
    category: "shopping",
    description: "UAE's homegrown e-commerce platform",
    connected: true,
    connectedDate: "2024-09-01",
    creditImpact: 12,
    monthlySpend: 890,
    paymentHistory: "excellent",
    offers: [
      {
        id: "1",
        title: "10% Off First Order",
        description: "Using Bank of the Future card",
        discount: "10%",
        validUntil: "2025-01-31",
        type: "discount",
      },
      {
        id: "2",
        title: "Buy Now Pay Later",
        description: "Split into 4 payments",
        validUntil: "2025-12-31",
        type: "bnpl",
      },
    ],
    dataShared: ["Purchase frequency", "Payment history"],
    benefits: ["Demonstrates local spending patterns", "Supports credit building"],
  },
  {
    id: "ikea",
    name: "IKEA",
    logo: "/ikea-logo-blue-yellow.jpg",
    category: "home",
    description: "Global furniture and home accessories retailer",
    connected: false,
    creditImpact: 10,
    offers: [
      {
        id: "1",
        title: "AED 100 Off",
        description: "On orders above AED 1,000",
        discount: "AED 100",
        validUntil: "2025-02-15",
        type: "discount",
      },
      {
        id: "2",
        title: "12-Month 0% Financing",
        description: "On furniture purchases",
        validUntil: "2025-06-30",
        type: "emi",
      },
    ],
    dataShared: ["Purchase history", "Home ownership indicators"],
    benefits: ["Indicates home stability", "Supports mortgage applications"],
  },
  {
    id: "carrefour",
    name: "Carrefour",
    logo: "/carrefour-logo-blue-red.jpg",
    category: "shopping",
    description: "Leading hypermarket chain",
    connected: true,
    connectedDate: "2024-07-20",
    creditImpact: 8,
    monthlySpend: 2100,
    paymentHistory: "good",
    offers: [
      { id: "1", title: "2X Points", description: "On groceries this month", validUntil: "2025-01-31", type: "points" },
    ],
    dataShared: ["Shopping frequency", "Basket analysis"],
    benefits: ["Shows regular spending patterns", "Indicates financial stability"],
  },
  // Entertainment
  {
    id: "netflix",
    name: "Netflix",
    logo: "/netflix-logo-red.jpg",
    category: "entertainment",
    description: "Leading streaming entertainment service",
    connected: true,
    connectedDate: "2023-06-10",
    creditImpact: 5,
    monthlySpend: 55,
    paymentHistory: "excellent",
    offers: [
      {
        id: "1",
        title: "Free Upgrade",
        description: "1 month Premium upgrade",
        validUntil: "2025-02-28",
        type: "discount",
      },
    ],
    dataShared: ["Subscription status", "Payment consistency"],
    benefits: ["Shows consistent bill payment", "18+ months history boosts score"],
  },
  {
    id: "spotify",
    name: "Spotify",
    logo: "/spotify-logo-green.jpg",
    category: "entertainment",
    description: "Audio streaming and media services",
    connected: false,
    creditImpact: 4,
    offers: [
      {
        id: "1",
        title: "3 Months Free",
        description: "Premium subscription",
        discount: "100%",
        validUntil: "2025-03-31",
        type: "discount",
      },
    ],
    dataShared: ["Subscription status", "Payment history"],
    benefits: ["Demonstrates recurring payment reliability"],
  },
  {
    id: "shahid",
    name: "Shahid VIP",
    logo: "/shahid-vip-logo-purple.jpg",
    category: "entertainment",
    description: "Premium Arabic streaming platform",
    connected: false,
    creditImpact: 4,
    offers: [
      {
        id: "1",
        title: "50% Off Annual",
        description: "When paying with our card",
        discount: "50%",
        validUntil: "2025-04-30",
        type: "discount",
      },
    ],
    dataShared: ["Subscription status"],
    benefits: ["Regional service reliability indicator"],
  },
  // Telecom
  {
    id: "etisalat",
    name: "Etisalat (e&)",
    logo: "/etisalat-e-and-logo-green.jpg",
    category: "telecom",
    description: "UAE's leading telecommunications provider",
    connected: true,
    connectedDate: "2022-01-15",
    creditImpact: 20,
    monthlySpend: 450,
    paymentHistory: "excellent",
    offers: [
      {
        id: "1",
        title: "Device Upgrade",
        description: "0% interest on new devices",
        validUntil: "2025-06-30",
        type: "emi",
      },
      { id: "2", title: "Data Bonus", description: "Extra 10GB monthly", validUntil: "2025-03-31", type: "discount" },
    ],
    dataShared: ["Bill payment history", "Account tenure", "Plan type"],
    benefits: ["Major credit score impact", "Tenure shows stability", "Supports larger loan approvals"],
  },
  {
    id: "du",
    name: "du",
    logo: "/du-telecom-logo-blue.jpg",
    category: "telecom",
    description: "Emirates Integrated Telecommunications",
    connected: false,
    creditImpact: 18,
    offers: [
      {
        id: "1",
        title: "Switch & Save",
        description: "AED 200 credit when connecting",
        discount: "AED 200",
        validUntil: "2025-02-28",
        type: "cashback",
      },
      {
        id: "2",
        title: "Bundle Discount",
        description: "15% off home + mobile",
        discount: "15%",
        validUntil: "2025-12-31",
        type: "discount",
      },
    ],
    dataShared: ["Bill payment history", "Account tenure"],
    benefits: ["Strong credit indicator", "Utility payment history"],
  },
  // Utilities
  {
    id: "dewa",
    name: "DEWA",
    logo: "/dewa-dubai-logo-green.jpg",
    category: "utilities",
    description: "Dubai Electricity and Water Authority",
    connected: true,
    connectedDate: "2023-03-01",
    creditImpact: 25,
    monthlySpend: 680,
    paymentHistory: "excellent",
    offers: [
      {
        id: "1",
        title: "Green Bill Reward",
        description: "Cashback on reduced consumption",
        validUntil: "2025-12-31",
        type: "cashback",
      },
    ],
    dataShared: ["Bill payment history", "Account tenure", "Consumption patterns"],
    benefits: ["Highest credit impact", "Residence verification", "Essential for mortgage approval"],
  },
  {
    id: "addc",
    name: "ADDC",
    logo: "/addc-abu-dhabi-logo-blue.jpg",
    category: "utilities",
    description: "Abu Dhabi Distribution Company",
    connected: false,
    creditImpact: 25,
    offers: [
      {
        id: "1",
        title: "Auto-Pay Bonus",
        description: "AED 50 credit for setup",
        discount: "AED 50",
        validUntil: "2025-03-31",
        type: "cashback",
      },
    ],
    dataShared: ["Bill payment history", "Account tenure"],
    benefits: ["Highest credit impact", "Address verification"],
  },
  // Travel
  {
    id: "emirates",
    name: "Emirates Airlines",
    logo: "/emirates-airline-logo-gold-red.jpg",
    category: "travel",
    description: "UAE's flagship carrier",
    connected: true,
    connectedDate: "2024-02-10",
    creditImpact: 8,
    monthlySpend: 0,
    paymentHistory: "excellent",
    offers: [
      {
        id: "1",
        title: "5,000 Skywards Miles",
        description: "On first booking",
        validUntil: "2025-04-30",
        type: "points",
      },
      {
        id: "2",
        title: "Lounge Access",
        description: "2 free visits per year",
        validUntil: "2025-12-31",
        type: "discount",
      },
    ],
    dataShared: ["Booking history", "Travel frequency"],
    benefits: ["Lifestyle indicator", "Premium customer profiling"],
  },
  {
    id: "booking",
    name: "Booking.com",
    logo: "/booking-com-logo-blue.jpg",
    category: "travel",
    description: "Global travel accommodations platform",
    connected: false,
    creditImpact: 5,
    offers: [
      {
        id: "1",
        title: "10% Off Hotels",
        description: "Exclusive member rates",
        discount: "10%",
        validUntil: "2025-06-30",
        type: "discount",
      },
    ],
    dataShared: ["Booking frequency", "Spend patterns"],
    benefits: ["Travel pattern insights"],
  },
  // Food & Dining
  {
    id: "talabat",
    name: "Talabat",
    logo: "/talabat-logo-orange.jpg",
    category: "food",
    description: "Food delivery platform",
    connected: true,
    connectedDate: "2024-05-20",
    creditImpact: 6,
    monthlySpend: 320,
    paymentHistory: "good",
    offers: [
      {
        id: "1",
        title: "Free Delivery",
        description: "Unlimited for 3 months",
        validUntil: "2025-02-28",
        type: "discount",
      },
      {
        id: "2",
        title: "15% Cashback",
        description: "On weekend orders",
        discount: "15%",
        validUntil: "2025-01-31",
        type: "cashback",
      },
    ],
    dataShared: ["Order frequency", "Payment methods"],
    benefits: ["Spending pattern analysis", "Lifestyle insights"],
  },
  {
    id: "deliveroo",
    name: "Deliveroo",
    logo: "/deliveroo-logo-teal.jpg",
    category: "food",
    description: "Premium food delivery service",
    connected: false,
    creditImpact: 5,
    offers: [
      {
        id: "1",
        title: "AED 30 Off",
        description: "First 3 orders",
        discount: "AED 30",
        validUntil: "2025-03-31",
        type: "discount",
      },
    ],
    dataShared: ["Order history"],
    benefits: ["Spending behavior insights"],
  },
  // Fitness
  {
    id: "fitness-first",
    name: "Fitness First",
    logo: "/placeholder.svg?height=64&width=64",
    category: "fitness",
    description: "Premium gym and fitness chain",
    connected: false,
    creditImpact: 7,
    offers: [
      {
        id: "1",
        title: "2 Months Free",
        description: "On annual membership",
        discount: "2 months",
        validUntil: "2025-02-28",
        type: "discount",
      },
      {
        id: "2",
        title: "0% EMI",
        description: "Split annual fee into 12 payments",
        validUntil: "2025-12-31",
        type: "emi",
      },
    ],
    dataShared: ["Membership status", "Payment history"],
    benefits: ["Shows commitment to recurring payments", "Lifestyle indicator"],
  },
  // Transport
  {
    id: "salik",
    name: "Salik",
    logo: "/placeholder.svg?height=64&width=64",
    category: "transport",
    description: "Dubai road toll system",
    connected: true,
    connectedDate: "2023-08-01",
    creditImpact: 10,
    monthlySpend: 120,
    paymentHistory: "excellent",
    offers: [
      {
        id: "1",
        title: "Auto Top-up Bonus",
        description: "5% bonus credit",
        discount: "5%",
        validUntil: "2025-12-31",
        type: "cashback",
      },
    ],
    dataShared: ["Account balance", "Top-up frequency"],
    benefits: ["Vehicle ownership indicator", "Regular payment pattern"],
  },
  {
    id: "careem",
    name: "Careem",
    logo: "/placeholder.svg?height=64&width=64",
    category: "transport",
    description: "Ride-hailing and delivery super app",
    connected: false,
    creditImpact: 6,
    offers: [
      {
        id: "1",
        title: "20% Off Rides",
        description: "For cardholders",
        discount: "20%",
        validUntil: "2025-03-31",
        type: "discount",
      },
    ],
    dataShared: ["Ride frequency", "Payment history"],
    benefits: ["Transport spending insights"],
  },
  // Education
  {
    id: "coursera",
    name: "Coursera",
    logo: "/placeholder.svg?height=64&width=64",
    category: "education",
    description: "Online learning platform",
    connected: false,
    creditImpact: 4,
    offers: [
      {
        id: "1",
        title: "25% Off Annual",
        description: "Coursera Plus subscription",
        discount: "25%",
        validUntil: "2025-04-30",
        type: "discount",
      },
    ],
    dataShared: ["Subscription status"],
    benefits: ["Self-improvement indicator"],
  },
]

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedApp, setSelectedApp] = useState<ConnectedApp | null>(null)
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)
  const [appToConnect, setAppToConnect] = useState<ConnectedApp | null>(null)
  const [apps, setApps] = useState<ConnectedApp[]>(connectedApps)
  const [offersSheetOpen, setOffersSheetOpen] = useState(false)
  const [selectedAppOffers, setSelectedAppOffers] = useState<ConnectedApp | null>(null)

  const connectedAppsCount = apps.filter((app) => app.connected).length
  const totalCreditImpact = apps.filter((app) => app.connected).reduce((sum, app) => sum + app.creditImpact, 0)
  const totalMonthlySpend = apps
    .filter((app) => app.connected && app.monthlySpend)
    .reduce((sum, app) => sum + (app.monthlySpend || 0), 0)

  const filteredApps = apps.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || app.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleConnect = (app: ConnectedApp) => {
    setAppToConnect(app)
    setConnectDialogOpen(true)
  }

  const confirmConnect = () => {
    if (appToConnect) {
      setApps((prev) =>
        prev.map((app) =>
          app.id === appToConnect.id
            ? { ...app, connected: true, connectedDate: new Date().toISOString().split("T")[0] }
            : app,
        ),
      )
      setConnectDialogOpen(false)
      setAppToConnect(null)
    }
  }

  const handleViewOffers = (app: ConnectedApp) => {
    setSelectedAppOffers(app)
    setOffersSheetOpen(true)
  }

  const getOfferTypeIcon = (type: AppOffer["type"]) => {
    switch (type) {
      case "cashback":
        return <Wallet className="h-4 w-4" />
      case "discount":
        return <BadgePercent className="h-4 w-4" />
      case "points":
        return <Star className="h-4 w-4" />
      case "emi":
        return <CreditCard className="h-4 w-4" />
      case "bnpl":
        return <ArrowRight className="h-4 w-4" />
      default:
        return <Gift className="h-4 w-4" />
    }
  }

  const getOfferTypeBadge = (type: AppOffer["type"]) => {
    const styles: Record<string, string> = {
      cashback: "bg-emerald-500/10 text-emerald-500",
      discount: "bg-blue-500/10 text-blue-500",
      points: "bg-amber-500/10 text-amber-500",
      emi: "bg-purple-500/10 text-purple-500",
      bnpl: "bg-pink-500/10 text-pink-500",
    }
    return styles[type] || "bg-muted text-muted-foreground"
  }

  const aiQuestions = [
    "How do connected apps boost my credit?",
    "Which apps have the best offers?",
    "Is my data safe when connecting apps?",
    "How do I disconnect an app?",
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Connected Apps Marketplace</h1>
          <p className="text-muted-foreground">
            Connect your favorite apps to unlock offers and boost your credit score
          </p>
        </div>
        <Button variant="outline" onClick={() => setSelectedCategory("all")}>
          <Link2 className="mr-2 h-4 w-4" />
          {connectedAppsCount} Apps Connected
        </Button>
      </div>

      {/* Credit Score Impact Banner */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Credit Score Boost</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Your connected apps are contributing to your creditworthiness. Regular payments through these services
                demonstrate financial responsibility.
              </p>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-3xl font-bold text-primary">+{totalCreditImpact}</p>
                  <p className="text-xs text-muted-foreground">Points from connected apps</p>
                </div>
                <div className="h-12 w-px bg-border" />
                <div>
                  <p className="text-3xl font-bold">AED {totalMonthlySpend.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Monthly tracked spend</p>
                </div>
                <div className="h-12 w-px bg-border hidden md:block" />
                <div className="hidden md:block">
                  <p className="text-3xl font-bold text-emerald-500">
                    {connectedAppsCount}/{apps.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Apps connected</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button>
                <Sparkles className="mr-2 h-4 w-4" />
                View Credit Impact
              </Button>
              <Button variant="ghost" size="sm" className="text-xs">
                <Info className="mr-1 h-3 w-3" />
                How this affects loans
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Layout with AI Widget Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content area - 3 columns */}
        <div className="lg:col-span-3 space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <Input
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="md:w-80"
            />
            <div className="flex-1 overflow-x-auto pb-3">
              <div className="flex gap-2 pr-2">
                {appCategories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                    className="whitespace-nowrap"
                  >
                    <cat.icon className="mr-1 h-4 w-4" />
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs for Connected vs All */}
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All Apps</TabsTrigger>
              <TabsTrigger value="connected">Connected ({connectedAppsCount})</TabsTrigger>
              <TabsTrigger value="recommended">Recommended</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredApps.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    onConnect={handleConnect}
                    onViewOffers={handleViewOffers}
                    onViewDetails={setSelectedApp}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="connected" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredApps
                  .filter((app) => app.connected)
                  .map((app) => (
                    <AppCard
                      key={app.id}
                      app={app}
                      onConnect={handleConnect}
                      onViewOffers={handleViewOffers}
                      onViewDetails={setSelectedApp}
                    />
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="recommended" className="space-y-4">
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertTitle>Personalized Recommendations</AlertTitle>
                <AlertDescription>
                  Based on your spending patterns, connecting these apps could boost your credit score by up to 50
                  points and unlock better loan rates.
                </AlertDescription>
              </Alert>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredApps
                  .filter((app) => !app.connected && app.creditImpact >= 10)
                  .sort((a, b) => b.creditImpact - a.creditImpact)
                  .map((app) => (
                    <AppCard
                      key={app.id}
                      app={app}
                      onConnect={handleConnect}
                      onViewOffers={handleViewOffers}
                      onViewDetails={setSelectedApp}
                      recommended
                    />
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar with AI widget - 1 column */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <AskAIBankerWidget questions={aiQuestions} description="Learn about connected apps and offers" />
          </div>
        </div>
      </div>

      {/* Connect Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {appToConnect?.name}</DialogTitle>
            <DialogDescription>
              By connecting, you authorize Bank of the Future to access the following data:
            </DialogDescription>
          </DialogHeader>
          {appToConnect && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={appToConnect.logo || "/placeholder.svg"}
                  alt={appToConnect.name}
                  className="h-16 w-16 rounded-xl"
                />
                <div>
                  <h4 className="font-medium">{appToConnect.name}</h4>
                  <p className="text-sm text-muted-foreground">{appToConnect.description}</p>
                </div>
              </div>
              <div className="rounded-lg border p-4 space-y-3">
                <h5 className="font-medium text-sm">Data that will be shared:</h5>
                <ul className="space-y-2">
                  {appToConnect.dataShared.map((data, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      {data}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg bg-primary/5 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="font-medium">Credit Impact: +{appToConnect.creditImpact} points</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Connecting this app can improve your credit score over time through consistent payment history.
                </p>
              </div>
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Your data is encrypted and protected. You can disconnect at any time from your account settings.
                </AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmConnect}>
              <Link2 className="mr-2 h-4 w-4" />
              Connect {appToConnect?.name}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* App Details Sheet */}
      <Sheet open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedApp && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-4">
                  <img
                    src={selectedApp.logo || "/placeholder.svg"}
                    alt={selectedApp.name}
                    className="h-16 w-16 rounded-xl"
                  />
                  <div>
                    <SheetTitle>{selectedApp.name}</SheetTitle>
                    <SheetDescription>{selectedApp.description}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {selectedApp.connected ? (
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="h-5 w-5 text-emerald-500" />
                      <span className="font-medium text-emerald-500">Connected</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Connected since {selectedApp.connectedDate}</p>
                    {selectedApp.paymentHistory && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-sm">Payment History:</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            selectedApp.paymentHistory === "excellent" && "border-emerald-500 text-emerald-500",
                            selectedApp.paymentHistory === "good" && "border-blue-500 text-blue-500",
                            selectedApp.paymentHistory === "fair" && "border-amber-500 text-amber-500",
                          )}
                        >
                          {selectedApp.paymentHistory}
                        </Badge>
                      </div>
                    )}
                    {selectedApp.monthlySpend !== undefined && selectedApp.monthlySpend > 0 && (
                      <p className="text-sm mt-2">
                        Monthly spend: <strong>AED {selectedApp.monthlySpend.toLocaleString()}</strong>
                      </p>
                    )}
                  </div>
                ) : (
                  <Button className="w-full" onClick={() => handleConnect(selectedApp)}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Connect {selectedApp.name}
                  </Button>
                )}

                <div>
                  <h4 className="font-medium mb-3">Credit Impact</h4>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Progress value={(selectedApp.creditImpact / 25) * 100} className="h-2" />
                    </div>
                    <span className="font-bold text-primary">+{selectedApp.creditImpact} pts</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Benefits for Lending</h4>
                  <ul className="space-y-2">
                    {selectedApp.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Available Offers</h4>
                  <div className="space-y-3">
                    {selectedApp.offers.map((offer) => (
                      <div key={offer.id} className="rounded-lg border p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getOfferTypeBadge(offer.type)}>
                            {getOfferTypeIcon(offer.type)}
                            <span className="ml-1 capitalize">{offer.type}</span>
                          </Badge>
                          {offer.discount && <span className="text-sm font-bold text-primary">{offer.discount}</span>}
                        </div>
                        <h5 className="font-medium">{offer.title}</h5>
                        <p className="text-sm text-muted-foreground">{offer.description}</p>
                        <p className="text-xs text-muted-foreground mt-2">Valid until {offer.validUntil}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Data Shared</h4>
                  <ul className="space-y-2">
                    {selectedApp.dataShared.map((data, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Shield className="h-4 w-4" />
                        {data}
                      </li>
                    ))}
                  </ul>
                </div>

                {selectedApp.connected && (
                  <Button variant="outline" className="w-full text-destructive bg-transparent">
                    Disconnect App
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Offers Sheet */}
      <Sheet open={offersSheetOpen} onOpenChange={setOffersSheetOpen}>
        <SheetContent className="sm:max-w-lg">
          {selectedAppOffers && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedAppOffers.name} Offers</SheetTitle>
                <SheetDescription>Exclusive offers available for Bank of the Future customers</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {selectedAppOffers.offers.map((offer) => (
                  <Card key={offer.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getOfferTypeBadge(offer.type)}>
                          {getOfferTypeIcon(offer.type)}
                          <span className="ml-1 capitalize">{offer.type}</span>
                        </Badge>
                        {offer.discount && <span className="text-lg font-bold text-primary">{offer.discount}</span>}
                      </div>
                      <h4 className="font-medium mb-1">{offer.title}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{offer.description}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">Valid until {offer.validUntil}</p>
                        <Button size="sm">
                          Claim Offer
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

interface AppCardProps {
  app: ConnectedApp
  onConnect: (app: ConnectedApp) => void
  onViewOffers: (app: ConnectedApp) => void
  onViewDetails: (app: ConnectedApp) => void
  recommended?: boolean
}

function AppCard({ app, onConnect, onViewOffers, onViewDetails, recommended }: AppCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all hover:shadow-md cursor-pointer h-full flex flex-col",
        recommended && "ring-2 ring-primary/50",
      )}
      onClick={() => onViewDetails(app)}
    >
      {recommended && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-bl-lg">
          Recommended
        </div>
      )}
      <CardContent className="p-5 flex flex-col flex-1">
        <div className="flex items-start gap-4 mb-4">
          <div className="h-16 w-16 rounded-xl border bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <img src={app.logo || "/placeholder.svg"} alt={app.name} className="h-12 w-12 rounded-lg object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base truncate">{app.name}</h3>
              {app.connected && <Check className="h-4 w-4 text-emerald-500 shrink-0" />}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{app.description}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge variant="outline" className="text-xs">
            <TrendingUp className="mr-1 h-3 w-3" />+{app.creditImpact} pts
          </Badge>
          {app.offers.length > 0 && (
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
              <Gift className="mr-1 h-3 w-3" />
              {app.offers.length} offer{app.offers.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        
        <div className="flex gap-2 mt-auto" onClick={(e) => e.stopPropagation()}>
          {app.connected ? (
            <>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onViewOffers(app)}>
                <Gift className="mr-1 h-4 w-4" />
                View Offers
              </Button>
              <Button variant="ghost" size="sm">
                Manage
              </Button>
            </>
          ) : (
            <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90" onClick={() => onConnect(app)}>
              <Plus className="mr-1 h-4 w-4" />
              Connect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

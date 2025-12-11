"use client"

import { useState, useEffect } from "react"
import { useRole } from "@/lib/role-context"
import { formatCurrency } from "@/lib/format"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import {
  Gift,
  Award,
  TrendingUp,
  History,
  Sparkles,
  ShoppingBag,
  Plane,
  Heart,
  Coffee,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Lock
} from "lucide-react"
import type { RewardProfile, RewardItem, RewardActivity } from "@/lib/types"
import { AskAIBankerWidget } from "@/components/ai/ask-ai-banker-widget"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export default function RewardsPage() {
  const { currentUser } = useRole()
  const [profile, setProfile] = useState<RewardProfile | null>(null)
  const [catalog, setCatalog] = useState<RewardItem[]>([])
  const [activities, setActivities] = useState<RewardActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null)
  const [redeemSuccess, setRedeemSuccess] = useState(false)

  useEffect(() => {
    async function fetchData() {
      if (!currentUser?.id) return

      setIsLoading(true)
      const supabase = createClient()

      // Fetch Profile
      const { data: profileData } = await supabase
        .from("reward_profiles")
        .select("*")
        .eq("user_id", currentUser.id)
        .single()

      if (profileData) {
        setProfile({
          userId: profileData.user_id,
          totalPoints: profileData.total_points,
          lifetimePoints: profileData.lifetime_points,
          tier: profileData.tier,
          nextTierProgress: Number(profileData.next_tier_progress)
        })
      } else {
        // Init empty profile if none exists (though seeding should have handled it)
        setProfile({
            userId: currentUser.id,
            totalPoints: 0,
            lifetimePoints: 0,
            tier: "Bronze",
            nextTierProgress: 0
        })
      }

      // Fetch Catalog
      const { data: catalogData } = await supabase
        .from("reward_catalog")
        .select("*")
        .order("points_cost", { ascending: true })

      if (catalogData) {
        setCatalog(catalogData.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          pointsCost: item.points_cost,
          category: item.category,
          imageUrl: item.image_url,
          isFeatured: item.is_featured,
          stockQuantity: item.stock_quantity
        })))
      }

      // Fetch Activities
      const { data: activityData } = await supabase
        .from("reward_activities")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(10)

      if (activityData) {
        setActivities(activityData.map((act: any) => ({
          id: act.id,
          userId: act.user_id,
          amount: act.amount,
          type: act.type,
          category: act.category,
          description: act.description,
          createdAt: act.created_at
        })))
      }

      setIsLoading(false)
    }

    fetchData()
  }, [currentUser])

  const handleRedeem = async (item: RewardItem) => {
    if (!profile || profile.totalPoints < item.pointsCost) return

    try {
      const supabase = createClient()
      
      // 1. Create redemption activity
      const { error: activityError } = await supabase.from("reward_activities").insert({
        user_id: currentUser?.id,
        amount: -item.pointsCost,
        type: "redeemed",
        category: item.category,
        description: `Redeemed: ${item.name}`
      })
      
      if (activityError) throw activityError

      // 2. Update profile points
      const { error: profileError } = await supabase.rpc("deduct_points", {
        p_user_id: currentUser?.id,
        p_amount: item.pointsCost
      })

      // Fallback if RPC doesn't exist (update directly)
      if (profileError) {
         await supabase
          .from("reward_profiles")
          .update({ total_points: profile.totalPoints - item.pointsCost })
          .eq("user_id", currentUser.id)
      }

      // Optimistic update
      setProfile(prev => prev ? ({ ...prev, totalPoints: prev.totalPoints - item.pointsCost }) : null)
      setRedeemSuccess(true)
      
      // Refresh activities
      const { data: newActivity } = await supabase
        .from("reward_activities")
        .select("*")
        .eq("user_id", currentUser?.id)
        .order("created_at", { ascending: false })
        .limit(10)
        
      if (newActivity) {
         setActivities(newActivity.map((act: any) => ({
          id: act.id,
          userId: act.user_id,
          amount: act.amount,
          type: act.type,
          category: act.category,
          description: act.description,
          createdAt: act.created_at
        })))
      }

    } catch (error) {
      console.error("Redemption failed:", error)
      // Revert optimistic update if needed, or show error toast
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Platinum": return "text-indigo-500 bg-indigo-500/10 border-indigo-500/20"
      case "Gold": return "text-amber-500 bg-amber-500/10 border-amber-500/20"
      case "Silver": return "text-slate-500 bg-slate-500/10 border-slate-500/20"
      default: return "text-orange-700 bg-orange-700/10 border-orange-700/20"
    }
  }

  const aiQuestions = [
    "How do I earn more points?",
    "What rewards can I afford?",
    "When do my points expire?",
    "Show me travel rewards",
  ]

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  if (!profile) return null

  return (
    <div className="space-y-6">
      <PageHeader title="Rewards" description="Earn points and redeem exclusive rewards" />

      {/* Hero Section - Points & Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Available Points</p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-bold text-primary">{profile.totalPoints.toLocaleString()}</h2>
                  <span className="text-sm text-muted-foreground">pts</span>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-lg border ${getTierColor(profile.tier)} flex items-center gap-2`}>
                <Award className="h-5 w-5" />
                <span className="font-semibold">{profile.tier} Member</span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress to {profile.tier === 'Gold' ? 'Platinum' : profile.tier === 'Silver' ? 'Gold' : 'Silver'}</span>
                <span>{profile.nextTierProgress}%</span>
              </div>
              <Progress value={profile.nextTierProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                Earn {2000} more points to upgrade your tier and unlock exclusive benefits.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats / AI Widget */}
        <div className="md:col-span-1">
           <AskAIBankerWidget questions={aiQuestions} description="Maximize your rewards" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rewards Catalog */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Rewards Catalog</h3>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="travel">Travel</TabsTrigger>
                <TabsTrigger value="gadget">Gadgets</TabsTrigger>
                <TabsTrigger value="gift_card">Vouchers</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {catalog.map((item) => (
                  <RewardItemCard 
                    key={item.id} 
                    item={item} 
                    canAfford={profile.totalPoints >= item.pointsCost}
                    onRedeem={() => setSelectedReward(item)} 
                  />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="travel" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {catalog.filter(i => i.category === 'travel').map((item) => (
                  <RewardItemCard 
                    key={item.id} 
                    item={item} 
                    canAfford={profile.totalPoints >= item.pointsCost}
                    onRedeem={() => setSelectedReward(item)} 
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="gadget" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {catalog.filter(i => i.category === 'gadget').map((item) => (
                   <RewardItemCard 
                   key={item.id} 
                   item={item} 
                   canAfford={profile.totalPoints >= item.pointsCost}
                   onRedeem={() => setSelectedReward(item)} 
                 />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="gift_card" className="space-y-4">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {catalog.filter(i => i.category === 'gift_card').map((item) => (
                   <RewardItemCard 
                   key={item.id} 
                   item={item} 
                   canAfford={profile.totalPoints >= item.pointsCost}
                   onRedeem={() => setSelectedReward(item)} 
                 />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Recent Activity */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <CardTitle>History</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {activities.map((act) => (
                  <div key={act.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{act.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(act.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`font-bold text-sm ${act.amount > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {act.amount > 0 ? '+' : ''}{act.amount}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                <CardTitle className="text-indigo-700 dark:text-indigo-300">Boost Your Points</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
               <ul className="space-y-3 text-sm">
                 <li className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Refer a friend (+2,000 pts)</span>
                 </li>
                 <li className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Connect Marketplace App (+500 pts)</span>
                 </li>
                 <li className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Complete Risk Profile (+250 pts)</span>
                 </li>
               </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Redemption Sheet */}
      <Sheet open={!!selectedReward} onOpenChange={(open) => !open && setSelectedReward(null)}>
        <SheetContent>
            <SheetHeader>
                <SheetTitle>Redeem Reward</SheetTitle>
                <SheetDescription>Confirm your selection</SheetDescription>
            </SheetHeader>
            {selectedReward && (
                <div className="mt-6 space-y-6">
                    <div>
                        <h3 className="text-xl font-bold">{selectedReward.name}</h3>
                        <p className="text-muted-foreground mt-2">{selectedReward.description}</p>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <span className="text-sm font-medium">Cost</span>
                        <div className="flex items-center gap-1">
                            <span className="text-xl font-bold text-primary">{selectedReward.pointsCost.toLocaleString()}</span>
                            <span className="text-sm text-muted-foreground">pts</span>
                        </div>
                    </div>

                    {redeemSuccess ? (
                        <Alert className="border-emerald-500/50 bg-emerald-500/10">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <AlertTitle className="text-emerald-500">Success!</AlertTitle>
                            <AlertDescription className="text-emerald-600/90">
                                Your reward has been redeemed successfully. Check your email for details.
                            </AlertDescription>
                        </Alert>
                    ) : (
                         <div className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span>Your Balance</span>
                                <span>{profile.totalPoints.toLocaleString()} pts</span>
                            </div>
                            <div className="flex justify-between text-sm font-medium">
                                <span>Balance After</span>
                                <span className={profile.totalPoints < selectedReward.pointsCost ? 'text-red-500' : ''}>
                                    {(profile.totalPoints - selectedReward.pointsCost).toLocaleString()} pts
                                </span>
                            </div>
                            
                            <Button 
                                className="w-full" 
                                size="lg" 
                                disabled={profile.totalPoints < selectedReward.pointsCost}
                                onClick={() => handleRedeem(selectedReward)}
                            >
                                {profile.totalPoints >= selectedReward.pointsCost ? 'Confirm Redemption' : 'Insufficient Points'}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </SheetContent>
      </Sheet>

    </div>
  )
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "travel": return <Plane className="h-4 w-4" />
    case "gadget": return <ShoppingBag className="h-4 w-4" />
    case "charity": return <Heart className="h-4 w-4" />
    case "gift_card": return <Gift className="h-4 w-4" />
    default: return <Award className="h-4 w-4" />
  }
}

function RewardItemCard({ item, canAfford, onRedeem }: { item: RewardItem, canAfford: boolean, onRedeem: () => void }) {
  return (
    <Card className="flex flex-col overflow-hidden hover:shadow-md transition-all">
      {item.isFeatured && (
        <div className="relative">
          <Badge className="absolute top-2 right-2 z-10 bg-amber-500">Featured</Badge>
        </div>
      )}
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getCategoryIcon(item.category)}
              <h4 className="font-semibold line-clamp-1" title={item.name}>{item.name}</h4>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1 h-10">{item.description}</p>
        </div>
        <div className="mt-4 flex items-center justify-between">
            <span className="font-bold text-primary">{item.pointsCost.toLocaleString()} pts</span>
            <Button size="sm" variant={canAfford ? "default" : "secondary"} disabled={!canAfford} onClick={onRedeem}>
                {canAfford ? 'Redeem' : <Lock className="h-3 w-3" />}
            </Button>
        </div>
      </CardContent>
    </Card>
  )
}


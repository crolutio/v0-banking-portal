"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useRole, canAccessRMWorkspace, canAccessRiskCompliance, canAccessAdminConsole } from "@/lib/role-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Home,
  Wallet,
  CreditCard,
  Landmark,
  TrendingUp,
  HelpCircle,
  Bot,
  Users,
  ShieldAlert,
  Settings,
  ClipboardList,
  Menu,
  ChevronRight,
  Building2,
  Check,
  Store,
  PiggyBank,
  Gift,
} from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles?: string[]
}

const navItems: NavItem[] = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Accounts", href: "/accounts", icon: Wallet },
  { label: "Cards", href: "/cards", icon: CreditCard },
  { label: "Savings Goals", href: "/savings-goals", icon: PiggyBank },
  { label: "Loans", href: "/loans", icon: Landmark },
  { label: "Investments", href: "/investments", icon: TrendingUp },
  { label: "Rewards", href: "/rewards", icon: Gift },
  { label: "Marketplace", href: "/marketplace", icon: Store },
  { label: "Support", href: "/support", icon: HelpCircle },
  { label: "AI Banker", href: "/ai-banker", icon: Bot },
  { label: "RM Workspace", href: "/rm-workspace", icon: Users, roles: ["relationship_manager"] },
  { label: "Risk & Compliance", href: "/risk-compliance", icon: ShieldAlert, roles: ["risk_compliance", "admin"] },
  { label: "Admin Console", href: "/admin", icon: Settings, roles: ["admin"] },
  { label: "Audit Log", href: "/audit", icon: ClipboardList, roles: ["risk_compliance", "admin"] },
]

function RoleSwitcher() {
  const { currentRole, currentUser, setRole, availableRoles } = useRole()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={currentUser.avatar || "/placeholder.svg"} alt={currentUser.name} />
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {currentUser.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start">
            <span className="text-sm font-medium text-foreground">{currentUser.name}</span>
            <span className="text-xs text-muted-foreground capitalize">{currentRole.replace("_", " ")}</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableRoles.map(({ role, label, user }) => (
          <DropdownMenuItem key={role} onClick={() => setRole(role)} className="flex items-center gap-3 py-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            {currentRole === role && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname()
  const { currentRole } = useRole()

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true
    if (item.roles.includes("relationship_manager") && canAccessRMWorkspace(currentRole)) return true
    if (item.roles.includes("risk_compliance") && canAccessRiskCompliance(currentRole)) return true
    if (item.roles.includes("admin") && canAccessAdminConsole(currentRole)) return true
    return false
  })

  return (
    <aside className={cn("flex flex-col bg-sidebar text-sidebar-foreground", className)}>
      <div className="flex items-center gap-2 px-4 h-16 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
          <Building2 className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">Bank of the Future</span>
          <span className="text-[10px] text-sidebar-muted uppercase tracking-wider">Digital Banking</span>
        </div>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2 text-xs text-sidebar-muted">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>AI Systems Online</span>
        </div>
      </div>
    </aside>
  )
}

function Topbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch by rendering interactive elements only on client
  useEffect(() => {
    setMounted(true)
  }, [])


  if (!mounted) {
    return (
      <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 lg:hidden" /> {/* Placeholder for menu button */}
          <div className="hidden lg:flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-semibold">Bank of the Future</span>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <Sidebar className="h-full" />
          </SheetContent>
        </Sheet>

        <div className="hidden lg:flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="font-semibold">Bank of the Future</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <RoleSwitcher />
      </div>
    </header>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar className="hidden lg:flex w-64 border-r border-sidebar-border shrink-0" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}

"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import Link from "next/link"
import Image from "next/image"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import {
  Home,
  Wallet,
  CreditCard,
  Landmark,
  TrendingUp,
  HelpCircle,
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
  Sun,
  Moon,
  Monitor,
  X,
  Plus,
  Minus,
  Bell,
} from "lucide-react"
import { DemoHelpTooltip } from "@/components/layout/demo-help-tooltip"

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
  { label: "RM Workspace", href: "/rm-workspace", icon: Users, roles: ["relationship_manager"] },
  { label: "Risk & Compliance", href: "/risk-compliance", icon: ShieldAlert, roles: ["risk_compliance", "admin"] },
  { label: "Admin Console", href: "/admin", icon: Settings, roles: ["admin"] },
  { label: "Audit Log", href: "/audit", icon: ClipboardList, roles: ["risk_compliance", "admin"] },
]

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <Monitor className="h-4 w-4" />
      </Button>
    )
  }

  const getIcon = () => {
    if (theme === "dark") return <Moon className="h-4 w-4" />
    if (theme === "light") return <Sun className="h-4 w-4" />
    return <Monitor className="h-4 w-4" />
  }

  const getLabel = () => {
    if (theme === "dark") return "Dark"
    if (theme === "light") return "Light"
    return "System"
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          {getIcon()}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => setTheme("light")} 
          className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
        >
          <Sun className="h-4 w-4" />
          <span>Light</span>
          {theme === "light" && <Check className="h-4 w-4 ml-auto text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")} 
          className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
        >
          <Moon className="h-4 w-4" />
          <span>Dark</span>
          {theme === "dark" && <Check className="h-4 w-4 ml-auto text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")} 
          className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
        >
          <Monitor className="h-4 w-4" />
          <span>System</span>
          {theme === "system" && <Check className="h-4 w-4 ml-auto text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NotificationBell() {
  const pathname = usePathname()
  const [reviewed, setReviewed] = useState(false)
  const notifications: Array<{ id: string; title: string; summary: string; detail: string }> = []

  if (pathname === "/accounts") {
    notifications.push({
      id: "overdraft-warning",
      title: "Overdraft Warning",
      summary: "Upcoming payment would have caused an overdraft.",
      detail:
        "A monthly payment would have caused an overdraft. I moved AED 1,500 from savings to cover it and will return the funds automatically after your next salary credit—no fees, no action needed.",
    })
  }

  if (notifications.length === 0) {
    return null
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notifications</span>
          {!reviewed && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {notifications.map((notification) => (
            <div key={notification.id} className="rounded-lg border border-border/70 p-3">
              <p className="text-sm font-medium text-foreground">{notification.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{notification.summary}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReviewed(true)}
                >
                  Review
                </Button>
                {reviewed && (
                  <span className="text-xs text-emerald-600">Reviewed</span>
                )}
              </div>
              {reviewed && (
                <div className="mt-3 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  {notification.detail}
                </div>
              )}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function RoleSwitcher() {
  const { currentRole, currentUser, setRole, availableRoles } = useRole()

  if (!currentUser) {
    return null
  }

  const userInitials = currentUser.name
    ?.split(" ")
    .map((n) => n[0])
    .join("") || "U"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={currentUser.avatar || "/placeholder.svg"} alt={currentUser.name || "User"} />
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start">
            <span className="text-sm font-medium text-foreground">{currentUser.name || "User"}</span>
            <span className="text-xs text-muted-foreground capitalize">{currentRole.replace("_", " ")}</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableRoles.map(({ role, label, user }) => {
          const initials = user.name
            ?.split(" ")
            .map((n) => n[0])
            .join("") || "U"
          
          return (
            <DropdownMenuItem 
              key={role} 
              onClick={() => setRole(role)} 
              className="flex items-center gap-3 py-2 focus:bg-accent/50 dark:focus:bg-accent/20"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
              {currentRole === role && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Sidebar({ className, onClose }: { className?: string; onClose?: () => void }) {
  const pathname = usePathname()
  const { currentRole } = useRole()

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true
    if (item.roles.includes("relationship_manager") && canAccessRMWorkspace(currentRole)) return true
    if (item.roles.includes("risk_compliance") && canAccessRiskCompliance(currentRole)) return true
    if (item.roles.includes("admin") && canAccessAdminConsole(currentRole)) return true
    return false
  })

  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // Determine which logo to show - use resolvedTheme to handle system theme
  const isDark = mounted ? (resolvedTheme === "dark") : false
  const logoSrc = isDark ? "/aideology-logo.png" : "/aideology-logo-light.png"

  return (
    <aside className={cn("flex flex-col bg-sidebar text-sidebar-foreground", className)}>
      <div className="flex items-center justify-between px-4 min-h-[120px] border-b border-sidebar-border">
        <div className="flex items-center gap-3 py-8">
          <Image 
            src={logoSrc}
            alt="Aideology" 
            width={192} 
            height={192}
            className="object-contain"
          />
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 lg:hidden hover:bg-sidebar-accent transition-all duration-200 hover:rotate-90"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        )}
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
        <div className="flex items-center gap-4 flex-1">
          <div className="w-9 h-9 lg:hidden" /> {/* Placeholder for menu button */}
          <div className="hidden lg:flex items-center gap-4 flex-1">
            <div className="flex-1 flex justify-center">
              <DemoHelpTooltip />
            </div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4 flex-1">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <Sidebar className="h-full" onClose={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="hidden lg:flex items-center gap-4 flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              const currentZoom = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
              const newZoom = Math.max(12, currentZoom - 2)
              document.documentElement.style.fontSize = `${newZoom}px`
            }}
            title="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              const currentZoom = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
              const newZoom = Math.min(24, currentZoom + 2)
              document.documentElement.style.fontSize = `${newZoom}px`
            }}
            title="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <div className="flex-1 flex justify-center">
            <DemoHelpTooltip />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="lg:hidden">
          <DemoHelpTooltip />
        </div>
        <NotificationBell />
        <ThemeToggle />
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

"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type { UserRole, User } from "./types"
import { CUSTOMER_IDS } from "./customer-ids"
import { users } from "./mock-data"

interface RoleContextType {
  currentRole: UserRole
  currentUser: User
  currentBankingUserId: string
  setRole: (role: UserRole) => void
  availableRoles: { role: UserRole; label: string; user: User }[]
}

const bankingRoleUserMap: Record<UserRole, string> = {
  retail_customer: CUSTOMER_IDS["Sarah Chen"],
  sme_customer: CUSTOMER_IDS["Fatima Hassan"],
  relationship_manager: CUSTOMER_IDS["James Rodriguez"],
  risk_compliance: CUSTOMER_IDS["David Kim"],
  admin: CUSTOMER_IDS["System Administrator"],
}

const callCenterRoleUserMap: Record<UserRole, string> = {
  retail_customer: "4e140685-8f38-49ff-aae0-d6109c46873d", // Sarah Chen
  sme_customer: "e9c42918-fad4-422f-b4ba-24bb5943bb67", // Fatima Hassan
  relationship_manager: "51880b1d-3935-49dd-bac6-9469d33d3ee3", // James Rodriguez
  risk_compliance: "2be06428-7933-41f5-a426-f27478e75c1c", // David Kim
  admin: "730b0c66-1feb-432a-9718-e3a9755eea7b", // System Administrator
}

const roleLabels: Record<UserRole, string> = {
  retail_customer: "Retail Customer",
  sme_customer: "SME Customer",
  relationship_manager: "Relationship Manager",
  risk_compliance: "Risk & Compliance",
  admin: "Admin",
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRole] = useState<UserRole>("retail_customer")

  const currentUser = users.find((u) => u.id === callCenterRoleUserMap[currentRole])!
  const currentBankingUserId = bankingRoleUserMap[currentRole]

  const setRole = useCallback((role: UserRole) => {
    setCurrentRole(role)
  }, [])

  const availableRoles = Object.entries(callCenterRoleUserMap).map(([role, userId]) => ({
    role: role as UserRole,
    label: roleLabels[role as UserRole],
    user: users.find((u) => u.id === userId)!,
  }))

  return (
    <RoleContext.Provider value={{ currentRole, currentUser, currentBankingUserId, setRole, availableRoles }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const context = useContext(RoleContext)
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider")
  }
  return context
}

// Permission helpers
export function canAccessRMWorkspace(role: UserRole): boolean {
  return role === "relationship_manager"
}

export function canAccessRiskCompliance(role: UserRole): boolean {
  return role === "risk_compliance" || role === "admin"
}

export function canAccessAdminConsole(role: UserRole): boolean {
  return role === "admin"
}

export function canAccessAuditLog(role: UserRole): boolean {
  return role === "risk_compliance" || role === "admin"
}

export function isCustomer(role: UserRole): boolean {
  return role === "retail_customer" || role === "sme_customer"
}

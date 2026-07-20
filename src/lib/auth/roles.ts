import type { UserRole } from "@/types/auth";

export const roleLabels: Record<UserRole, string> = {
  superadmin: "SuperAdmin",
  company_admin: "Cégadminisztrátor",
  office: "Iroda",
  surveyor: "Felmérő",
  installer: "Kivitelező",
};

export function canAccessAdmin(role: UserRole | null | undefined) {
  return role === "superadmin" || role === "company_admin";
}

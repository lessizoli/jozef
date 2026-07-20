export type UserRole =
  | "superadmin"
  | "company_admin"
  | "office"
  | "surveyor"
  | "installer";

export interface AppUserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  companyId: string | null;
  active: boolean;
}

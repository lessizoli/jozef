import type { ReactNode } from "react";
import { ProtectedArea } from "@/components/auth/ProtectedArea";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <ProtectedArea>{children}</ProtectedArea>;
}

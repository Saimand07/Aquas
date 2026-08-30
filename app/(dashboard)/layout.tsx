import SidebarLayout from "@/components/SidebarLayout";

export default function DashboardGroup({ children }: { children: React.ReactNode }) {
  return <SidebarLayout>{children}</SidebarLayout>;
}

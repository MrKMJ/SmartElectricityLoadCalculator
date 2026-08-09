import { NavItem } from "@/components/Shell";

const PROFESSIONAL_ROLES = ["PROFESSIONAL", "INSTALLER", "ADMIN", "SUPER_ADMIN"];
const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

export function globalNav(role?: string): NavItem[] {
  const nav: NavItem[] = [
    { label: "Projects", href: "/dashboard", icon: "🏠" },
    { label: "Notifications", href: "/notifications", icon: "🔔" },
  ];
  if (role && PROFESSIONAL_ROLES.includes(role)) {
    nav.push({ label: "Installer Dashboard", href: "/installer", icon: "🧰" });
  }
  nav.push({ label: "Branding", href: "/settings/branding", icon: "🎨" });
  if (role && ADMIN_ROLES.includes(role)) {
    nav.push({ label: "Admin", href: "/admin", icon: "🛠️" });
  }
  return nav;
}

export function adminNav(): NavItem[] {
  return [
    { label: "Overview", href: "/admin", icon: "📈" },
    { label: "Users", href: "/admin/users", icon: "👤" },
    { label: "Appliance Catalog", href: "/admin/catalog", icon: "🔌" },
    { label: "Tariffs", href: "/admin/tariffs", icon: "💵" },
    { label: "Back to app", href: "/dashboard", icon: "←" },
  ];
}

export function projectNav(projectId: string): NavItem[] {
  return [
    { label: "Overview", href: `/projects/${projectId}`, icon: "📊" },
    { label: "Appliances", href: `/projects/${projectId}/appliances`, icon: "🔌" },
    { label: "Calculator", href: `/projects/${projectId}/calculator`, icon: "🧮" },
    { label: "Load Schedule", href: `/projects/${projectId}/schedule`, icon: "🕒" },
    { label: "Bill Estimator", href: `/projects/${projectId}/bill`, icon: "💵" },
    { label: "Energy Savings", href: `/projects/${projectId}/energy-savings`, icon: "🌱" },
    { label: "Inverter", href: `/projects/${projectId}/sizing/inverter`, icon: "🔋" },
    { label: "Battery", href: `/projects/${projectId}/sizing/battery`, icon: "🔋" },
    { label: "Solar", href: `/projects/${projectId}/sizing/solar`, icon: "☀️" },
    { label: "Generator", href: `/projects/${projectId}/sizing/generator`, icon: "🛢️" },
    { label: "Essential Load", href: `/projects/${projectId}/essential-load`, icon: "⚠️" },
    { label: "What-If Scenarios", href: `/projects/${projectId}/scenarios`, icon: "🔀" },
    { label: "Reports", href: `/projects/${projectId}/reports`, icon: "📄" },
    { label: "Members", href: `/projects/${projectId}/members`, icon: "👥" },
  ];
}

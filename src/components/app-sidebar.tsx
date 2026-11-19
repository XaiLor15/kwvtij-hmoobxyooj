import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Wallet,
  Newspaper,
  TreePine,
  Crown,
  Award,
  HandCoins,
  TrendingUp,
  PiggyBank,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

/**
 * Enterprise Information Architecture — 5 top-level groups.
 * Every URL is preserved from the original app to avoid breaking bookmarks,
 * localStorage-keyed state, keyboard shortcuts, or RBAC rules keyed on paths.
 */
const groups = [
  {
    label: "ພາບລວມ",
    items: [{ title: "ໜ້າຫຼັກ", url: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "ຕະກູນ",
    items: [
      { title: "ສະມາຊິກ", url: "/members", icon: Users },
      { title: "ຄະນະນຳ", url: "/leadership", icon: Crown },
      { title: "ຜູ້ອາວຸໂສ", url: "/elders", icon: Award },
    ],
  },
  {
    label: "ກິດຈະກຳ",
    items: [
      { title: "ກິດຈະກຳ", url: "/activities", icon: Calendar },
      { title: "ຂ່າວສານ", url: "/news", icon: Newspaper },
    ],
  },
  {
    label: "ຄັງເງິນ",
    items: [{ title: "ການເງິນ", url: "/finance", icon: Wallet }],
  },
  {
    label: "ກອງທຶນ",
    items: [
      { title: "ຜູ້ເຂົ້າຮ່ວມກອງທຶນ", url: "/fund-contributors", icon: HandCoins },
      { title: "ຕິດຕາມການບໍລິຈາກ", url: "/donation-tracking", icon: TrendingUp },
    ],
  },
] as const;

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const handleMobileNav = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border/70 px-2 py-3">
        <div className="flex items-center gap-2.5 px-1.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TreePine className="h-[18px] w-[18px]" strokeWidth={2} />
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[13px] font-semibold tracking-tight">
                Kwv Tij Hmoob Xyooj
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                ລະບົບຄຸ້ມຄອງຕະກູນ
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-1 px-2 py-3">
        {groups.map((g) => (
          <SidebarGroup key={g.label} className="px-0 py-1">
            <SidebarGroupLabel className="px-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
              {g.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {g.items.map((item) => {
                  const active =
                    currentPath === item.url ||
                    (item.url === "/dashboard" && currentPath === "/");
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className="h-9 rounded-md px-2.5 text-[13px] font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-primary/8 data-[active=true]:text-primary data-[active=true]:font-semibold"
                      >
                        <Link
                          to={item.url}
                          className="flex items-center gap-2.5"
                          onClick={handleMobileNav}
                        >
                          <item.icon
                            className={`h-[17px] w-[17px] shrink-0 ${
                              active ? "text-primary" : "text-muted-foreground"
                            }`}
                            strokeWidth={active ? 2.25 : 1.85}
                          />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
// Keep PiggyBank import so future ຄັງເງິນ sub-items can use it without re-importing.
void PiggyBank;

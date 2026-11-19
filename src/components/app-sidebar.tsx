import { Link, useRouterState } from "@tanstack/react-router";
import { Lock, TreePine } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePermissions } from "@/lib/auth-context";
import { NAV_GROUPS } from "@/lib/nav";

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { isGuest } = usePermissions();
  const collapsed = state === "collapsed" && !isMobile;
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border/70 px-2 py-3">
        <Link
          to="/dashboard"
          className="flex items-center gap-2.5 px-1.5"
          onClick={() => isMobile && setOpenMobile(false)}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TreePine className="h-[18px] w-[18px]" />
          </span>
          {!collapsed && (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-semibold">Kwv Tij Hmoob Xyooj</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                ລະບົບຄຸ້ມຄອງຕະກູນ
              </span>
            </span>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent className="gap-0 px-2 py-2">
        {NAV_GROUPS.map((g) => (
          <SidebarGroup key={g.label} className="px-0 py-1.5">
            <SidebarGroupLabel className="px-2 text-[11px] font-semibold text-muted-foreground/80">
              {g.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {g.items.map((item) => {
                  const active =
                    currentPath === item.url || (item.url === "/dashboard" && currentPath === "/");
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className="h-9 rounded-md px-2.5 text-[13px] font-medium text-sidebar-foreground/85 hover:bg-sidebar-accent data-[active=true]:bg-primary-subtle data-[active=true]:font-semibold data-[active=true]:text-primary"
                      >
                        <Link
                          to={item.url}
                          onClick={() => isMobile && setOpenMobile(false)}
                          aria-current={active ? "page" : undefined}
                        >
                          <item.icon className="h-[17px] w-[17px] shrink-0" />
                          <span className="truncate">{item.title}</span>
                          {item.private && isGuest && (
                            <Lock
                              className="ml-auto h-3 w-3 shrink-0 opacity-50"
                              aria-label="ຕ້ອງເຂົ້າລະບົບ"
                            />
                          )}
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
      {!collapsed && (
        <SidebarFooter className="border-t border-sidebar-border/70 px-4 py-3 text-[11px] text-muted-foreground">
          {isGuest ? "ໂໝດຜູ້ຢ້ຽມຊົມ — ເບິ່ງໄດ້ຢ່າງດຽວ" : "ເຂົ້າລະບົບແລ້ວ"}
        </SidebarFooter>
      )}
    </Sidebar>
  );
}

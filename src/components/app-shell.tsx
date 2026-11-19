import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Calendar,
  LayoutDashboard,
  Menu,
  Moon,
  Search,
  Sun,
  Users,
  Wallet,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/permissions";
import { Link } from "@tanstack/react-router";
import { LogIn, LogOut, User } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMembers } from "@/lib/members-data";
import { BackToHomeButton } from "@/components/enterprise/back-to-home-button";

// ---------- Theme toggle (persisted) ----------
function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("theme")) as
      "light" | "dark" | null;
    const initial: "light" | "dark" =
      saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* noop */
    }
  };
  return { theme, toggle };
}

// ---------- Global Command Palette (⌘K) ----------
function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const pages = [
    { label: "ໜ້າຫຼັກ", to: "/dashboard", icon: LayoutDashboard },
    { label: "ສະມາຊິກ", to: "/members", icon: Users },
    { label: "ກິດຈະກຳ", to: "/activities", icon: Calendar },
    { label: "ການເງິນ", to: "/finance", icon: Wallet },
  ];
  const members = useMembers();
  const matched = q
    ? members
        .filter((m: any) =>
          `${m.name} ${m.nickname ?? ""} ${m.role ?? ""}`.toLowerCase().includes(q.toLowerCase()),
        )
        .slice(0, 8)
    : [];

  const go = (to: string, search?: Record<string, unknown>) => {
    onOpenChange(false);
    navigate({ to, search } as any);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="ຄົ້ນຫາສະມາຊິກ, ກິດຈະກຳ, ໜ້າ..." value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>ບໍ່ພົບຜົນລັບ.</CommandEmpty>
        <CommandGroup heading="ໜ້າ">
          {pages.map((p) => (
            <CommandItem key={p.to} onSelect={() => go(p.to)}>
              <p.icon className="mr-2 h-4 w-4" />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
        {matched.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="ສະມາຊິກ">
              {matched.map((m: any) => (
                <CommandItem key={m.id} onSelect={() => go("/members", { member: m.id })}>
                  <Users className="mr-2 h-4 w-4 text-primary" />
                  <span className="font-medium">{m.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{m.role}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

// ---------- Hamburger trigger ----------
function HamburgerTrigger() {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      aria-label="ເປີດເມນູ"
      className="h-9 w-9 text-muted-foreground hover:text-foreground"
    >
      <Menu className="h-5 w-5" strokeWidth={2} />
    </Button>
  );
}

// ---------- Header ----------
function Header({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { theme, toggle } = useTheme();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const titleMap: Record<string, string> = {
    "/dashboard": "ໜ້າຫຼັກ",
    "/members": "ສະມາຊິກ",
    "/leadership": "ຄະນະນຳ",
    "/elders": "ຜູ້ອາວຸໂສ",
    "/activities": "ກິດຈະກຳ",
    "/news": "ຂ່າວສານ",
    "/finance": "ການເງິນ",
    "/fund-contributors": "ຜູ້ເຂົ້າຮ່ວມກອງທຶນ",
    "/donation-tracking": "ຕິດຕາມການບໍລິຈາກ",
  };
  const title = titleMap[path] ?? "Kwv Tij Hmoob Xyooj";
  const isHome = path === "/dashboard" || path === "/" || path === "/login";

  // Compute upcoming birthdays count (placeholder logic from member ids modulo)
  const notifCount = 3;

  return (
    <header className="sticky top-0 z-40 grid h-14 grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-border/70 bg-background/85 px-3 backdrop-blur-md md:gap-3 md:px-6">
      {/* Hamburger / sidebar trigger */}
      <HamburgerTrigger />

      {/* Page title */}
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold tracking-tight">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-1 justify-self-end">
        <button
          onClick={onOpenSearch}
          className="inline-flex h-9 w-9 items-center justify-center gap-2 rounded-md border border-border bg-muted/50 px-0 text-xs text-muted-foreground transition hover:border-border hover:bg-muted hover:text-foreground md:w-auto md:min-w-[260px] md:px-3"
        >
          <Search className="h-4 w-4 md:h-3.5 md:w-3.5" />
          <span className="hidden md:inline">ຄົ້ນຫາ...</span>
          <kbd className="ml-auto hidden rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground md:inline">
            ⌘K
          </kbd>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              <Bell className="h-[18px] w-[18px]" strokeWidth={1.85} />
              {notifCount > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>ການແຈ້ງເຕືອນ</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex-col items-start gap-0.5">
              <span className="text-sm font-medium">🎂 ວັນເກີດ 3 ຄົນ ໃນອາທິດນີ້</span>
              <span className="text-xs text-muted-foreground">ກວດເບິ່ງລາຍຊື່ໃນໜ້າຫຼັກ</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex-col items-start gap-0.5">
              <span className="text-sm font-medium">📅 ກິດຈະກຳໃໝ່ 2 ລາຍການ</span>
              <span className="text-xs text-muted-foreground">ກອງປະຊຸມຕະກູນ — ສຸກນີ້</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex-col items-start gap-0.5">
              <span className="text-sm font-medium">💰 ລາຍຮັບໃໝ່</span>
              <span className="text-xs text-muted-foreground">ບໍລິຈາກ ₭ 500,000</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={toggle}
          aria-label="theme"
        >
          {theme === "dark" ? (
            <Sun className="h-[18px] w-[18px]" strokeWidth={1.85} />
          ) : (
            <Moon className="h-[18px] w-[18px]" strokeWidth={1.85} />
          )}
        </Button>
        <SessionControl />
      </div>
    </header>
  );
}

function SessionControl() {
  const { session, logout } = useAuth();
  if (session.role === "guest") {
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] font-medium">
          ຜູ້ຢ້ຽມຊົມ
        </Badge>
        <Link to="/login">
          <Button size="sm" variant="default" className="h-9 gap-1.5">
            <LogIn className="h-4 w-4" />
            <span className="hidden md:inline">ເຂົ້າລະບົບສະມາຊິກ</span>
          </Button>
        </Link>
      </div>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="user">
          <User className="h-[18px] w-[18px]" strokeWidth={1.85} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">{session.name ?? session.email}</span>
          <span className="text-xs text-muted-foreground">
            {session.role === "admin" ? "ຜູ້ດູແລລະບົບ" : "ສະມາຊິກ"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-destructive">
          <LogOut className="h-4 w-4 mr-2" /> ອອກຈາກລະບົບ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------- Main exported shell ----------
export function AppShell({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);

  // Bind ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <Header onOpenSearch={() => setSearchOpen(true)} />
        <main id="main-content" className="flex-1 pb-8">
          {children}
        </main>
      </SidebarInset>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </SidebarProvider>
  );
}

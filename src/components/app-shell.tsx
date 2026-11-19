import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Cake,
  CalendarDays,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Newspaper,
  Search,
  Sun,
  UserRound,
  Users,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { NAV_GROUPS } from "@/lib/nav";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
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
import { useAuth } from "@/lib/auth-context";
import { useMembers } from "@/lib/members-data";
import { useEvents } from "@/lib/events-store";
import { useNews } from "@/lib/news-store";
import { normalizeSearchText } from "@/lib/utils";
import { eventsWithin, relativeDayLabel, upcomingBirthdays } from "@/lib/domain/notifications";
import { formatDateLao, memberCode } from "@/lib/domain/format";

// ── Theme (persisted, respects OS preference) ───────────────────────────
function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("theme");
    } catch {
      /* storage blocked */
    }
    const initial =
      saved === "dark" || saved === "light"
        ? saved
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
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
      /* storage blocked */
    }
  };
  return { theme, toggle };
}

// ── Global search (⌘K) ───────────────────────────────────────────────────
function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const members = useMembers();
  const events = useEvents();
  const news = useNews();
  const nq = normalizeSearchText(q);

  const hit = (...fields: (string | undefined)[]) =>
    normalizeSearchText(fields.filter(Boolean).join(" ")).includes(nq);
  const mMatches = nq
    ? members.filter((m) => hit(m.name, m.nickname, memberCode(m.id))).slice(0, 6)
    : [];
  const eMatches = nq ? events.filter((e) => hit(e.title, e.location, e.category)).slice(0, 5) : [];
  const nMatches = nq ? news.filter((n) => hit(n.title, n.summary)).slice(0, 5) : [];

  const go = (fn: () => void) => {
    onOpenChange(false);
    setQ("");
    fn();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      {/* Filtering is done above with Lao-aware normalisation. */}
      <CommandInput placeholder="ຄົ້ນຫາສະມາຊິກ, ກິດຈະກຳ, ຂ່າວ, ໜ້າ..." value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>ບໍ່ພົບຜົນລັບ</CommandEmpty>
        {mMatches.length > 0 && (
          <CommandGroup heading="ສະມາຊິກ">
            {mMatches.map((m) => (
              <CommandItem
                key={`m${m.id}`}
                value={`m-${m.id}-${q}`}
                onSelect={() => go(() => navigate({ to: "/members", search: { member: m.id } }))}
              >
                <Users className="mr-2 h-4 w-4 text-primary" />
                <span className="truncate">{m.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{memberCode(m.id)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {eMatches.length > 0 && (
          <CommandGroup heading="ກິດຈະກຳ">
            {eMatches.map((e) => (
              <CommandItem
                key={`e${e.id}`}
                value={`e-${e.id}-${q}`}
                onSelect={() => go(() => navigate({ to: "/activities", search: { event: e.id } }))}
              >
                <CalendarDays className="mr-2 h-4 w-4 text-primary" />
                <span className="truncate">{e.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">{e.date}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {nMatches.length > 0 && (
          <CommandGroup heading="ຂ່າວສານ">
            {nMatches.map((n) => (
              <CommandItem
                key={`n${n.id}`}
                value={`n-${n.id}-${q}`}
                onSelect={() => go(() => navigate({ to: "/news", search: { news: n.id } }))}
              >
                <Newspaper className="mr-2 h-4 w-4 text-primary" />
                <span className="truncate">{n.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {(mMatches.length > 0 || eMatches.length > 0 || nMatches.length > 0) && (
          <CommandSeparator />
        )}
        <CommandGroup heading="ໜ້າ">
          {NAV_GROUPS.flatMap((g) => g.items)
            .filter((p) => !nq || hit(p.title))
            .map((p) => (
              <CommandItem
                key={p.url}
                value={`p-${p.url}-${q}`}
                onSelect={() => go(() => navigate({ to: p.url }))}
              >
                <p.icon className="mr-2 h-4 w-4" />
                {p.title}
              </CommandItem>
            ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

// ── Notifications (derived from real data) ─────────────────────────────
function Notifications() {
  const members = useMembers();
  const events = useEvents();
  const navigate = useNavigate();
  const { birthdays, soon } = useMemo(() => {
    const now = new Date();
    return { birthdays: upcomingBirthdays(members, now, 7), soon: eventsWithin(events, now, 14) };
  }, [members, events]);
  const count = birthdays.length + soon.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label={count ? `ການແຈ້ງເຕືອນ (${count})` : "ການແຈ້ງເຕືອນ"}
        >
          <Bell className="h-[18px] w-[18px]" />
          {count > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-1rem)]">
        <DropdownMenuLabel>ການແຈ້ງເຕືອນ</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {count === 0 && (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">ບໍ່ມີການແຈ້ງເຕືອນໃໝ່</p>
        )}
        {soon.map(({ event, inDays }) => (
          <DropdownMenuItem
            key={`e${event.id}`}
            className="items-start gap-2.5"
            onSelect={() => navigate({ to: "/activities", search: { event: event.id } })}
          >
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{event.title}</span>
              <span className="block text-xs text-muted-foreground">
                {relativeDayLabel(inDays)} · {formatDateLao(event.date)}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
        {birthdays.map(({ member, inDays }) => (
          <DropdownMenuItem
            key={`b${member.id}`}
            className="items-start gap-2.5"
            onSelect={() => navigate({ to: "/members", search: { member: member.id } })}
          >
            <Cake className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">ວັນເກີດ {member.name}</span>
              <span className="block text-xs text-muted-foreground">
                {relativeDayLabel(inDays)}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SessionControl() {
  const { session, logout } = useAuth();
  if (!session.ready) return <div className="h-9 w-9" aria-hidden />;
  if (session.role === "guest") {
    return (
      <Button asChild size="sm" className="h-9 gap-1.5">
        <Link to="/login">
          <LogIn className="h-4 w-4" />
          <span className="hidden sm:inline">ເຂົ້າລະບົບ</span>
        </Link>
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="ບັນຊີຜູ້ໃຊ້">
          <UserRound className="h-[18px] w-[18px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-semibold">{session.name ?? session.email}</span>
          {session.email && session.name !== session.email && (
            <span className="truncate text-xs font-normal text-muted-foreground">
              {session.email}
            </span>
          )}
          <span className="mt-1 w-fit rounded bg-primary-subtle px-1.5 py-0.5 text-[10px] font-medium text-primary">
            {session.role === "admin" ? "ຜູ້ດູແລລະບົບ" : "ສະມາຊິກ"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => void logout()}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" /> ອອກຈາກລະບົບ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Header({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { theme, toggle } = useTheme();
  const { toggleSidebar } = useSidebar();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const title =
    NAV_GROUPS.flatMap((g) => g.items).find((i) => i.url === path)?.title ??
    (path === "/login" ? "ເຂົ້າລະບົບ" : "Kwv Tij Hmoob Xyooj");

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur md:px-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        aria-label="ເປີດ/ປິດເມນູ"
        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="min-w-0 flex-1 truncate text-[15px] font-semibold">{title}</div>
      <button
        type="button"
        onClick={onOpenSearch}
        aria-label="ຄົ້ນຫາ (Ctrl+K)"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-muted/50 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:w-64 lg:justify-start lg:px-3"
      >
        <Search className="h-4 w-4" />
        <span className="hidden lg:inline">ຄົ້ນຫາ...</span>
        <kbd className="ml-auto hidden rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] lg:inline">
          Ctrl K
        </kbd>
      </button>
      <Notifications />
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={toggle}
        aria-label={theme === "dark" ? "ໂໝດແຈ້ງ" : "ໂໝດມືດ"}
      >
        {theme === "dark" ? (
          <Sun className="h-[18px] w-[18px]" />
        ) : (
          <Moon className="h-[18px] w-[18px]" />
        )}
      </Button>
      <SessionControl />
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);

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
      <SidebarInset className="min-w-0 bg-background">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          ຂ້າມໄປເນື້ອຫາ
        </a>
        <Header onOpenSearch={() => setSearchOpen(true)} />
        <main id="main-content" className="min-w-0 flex-1">
          {children}
        </main>
      </SidebarInset>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </SidebarProvider>
  );
}

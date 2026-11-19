import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { PersonAvatar } from "@/components/enterprise";
import { cn } from "@/lib/utils";
import type { Member } from "@/lib/members-data";

interface Props {
  members: Member[];
  /** Ids to highlight (search matches). Empty = no search. */
  matched: ReadonlySet<number>;
  /** Ids allowed to render (matches + their ancestors). null = all. */
  visible: ReadonlySet<number> | null;
  onSelect: (m: Member) => void;
}

/**
 * Collapsible family tree grouped by branch. Cycle-safe (each member is
 * rendered at most once) and keyboard accessible.
 */
export function FamilyTree({ members, matched, visible, onSelect }: Props) {
  const childrenMap = useMemo(() => {
    const map = new Map<number, Member[]>();
    for (const m of members) {
      if (m.parent == null) continue;
      const list = map.get(m.parent) ?? [];
      list.push(m);
      map.set(m.parent, list);
    }
    for (const list of map.values())
      list.sort(
        (a, b) => (a.birthdate || "9999").localeCompare(b.birthdate || "9999") || a.id - b.id,
      );
    return map;
  }, [members]);

  // Roots: no parent, or parent missing from the list (orphans must not vanish).
  const ids = new Set(members.map((m) => m.id));
  const roots = members.filter((m) => m.parent == null || !ids.has(m.parent));
  const branches = [...new Set(roots.map((r) => r.branch || "ບໍ່ລະບຸກຸ່ມ"))];

  return (
    <div className="space-y-6">
      {branches.map((branch) => {
        const list = roots.filter(
          (r) => (r.branch || "ບໍ່ລະບຸກຸ່ມ") === branch && (!visible || visible.has(r.id)),
        );
        if (!list.length) return null;
        return (
          <section key={branch}>
            <h3 className="mb-2 text-xs font-semibold text-muted-foreground">{branch}</h3>
            <ul role="tree" aria-label={branch} className="space-y-1">
              {list.map((r) => (
                <Node
                  key={r.id}
                  m={r}
                  depth={0}
                  childrenMap={childrenMap}
                  seen={new Set()}
                  matched={matched}
                  visible={visible}
                  onSelect={onSelect}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Node({
  m,
  depth,
  childrenMap,
  seen,
  matched,
  visible,
  onSelect,
}: {
  m: Member;
  depth: number;
  childrenMap: Map<number, Member[]>;
  seen: Set<number>;
  matched: ReadonlySet<number>;
  visible: ReadonlySet<number> | null;
  onSelect: (m: Member) => void;
}) {
  const searching = visible != null;
  const [open, setOpen] = useState(depth < 2);
  if (seen.has(m.id)) return null;
  const nextSeen = new Set(seen).add(m.id);
  const kids = (childrenMap.get(m.id) ?? []).filter((c) => !visible || visible.has(c.id));
  const expanded = searching || open;
  const isMatch = matched.has(m.id);

  return (
    <li role="treeitem" aria-expanded={kids.length ? expanded : undefined} aria-selected={false}>
      <div className="flex items-center gap-1">
        {kids.length ? (
          <button
            type="button"
            onClick={() => setOpen(!expanded)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
            aria-label={expanded ? `ຫຍໍ້ ${m.name}` : `ຂະຫຍາຍ ${m.name}`}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-7 shrink-0" aria-hidden />
        )}
        <button
          type="button"
          onClick={() => onSelect(m)}
          className={cn(
            "flex min-w-0 max-w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/50",
            isMatch ? "border-primary bg-primary-subtle" : "border-border bg-card",
          )}
        >
          <PersonAvatar
            name={m.name}
            photo={m.photo}
            id={m.id}
            size="sm"
            className="h-7 w-7 text-[10px]"
            muted={m.status === "deceased"}
          />
          <span
            className={cn("truncate text-sm", m.status === "deceased" && "text-muted-foreground")}
          >
            {m.name}
          </span>
          <span className="shrink-0 rounded bg-muted px-1.5 text-[10px] text-muted-foreground">
            Phaj {m.gen}
          </span>
          {kids.length > 0 && (
            <span className="shrink-0 text-[10px] text-muted-foreground">{kids.length}</span>
          )}
        </button>
      </div>
      {kids.length > 0 && expanded && (
        <ul role="group" className="ml-3.5 mt-1 space-y-1 border-l border-border pl-2">
          {kids.map((c) => (
            <Node
              key={c.id}
              m={c}
              depth={depth + 1}
              childrenMap={childrenMap}
              seen={nextSeen}
              matched={matched}
              visible={visible}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

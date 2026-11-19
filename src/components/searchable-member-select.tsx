// @ts-nocheck
import { useState } from "react";
import { Check, ChevronsUpDown, User } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { MEMBERS } from "@/lib/members-data";

/**
 * Reusable searchable member dropdown for forms.
 *  - value: selected member id (number | "" | undefined)
 *  - onChange(id|null): called when picked
 *  - members: optional override list (defaults to MEMBERS)
 *  - excludeIds: ids to hide
 *  - placeholder, allowNone (show "— ບໍ່ມີ —")
 */
export function SearchableMemberSelect({
  value,
  onChange,
  members,
  excludeIds = [],
  placeholder = "ເລືອກສະມາຊິກ...",
  allowNone = false,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const list = (members ?? MEMBERS).filter((m) => !excludeIds.includes(m.id));
  const selected = list.find((m) => m.id === Number(value));

  const triggerCls =
    "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" disabled={disabled} className={triggerCls}>
          <span className={cn("flex items-center gap-2 min-w-0", !selected && "text-muted-foreground")}>
            <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {selected ? selected.name : placeholder}
            </span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 pointer-events-auto" align="start">
        <Command
          filter={(val, search) =>
            val.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder="ຄົ້ນຫາຊື່..." className="text-sm" />
          <CommandList>
            <CommandEmpty>
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                ບໍ່ພົບສະມາຊິກ
              </div>
            </CommandEmpty>
            <CommandGroup>
              {allowNone && (
                <CommandItem
                  value="__none__"
                  onSelect={() => { onChange?.(null); setOpen(false); }}
                  className="text-sm text-muted-foreground"
                >
                  — ບໍ່ມີ —
                </CommandItem>
              )}
              {list.map((m) => (
                <CommandItem
                  key={m.id}
                  value={`${m.name} ${m.nickname || ""} ${m.branch || ""}`}
                  onSelect={() => { onChange?.(m.id); setOpen(false); }}
                  className="flex items-center gap-2 py-2"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">{m.name}</span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      Phaj {m.gen} · {m.branch}
                    </span>
                  </div>
                  {selected?.id === m.id && <Check className="h-3.5 w-3.5 text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Position tables
export const LEADER_POSITIONS = [
  "ປະທານ",
  "ຮອງປະທານ",
  "ເລຂາ",
  "ຮອງເລຂາ",
  "ກຳມະການ",
];

export const ELDER_POSITIONS = [
  "ປະທານຜູ້ອາວຸໂສ",
  "ຮອງປະທານ",
  "ທີ່ປຶກສາ",
  "ຜູ້ໃຫ້ພອນ",
  "ຜູ້ໄກ່ເກ່ຍ",
];
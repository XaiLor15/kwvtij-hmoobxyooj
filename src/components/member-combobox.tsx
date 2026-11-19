// @ts-nocheck
import { useState } from "react";
import { Check, ChevronsUpDown, UserPlus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
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
 * Searchable member selector for adding event participants.
 * Props:
 *  - excludeIds: ids already added (hidden / disabled)
 *  - onSelect(memberId): called when a member is picked
 */
export function MemberCombobox({ excludeIds = [], onSelect }) {
  const [open, setOpen] = useState(false);
  const available = MEMBERS.filter((m) => !excludeIds.includes(m.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          className="flex items-center gap-1.5 bg-emerald-700 text-white hover:bg-emerald-600 h-8"
        >
          <UserPlus className="h-3.5 w-3.5" /> ເພີ່ມຜູ້ຮ່ວມ
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="end">
        <Command
          filter={(val, search) =>
            val.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder="ຄົ້ນຫາສະມາຊິກ..." className="text-sm" />
          <CommandList>
            <CommandEmpty>
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                {available.length === 0 ? "ເພີ່ມຄົບທຸກຄົນແລ້ວ" : "ບໍ່ພົບສະມາຊິກ"}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {available.map((m) => (
                <CommandItem
                  key={m.id}
                  value={`${m.name} ${m.nickname} ${m.branch}`}
                  onSelect={() => {
                    onSelect?.(m.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 py-2"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <User className="h-3.5 w-3.5 text-emerald-700" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">{m.name}</span>
                    <span className="truncate text-[11px] text-muted-foreground">{m.branch} · {m.role}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

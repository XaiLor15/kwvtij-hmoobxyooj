// @ts-nocheck
import { useState } from "react";
import { Check, ChevronsUpDown, CalendarDays, Plus, CircleDot } from "lucide-react";
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
import { EVENT_STATUS, getEventStatus } from "@/lib/events-data";

function StatusDot({ event }) {
  const meta = EVENT_STATUS[getEventStatus(event)] ?? EVENT_STATUS.upcoming;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap"
      style={{ backgroundColor: meta.bg, color: meta.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
      {meta.label}
    </span>
  );
}

/**
 * Searchable event selector.
 * Props:
 *  - events: ClanEvent[]  (pass useEvents() result from parent for reactivity)
 *  - value: selected event id (or null)
 *  - onChange(id): called when an event is picked
 *  - onCreate(): called when the user taps "ສ້າງກິດຈະກຳ"
 */
export function EventCombobox({ events = [], value, onChange, onCreate }) {
  const [open, setOpen] = useState(false);
  const selected = events.find((e) => e.id === value) ?? null;
  const hasEvents = events.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-auto min-h-9 w-full justify-between gap-2 px-3 py-2 text-left font-normal"
        >
          {selected ? (
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-foreground">{selected.title}</span>
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="truncate">{selected.date}</span>
                  <span aria-hidden>·</span>
                  <span className="truncate">{selected.category}</span>
                </span>
              </span>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">ເລືອກກິດຈະກຳ...</span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        {hasEvents ? (
          <Command
            filter={(val, search) =>
              val.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
            }
          >
            <CommandInput placeholder="ຄົ້ນຫາກິດຈະກຳ..." className="text-sm" />
            <CommandList>
              <CommandEmpty>
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  ບໍ່ພົບກິດຈະກຳທີ່ຄົ້ນຫາ
                </div>
              </CommandEmpty>
              <CommandGroup>
                {events.map((ev) => (
                  <CommandItem
                    key={ev.id}
                    value={`${ev.title} ${ev.category} ${ev.date}`}
                    onSelect={() => {
                      onChange(ev.id);
                      setOpen(false);
                    }}
                    className="flex items-start gap-2 py-2"
                  >
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0 text-emerald-600",
                        value === ev.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate text-sm font-medium text-foreground">{ev.title}</span>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {ev.date}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CircleDot className="h-3 w-3" />
                          {ev.category}
                        </span>
                        <StatusDot event={ev} />
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        ) : (
          <div className="space-y-3 p-4 text-center">
            <p className="text-sm text-muted-foreground">ຍັງບໍ່ມີກິດຈະກຳໃນລະບົບ</p>
            <Button
              type="button"
              size="sm"
              className="w-full gap-1.5"
              onClick={() => {
                setOpen(false);
                onCreate?.();
              }}
            >
              <Plus className="h-4 w-4" /> ສ້າງກິດຈະກຳ
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

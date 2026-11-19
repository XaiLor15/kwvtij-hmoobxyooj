import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { PersonAvatar } from "@/components/enterprise/person-avatar";
import { cn, normalizeSearchText } from "@/lib/utils";
import { genLabel, memberCode } from "@/lib/domain/format";
import { useMembers, type Member } from "@/lib/members-data";

/**
 * Searchable member picker. Reads the live members store, so newly added
 * members are selectable immediately in every module.
 */
export function SearchableMemberSelect({
  id,
  value,
  onChange,
  placeholder = "ເລືອກສະມາຊິກ...",
  excludeIds,
  disabledIds,
  disabledReason,
  filter,
  allowNone = false,
  invalid = false,
}: {
  id?: string;
  value: number | null | undefined;
  onChange: (id: number | null) => void;
  placeholder?: string;
  excludeIds?: readonly number[];
  disabledIds?: ReadonlySet<number>;
  disabledReason?: string;
  filter?: (m: Member) => boolean;
  allowNone?: boolean;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const members = useMembers();
  const options = useMemo(() => {
    const ex = new Set(excludeIds ?? []);
    return members.filter((m) => !ex.has(m.id) && (!filter || filter(m)));
  }, [members, excludeIds, filter]);
  const selected = value != null ? members.find((m) => m.id === value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            invalid && "border-destructive",
          )}
        >
          {selected ? (
            <>
              <PersonAvatar
                name={selected.name}
                photo={selected.photo}
                id={selected.id}
                size="sm"
                className="h-6 w-6 text-[10px]"
              />
              <span className="min-w-0 flex-1 truncate">{selected.name}</span>
            </>
          ) : (
            <span className="flex-1 truncate text-muted-foreground">{placeholder}</span>
          )}
          {selected && allowNone ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="ລ້າງ"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : (
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[280px] p-0" align="start">
        <Command
          filter={(itemValue, search) =>
            normalizeSearchText(itemValue).includes(normalizeSearchText(search)) ? 1 : 0
          }
        >
          <CommandInput placeholder="ພິມຊື່, ຊື່ຫຼິ້ນ, ລະຫັດ..." />
          <CommandList className="max-h-72">
            <CommandEmpty>ບໍ່ພົບສະມາຊິກ</CommandEmpty>
            <CommandGroup>
              {allowNone && (
                <CommandItem
                  value="__none__ ບໍ່ມີ"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  <span className="text-muted-foreground">— ບໍ່ມີ —</span>
                </CommandItem>
              )}
              {options.map((m) => {
                const disabled = disabledIds?.has(m.id) ?? false;
                return (
                  <CommandItem
                    key={m.id}
                    value={`${m.name} ${m.nickname} ${memberCode(m.id)} ${m.id}`}
                    disabled={disabled}
                    onSelect={() => {
                      if (disabled) return;
                      onChange(m.id);
                      setOpen(false);
                    }}
                    className="gap-2"
                  >
                    <PersonAvatar
                      name={m.name}
                      photo={m.photo}
                      id={m.id}
                      size="sm"
                      className="h-7 w-7 text-[10px]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{m.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {memberCode(m.id)} · {genLabel(m.gen)}
                        {m.nickname ? ` · ${m.nickname}` : ""}
                        {disabled && disabledReason ? ` · ${disabledReason}` : ""}
                      </div>
                    </div>
                    {value === m.id && <Check className="h-4 w-4 text-primary" aria-hidden />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

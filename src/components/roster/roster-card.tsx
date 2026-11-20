import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PersonAvatar } from "@/components/enterprise";
import { cn } from "@/lib/utils";
import { useTilt } from "@/hooks/use-tilt";

export interface RosterActions {
  onEdit?: () => void;
  onMove?: (dir: -1 | 1) => void;
  onToggleActive?: () => void;
  onDelete?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

/** Person card used by Leadership and Elders. */
export function RosterCard({
  name,
  photo,
  id,
  memberId,
  title,
  subtitle,
  badges,
  body,
  active,
  muted,
  actions,
}: {
  name: string;
  photo: string | null;
  id: number;
  memberId?: number;
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  body?: ReactNode;
  active: boolean;
  muted?: boolean;
  actions: RosterActions;
}) {
  const tilt = useTilt<HTMLElement>(5);
  const hasMenu = actions.onEdit || actions.onMove || actions.onToggleActive || actions.onDelete;
  return (
    <article
      {...tilt}
      className={cn(
        "tilt-card flex h-full flex-col rounded-lg border border-border bg-card p-4 shadow-sm",
        !active && "border-dashed opacity-70",
      )}
    >
      <div className="flex items-start gap-3">
        <PersonAvatar
          name={name}
          photo={photo}
          id={id}
          size="lg"
          muted={muted}
          className="tilt-pop"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{name}</h3>
          <p className="truncate text-xs font-medium text-primary">{title}</p>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {hasMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="-mr-2 -mt-1 h-8 w-8 shrink-0"
                aria-label={`ຈັດການ ${name}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.onEdit && (
                <DropdownMenuItem onSelect={actions.onEdit}>
                  <Pencil className="mr-2 h-4 w-4" /> ແກ້ໄຂ
                </DropdownMenuItem>
              )}
              {actions.onMove && (
                <>
                  <DropdownMenuItem
                    disabled={actions.isFirst}
                    onSelect={() => actions.onMove?.(-1)}
                  >
                    <ArrowUp className="mr-2 h-4 w-4" /> ເລື່ອນຂຶ້ນ
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={actions.isLast} onSelect={() => actions.onMove?.(1)}>
                    <ArrowDown className="mr-2 h-4 w-4" /> ເລື່ອນລົງ
                  </DropdownMenuItem>
                </>
              )}
              {actions.onToggleActive && (
                <DropdownMenuItem onSelect={actions.onToggleActive}>
                  {active ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                  {active ? "ເຊື່ອງຈາກໜ້າຫຼັກ" : "ສະແດງໃນໜ້າຫຼັກ"}
                </DropdownMenuItem>
              )}
              {actions.onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={actions.onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> ລຶບ
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {badges && <div className="mt-3 flex flex-wrap gap-1.5">{badges}</div>}
      {body && <div className="mt-3 flex-1 text-sm text-muted-foreground">{body}</div>}
      {memberId != null && (
        <Link
          to="/members"
          search={{ member: memberId }}
          className="mt-3 inline-flex items-center gap-1 self-start text-xs text-primary hover:underline"
        >
          <UserRound className="h-3 w-3" /> ເບິ່ງຂໍ້ມູນສະມາຊິກ
        </Link>
      )}
    </article>
  );
}

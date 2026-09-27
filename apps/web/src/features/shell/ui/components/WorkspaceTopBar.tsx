import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowLeft, PanelLeft, PanelRight } from "lucide-react";
import type { ReactNode } from "react";

import { Button, buttonVariants } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Separator } from "@/components/ui/Separator";
import { useCurrentUser } from "@/features/auth";
import type { WorkspaceBackLink } from "@/features/shell/typedefs";

import { AccountMenuContent } from "./AccountMenuContent";
import { UserAvatar } from "./UserAvatar";

interface WorkspaceTopBarProps {
  back: WorkspaceBackLink;
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  toolLabel: string;
  tabsLabel: string;
  toolOpen: boolean;
  tabsOpen: boolean;
  onToggleTool: () => void;
  onToggleTabs: () => void;
}

export function WorkspaceTopBar({
  back,
  title,
  meta,
  actions,
  toolLabel,
  tabsLabel,
  toolOpen,
  tabsOpen,
  onToggleTool,
  onToggleTabs,
}: WorkspaceTopBarProps) {
  const user = useCurrentUser();

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-2 sm:px-3">
      <Link
        to={back.to}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "shrink-0 text-muted-foreground",
        )}
      >
        <ArrowLeft aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">{back.label}</span>
      </Link>
      <Separator
        orientation="vertical"
        className="data-vertical:h-4 data-vertical:self-center"
      />
      <div className="flex min-w-0 flex-1 items-baseline gap-2 px-1">
        <h1 className="truncate text-sm font-semibold">{title}</h1>
        {meta ? (
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
            {meta}
          </span>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
      <div className="flex shrink-0 items-center">
        <Button
          variant="ghost"
          size="icon"
          aria-label={toolOpen ? `Hide ${toolLabel}` : `Show ${toolLabel}`}
          aria-pressed={toolOpen}
          onClick={onToggleTool}
        >
          <PanelLeft aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={tabsOpen ? `Hide ${tabsLabel}` : `Show ${tabsLabel}`}
          aria-pressed={tabsOpen}
          onClick={onToggleTabs}
        >
          <PanelRight aria-hidden="true" />
        </Button>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              aria-label={`Account menu for ${user.name}`}
            />
          }
        >
          <UserAvatar className="size-7" />
        </DropdownMenuTrigger>
        <AccountMenuContent side="bottom" align="end" />
      </DropdownMenu>
    </header>
  );
}

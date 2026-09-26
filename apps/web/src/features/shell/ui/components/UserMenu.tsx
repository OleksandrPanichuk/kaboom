import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronsUpDown, LogOut, ShieldCheck } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/Sidebar";
import { signOutMutation, useCurrentUser } from "@/features/auth";
import { initials } from "@/features/shell/utils";

interface UserMenuProps {
  onSignedOut: () => void;
}

export function UserMenu({ onSignedOut }: UserMenuProps) {
  const user = useCurrentUser();
  const signOut = useMutation(signOutMutation);
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                aria-label={`Account menu for ${user.name}`}
                className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar className="rounded-lg after:rounded-lg">
              <AvatarFallback className="rounded-lg bg-indigo-50 text-xs font-semibold text-indigo-700">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <span className="grid min-w-0 flex-1 text-left leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </span>
            <ChevronsUpDown aria-hidden="true" className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? "top" : "right"}
            align="end"
            sideOffset={8}
            className="min-w-56"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-medium text-foreground">
                  {user.name}
                </span>
                <span className="truncate font-normal">{user.email}</span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={<Link to="/settings/security" />}
              onClick={() => setOpenMobile(false)}
            >
              <ShieldCheck aria-hidden="true" />
              Security settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={signOut.isPending}
              onClick={() =>
                signOut.mutate(undefined, { onSettled: onSignedOut })
              }
            >
              <LogOut aria-hidden="true" />
              {signOut.isPending ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

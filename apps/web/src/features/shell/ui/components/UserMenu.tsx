import { ChevronsUpDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/Sidebar";
import { useCurrentUser } from "@/features/auth";

import { AccountMenuContent } from "./AccountMenuContent";
import { UserAvatar } from "./UserAvatar";

export function UserMenu() {
  const user = useCurrentUser();
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
            <UserAvatar />
            <span className="grid min-w-0 flex-1 text-left leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </span>
            <ChevronsUpDown aria-hidden="true" className="ml-auto" />
          </DropdownMenuTrigger>
          <AccountMenuContent
            side={isMobile ? "top" : "right"}
            align="end"
            onNavigate={() => setOpenMobile(false)}
          />
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

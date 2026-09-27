import { Link } from "@tanstack/react-router";

import { BrandMark } from "@/components/BrandMark";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/Sidebar";
import { NAVIGATION, type NavItem } from "@/features/shell/constants";
import { isNavItemActive, usePathname } from "@/features/shell/hooks";

import { UserMenu } from "./UserMenu";

export function AppSidebar() {
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Kaboom"
              render={<Link to="/" onClick={() => setOpenMobile(false)} />}
            >
              <BrandMark />
              <span className="truncate text-base font-semibold tracking-[-0.02em]">
                Kaboom
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAVIGATION.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <NavMenuItem
                    key={item.label}
                    item={item}
                    onNavigate={() => setOpenMobile(false)}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

interface NavMenuItemProps {
  item: NavItem;
  onNavigate: () => void;
}

function NavMenuItem({ item, onNavigate }: NavMenuItemProps) {
  const pathname = usePathname();
  const Icon = item.icon;

  if ("soon" in item) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          aria-disabled="true"
          tooltip={`${item.label} · coming soon`}
          className="cursor-default text-sidebar-foreground/55 hover:bg-transparent hover:text-sidebar-foreground/55 active:bg-transparent active:text-sidebar-foreground/55"
        >
          <Icon aria-hidden="true" />
          <span>{item.label}</span>
        </SidebarMenuButton>
        <SidebarMenuBadge className="rounded-full border border-sidebar-border px-1.5 text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
          Soon
        </SidebarMenuBadge>
      </SidebarMenuItem>
    );
  }

  const active = isNavItemActive(item, pathname);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        tooltip={item.label}
        render={
          <Link
            to={item.to}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
          />
        }
      >
        <Icon aria-hidden="true" />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

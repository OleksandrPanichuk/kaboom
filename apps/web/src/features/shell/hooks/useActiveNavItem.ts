import { useRouterState } from "@tanstack/react-router";

import {
  ACCOUNT_LINKS,
  NAVIGATION,
  type NavItem,
  type NavLinkItem,
} from "@/features/shell/constants";

const isLink = (item: NavItem): item is NavLinkItem => "to" in item;

export const isNavItemActive = (
  item: NavLinkItem,
  pathname: string,
): boolean =>
  item.exact
    ? pathname === item.to
    : pathname === item.to || pathname.startsWith(`${item.to}/`);

export const usePathname = (): string =>
  useRouterState({ select: (state) => state.location.pathname });

export const useActiveNavItem = (): NavLinkItem | undefined => {
  const pathname = usePathname();

  return [...NAVIGATION.flatMap((group) => group.items), ...ACCOUNT_LINKS]
    .filter(isLink)
    .find((item) => isNavItemActive(item, pathname));
};

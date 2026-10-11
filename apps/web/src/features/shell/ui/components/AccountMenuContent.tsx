import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import type { ComponentProps } from "react";

import {
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";
import { signOutMutation, useCurrentUser } from "@/features/auth";
import { ACCOUNT_LINKS } from "@/features/shell/constants";
import { type ThemePreference, useThemeStore } from "@/features/shell/store";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Match the system", icon: Monitor },
] as const;

type ContentProps = ComponentProps<typeof DropdownMenuContent>;

interface AccountMenuContentProps {
  side: ContentProps["side"];
  align: ContentProps["align"];
  onNavigate?: () => void;
}

export function AccountMenuContent({
  side,
  align,
  onNavigate,
}: AccountMenuContentProps) {
  const user = useCurrentUser();
  const signOut = useMutation(signOutMutation);
  const navigate = useNavigate();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  return (
    <DropdownMenuContent
      side={side}
      align={align}
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
      <DropdownMenuGroup>
        {ACCOUNT_LINKS.map((link) => (
          <DropdownMenuItem
            key={link.to}
            render={<Link to={link.to} />}
            onClick={onNavigate}
          >
            <link.icon aria-hidden="true" />
            {link.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as ThemePreference)}
        >
          {THEMES.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <option.icon aria-hidden="true" />
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        disabled={signOut.isPending}
        onClick={() =>
          signOut.mutate(undefined, {
            onSettled: () => void navigate({ to: "/sign-in" }),
          })
        }
      >
        <LogOut aria-hidden="true" />
        {signOut.isPending ? "Signing out…" : "Sign out"}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

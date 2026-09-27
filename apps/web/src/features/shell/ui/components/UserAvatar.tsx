import { cn } from "cn";

import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { useCurrentUser } from "@/features/auth";
import { initials } from "@/features/shell/utils";

interface UserAvatarProps {
  className?: string;
}

export function UserAvatar({ className }: UserAvatarProps) {
  const user = useCurrentUser();

  return (
    <Avatar className={cn("rounded-lg after:rounded-lg", className)}>
      <AvatarFallback className="rounded-lg bg-indigo-50 text-xs font-semibold text-indigo-700">
        {initials(user.name)}
      </AvatarFallback>
    </Avatar>
  );
}

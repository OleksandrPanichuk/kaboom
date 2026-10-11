import { cn } from "cn";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { initialsOf } from "@/features/profile/utils";

interface UserAvatarProps {
  name: string;
  url: string | null;
  size?: "sm" | "default" | "lg" | "xl";
  className?: string;
}

export function UserAvatar({
  name,
  url,
  size = "default",
  className,
}: UserAvatarProps) {
  return (
    <Avatar
      size={size === "xl" ? "lg" : size}
      className={cn(size === "xl" && "size-20 sm:size-24", className)}
    >
      {url ? <AvatarImage src={url} alt="" /> : null}
      <AvatarFallback
        className={cn(
          "bg-interactive-surface font-medium text-interactive-foreground",
          size === "xl" && "text-2xl",
        )}
      >
        {initialsOf(name) || "?"}
      </AvatarFallback>
    </Avatar>
  );
}

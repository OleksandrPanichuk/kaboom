import type { PublicProfileModel } from "@repo/api-client";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { EyeOff, Link2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/Button";
import { linkLabel } from "@/features/profile/utils";

import { UserAvatar } from "./UserAvatar";

interface ProfileHeaderProps {
  profile: PublicProfileModel;
}

const joined = (at: string) =>
  new Date(at).toLocaleDateString("en", { month: "long", year: "numeric" });

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_12px_36px_-28px_rgba(24,24,27,0.45)] sm:flex-row sm:items-start sm:p-6">
      <UserAvatar
        name={profile.displayName}
        url={profile.avatarUrl}
        size="xl"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="truncate text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              {profile.displayName}
            </h1>
            <p className="text-sm text-muted-foreground">
              @{profile.handle} · joined {joined(profile.joinedAt)}
            </p>
          </div>
          {profile.own ? (
            <Link
              to="/settings/profile"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Edit profile
            </Link>
          ) : null}
        </div>
        {profile.own && !profile.visible ? (
          <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <EyeOff aria-hidden="true" className="size-4 shrink-0" />
            Only you can see this profile, and you're off the leaderboard.
          </p>
        ) : null}
        {profile.bio ? (
          <p className="text-sm leading-6 whitespace-pre-line text-pretty">
            {profile.bio}
          </p>
        ) : null}
        {profile.links.length > 0 ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
            {profile.links.map((link) => (
              <li key={link} className="min-w-0">
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer nofollow ugc"
                  className="flex min-w-0 items-center gap-1.5 text-sm text-indigo-700 hover:underline"
                >
                  <Link2 aria-hidden="true" className="size-3.5 shrink-0" />
                  <span className="truncate">{linkLabel(link)}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

import { useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { profileQuery } from "@/features/profile/api";
import {
  ProfileHeader,
  ProfileStats,
  RecentSubmissions,
} from "@/features/profile/ui/components";
import { SkillBars } from "@/features/skills";

interface PublicProfileViewProps {
  handle: string;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_12px_36px_-28px_rgba(24,24,27,0.45)] sm:p-5">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function PublicProfileView({ handle }: PublicProfileViewProps) {
  const { data } = useSuspenseQuery(profileQuery(handle));
  const reviewed = data.skills.some((skill) => skill.score !== null);

  return (
    <div className="flex-1 bg-zinc-50/70 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <ProfileHeader profile={data} />
        <ProfileStats standing={data.standing} />
        <div className="grid gap-6 md:grid-cols-2">
          <Panel title="Skills">
            {reviewed ? (
              <SkillBars
                skills={data.skills.filter((skill) => skill.score !== null)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No reviewed work yet.
              </p>
            )}
          </Panel>
          <Panel title="Recent challenges">
            <RecentSubmissions recent={data.recent} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

import type { InterviewDimension } from "@repo/scoring";

import type { ProfileRow } from "@/db";

import { avatarUrl } from "./profile.avatar";
import type { MyProfileModel, PublicProfileModel } from "./profile.model";

export interface ProfileEntity extends ProfileRow {}

export interface ProfileStanding {
  points: number;
  solved: number;
  position: number | null;
}

export interface ProfileSkill {
  skill: InterviewDimension;
  label: string;
  score: number | null;
  samples: number;
}

export interface ProfileSubmission {
  problem: { slug: string; title: string };
  score: number;
  at: Date;
}

export interface PublicProfileView {
  profile: ProfileEntity;
  own: boolean;
  standing: ProfileStanding;
  skills: ProfileSkill[];
  recent: ProfileSubmission[];
}

export class ProfileEntity {
  public static normalizeMine(profile: ProfileEntity): MyProfileModel {
    return {
      handle: profile.handle,
      displayName: profile.displayName,
      bio: profile.bio,
      links: profile.links,
      avatarUrl: avatarUrl(profile.avatarKey),
      visible: profile.visible,
    };
  }

  public static normalizePublic(
    view: PublicProfileView,
    rankName: (points: number) => string,
  ): PublicProfileModel {
    return {
      handle: view.profile.handle,
      displayName: view.profile.displayName,
      bio: view.profile.bio,
      links: view.profile.links,
      avatarUrl: avatarUrl(view.profile.avatarKey),
      joinedAt: view.profile.createdAt.toISOString(),
      own: view.own,
      visible: view.profile.visible,
      standing: {
        ...view.standing,
        rank: rankName(view.standing.points),
      },
      skills: view.skills,
      recent: view.recent.map((submission) => ({
        problem: submission.problem,
        score: submission.score,
        at: submission.at.toISOString(),
      })),
    };
  }
}

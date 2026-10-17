import type { DesignGraph, Track } from "@repo/design";
import type { InterviewDimension } from "@repo/scoring";

import { getEnv } from "@/configs";
import type { DesignKind, ShareSubject } from "@/db";
import { avatarUrl } from "@/modules/profiles/profile.avatar";

import type { SharedModel, ShareModel } from "./share.model";

export interface ShareEntity {
  id: string;
  token: string;
  ownerId: string;
  subject: ShareSubject;
  subjectId: string;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface SharedOwner {
  handle: string;
  displayName: string;
  avatarKey: string | null;
}

export interface SharedInterviewItem {
  title: string;
  dimension: InterviewDimension;
  weight: number;
  score: number | null;
  rationale: string;
}

export interface SharedInterview {
  problem: {
    slug: string;
    title: string;
    track: Track;
    difficulty: string;
  };
  score: number | null;
  designScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  items: SharedInterviewItem[];
  endedAt: Date | null;
}

export interface SharedView {
  share: ShareEntity;
  title: string;
  kind: DesignKind;
  graph: DesignGraph;
  layout: Record<string, { x: number; y: number }>;
  owner: SharedOwner | null;
  interview: SharedInterview | null;
}

export const shareLinks = (token: string) => {
  const origin = getEnv().APP_URL;

  return {
    url: `${origin}/api/s/${token}`,
    pageUrl: `${origin}/shared/${token}`,
    imageUrl: `${origin}/api/shared/${token}/image.png`,
  };
};

export class ShareEntity {
  public static normalize(entity: ShareEntity): ShareModel {
    const { url, imageUrl } = shareLinks(entity.token);

    return {
      token: entity.token,
      url,
      imageUrl,
      subject: entity.subject,
      subjectId: entity.subjectId,
      createdAt: entity.createdAt.toISOString(),
    };
  }

  public static normalizeView(view: SharedView): SharedModel {
    const { url, imageUrl } = shareLinks(view.share.token);

    return {
      subject: view.share.subject,
      title: view.title,
      kind: view.kind,
      sharedAt: view.share.createdAt.toISOString(),
      url,
      imageUrl,
      owner: view.owner
        ? {
            handle: view.owner.handle,
            displayName: view.owner.displayName,
            avatarUrl: avatarUrl(view.owner.avatarKey),
          }
        : null,
      graph: view.graph,
      layout: view.layout,
      interview: view.interview
        ? {
            ...view.interview,
            endedAt: view.interview.endedAt?.toISOString() ?? null,
          }
        : null,
    };
  }
}

import { Share2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import type { ShareSubject } from "@/features/sharing/typedefs";

import { ShareDialog } from "./ShareDialog";

interface ShareButtonProps {
  subject: ShareSubject;
  subjectId: string;
  className?: string;
}

export function ShareButton({
  subject,
  subjectId,
  className,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        aria-label="Share"
        className={className}
        onClick={() => setOpen(true)}
      >
        <Share2 aria-hidden="true" />
        <span className="hidden sm:inline">Share</span>
      </Button>
      <ShareDialog
        subject={subject}
        subjectId={subjectId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

import type { DesignEntity } from "@/modules/designs";
import type {
  ProblemVersionEntity,
  ProblemWithContent,
} from "@/modules/problems";

import type { AttemptEntity } from "../submission.entity";

export interface AttemptContext {
  found: ProblemWithContent;
  attempt: AttemptEntity;
  version: ProblemVersionEntity;
  design: DesignEntity;
}

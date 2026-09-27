import { t } from "elysia";

import { MESSAGE_MAX_LENGTH } from "../interviews.constants";

export const PostInterviewMessageInput = t.Object({
  body: t.String({ minLength: 1, maxLength: MESSAGE_MAX_LENGTH }),
});
export type PostInterviewMessageInput = typeof PostInterviewMessageInput.static;

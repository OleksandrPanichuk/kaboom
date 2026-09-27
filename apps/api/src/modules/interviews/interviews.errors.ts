import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class InterviewNotFoundError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "INTERVIEW_NOT_FOUND";
}

export class InterviewNotActiveError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "INTERVIEW_NOT_ACTIVE";
}

export class InterviewAlreadyActiveError extends ModuleError {
  public readonly status = HttpStatus.Conflict;
  public readonly code = "INTERVIEW_ALREADY_ACTIVE";
}

export class ProblemNotInterviewableError extends ModuleError {
  public readonly status = HttpStatus.UnprocessableEntity;
  public readonly code = "PROBLEM_NOT_INTERVIEWABLE";
}

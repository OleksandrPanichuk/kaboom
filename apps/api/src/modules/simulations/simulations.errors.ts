import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class SimulationRunNotFoundError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "SIMULATION_RUN_NOT_FOUND";
}

export class SimulationScenarioInvalidError extends ModuleError {
  public readonly status = HttpStatus.UnprocessableEntity;
  public readonly code = "SIMULATION_SCENARIO_INVALID";
}

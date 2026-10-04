import { testDesign } from "@/platform/design-testing/design-testing.helpers";
import {
  DesignTester,
  type DesignTestRequest,
  type DesignTestResult,
} from "@/platform/design-testing/ports";

export class InlineDesignTester extends DesignTester {
  public test(request: DesignTestRequest): Promise<DesignTestResult> {
    return Promise.resolve(testDesign(request));
  }

  public close(): Promise<void> {
    return Promise.resolve();
  }
}

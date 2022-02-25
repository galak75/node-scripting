import { TESTING_SCRIPT_NAME_PREFIX } from "../../src";
import { CoreScriptBase } from "../../src/coreScriptBase";

export class TestingCoreScript extends CoreScriptBase {
  get name(): string {
    return `${TESTING_SCRIPT_NAME_PREFIX}testingCoreScript`;
  }

  get description(): string {
    return `A simple testing core script`;
  }

  protected async main() {
    this.logger.info(`in main`);
  }
}

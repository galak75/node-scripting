import { CoreScriptBase } from "../coreScriptBase";

export class LintScript extends CoreScriptBase {
  get name(): string {
    return "lint";
  }

  get description(): string {
    return `Run the ESlint validation.`;
  }

  protected async main() {
    await this.invokeShellCommand("eslint", []);
  }
}

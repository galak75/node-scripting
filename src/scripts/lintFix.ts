import { CoreScriptBase } from "../coreScriptBase";
export class LintFixScript extends CoreScriptBase {
  get name(): string {
    return "lint-fix";
  }

  get description(): string {
    return (
      `Fix the project formating using the Prettier rules` +
      `Fix the project formating using the ESLint rules. Note that some ESLint errors may not` +
      `be fixable automatically and may need manual help.`
    );
  }

  protected async main() {
    await this.invokeShellCommand('eslint', ['--fix']);
  }
}

import { CoreScriptBase } from '../coreScriptBase';
import { PrettierFixScript } from './prettierFix';
import { TsLintFixScript } from './tsLintFix';

export class LintFixScript extends CoreScriptBase {
  get name(): string {
    return 'lint-fix';
  }

  get description(): string {
    return (
      `Fix the project formating using the Prettier rules` +
      `and the TSLint rules. Note that some TSLint errors may not` +
      `be fixable automatically and may need manual help.`
    );
  }

  protected async main() {
    await this.invokeScript(PrettierFixScript, {}, {});
    await this.invokeScript(TsLintFixScript, {}, {});
  }
}

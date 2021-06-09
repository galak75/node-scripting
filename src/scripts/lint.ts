import { CoreScriptBase } from '../coreScriptBase';
import { PrettierScript } from './prettier';
import { TsLintScript } from './tsLint';

export class LintScript extends CoreScriptBase {
  get name(): string {
    return 'lint';
  }

  get description(): string {
    return `Run the Prettier and TSlint validation.`;
  }

  protected async main() {
    await this.invokeScript(PrettierScript, {}, {});
    await this.invokeScript(TsLintScript, {}, {});
  }
}

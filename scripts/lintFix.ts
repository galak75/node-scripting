import { ScriptBase } from '../src';
import { configs } from '../src/config/configs';

export class LintFixScript extends ScriptBase {
  get name(): string {
    return 'lint-fix';
  }

  get description(): string {
    return `Fix the code using ESLint validation (including TSLint and Prettier rules).`;
  }

  protected async main() {
    await this.invokeShellCommand(`${configs.libRoot}/node_modules/.bin/eslint`, [
      '--fix',
      configs.libRoot,
    ]);
  }
}

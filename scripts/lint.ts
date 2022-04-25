import { ScriptBase } from '../src';
import { configs } from '../src/config/configs';

export class LintScript extends ScriptBase {
  get name(): string {
    return 'lint';
  }

  get description(): string {
    return `Run the ESLint validation (including TSLint and Prettier rules).`;
  }

  protected async main() {
    await this.invokeShellCommand(`${configs.libRoot}/node_modules/.bin/eslint`, [configs.libRoot]);
  }
}

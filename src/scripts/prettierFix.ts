import { configs } from '../config/configs';
import { CoreLintScriptBase } from '../coreLintScriptBase';

export class PrettierFixScript extends CoreLintScriptBase {
  get name(): string {
    return 'prettier-fix';
  }

  get description(): string {
    return `Fix the project formating using the Prettier rules.`;
  }

  protected async main() {
    const { prettierFix } = require(`${configs.projectRoot}/node_modules/@villemontreal/lint-config-villemontreal`);
    await prettierFix(configs.projectRoot);
  }
}

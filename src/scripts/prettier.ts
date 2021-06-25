import { configs } from '../config/configs';
import { CoreLintScriptBase } from '../coreLintScriptBase';

export class PrettierScript extends CoreLintScriptBase {
  get name(): string {
    return 'prettier';
  }

  get description(): string {
    return `Validate that the project respects the Prettier rules.`;
  }

  protected async main() {
    const { prettierCheck } = require(`${configs.projectRoot}/node_modules/@villedemontreal/lint-config`);
    await prettierCheck(configs.projectRoot);
  }
}

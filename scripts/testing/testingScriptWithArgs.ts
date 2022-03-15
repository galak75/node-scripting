import { Command, program as caporal } from '@caporal/core';
import { IGlobalOptions, ScriptBase, TESTING_SCRIPT_NAME_PREFIX } from '../../src';

export type Args = {
  name: string;
};

export interface Options {
  port: number;
  delay?: number;
  throwError?: boolean;
}

export class TestingScriptWithArgs extends ScriptBase<Options, IGlobalOptions, Args> {
  get name(): string {
    return `${TESTING_SCRIPT_NAME_PREFIX}testingScriptWithArgs`;
  }

  get description(): string {
    return `Example of script with arguments and options that will be called by another script.`;
  }

  protected async configure(command: Command): Promise<void> {
    command.argument(`<name>`, `a name`);
    command.option(`--port <number>`, `A port number`, {
      required: true,
      validator: caporal.NUMBER,
    });
    command.option(`--delay <number>`, `A delay in ms`, {
      validator: caporal.NUMBER,
    });
    command.option(`--throwError`, `Throw an error`);
  }

  protected async main() {
    this.logger.info(
      `Start service ${this.args.name} on port ${this.options.port} with delay ${this.options.delay}, --verbose: ${this.options.verbose}`
    );
    if (this.options.throwError) {
      throw new Error('Some error...');
    }
  }
}

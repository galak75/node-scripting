import { Command, program as caporal } from "@caporal/core";
import { ScriptBase, TESTING_SCRIPT_NAME_PREFIX } from "../../src";

export interface Options {
  username: string;
}

export class TestingtestingHiddenScript extends ScriptBase<Options> {
  get name(): string {
    return `${TESTING_SCRIPT_NAME_PREFIX}testingHiddenScript`;
  }

  get description(): string {
    return `A testing hidden script`;
  }

  protected async configure(command: Command): Promise<void> {
    command.hide();
    command.option(`--username <name>`, `A username`, {
      required: true,
      validator: caporal.STRING,
    });
  }

  protected async main() {
    this.logger.info(`username is ${this.options.username}`);
  }
}

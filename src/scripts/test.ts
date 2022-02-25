import { Command, program } from "@caporal/core";
import { CoreScriptBase } from "../coreScriptBase";
import { LintScript } from "./lint";
import { TestUnitsScript } from "./testUnits";

export interface Options {
  bail?: boolean;
  jenkins?: boolean;
  report?: string;
}

export class TestScript extends CoreScriptBase<Options> {
  get name(): string {
    return "test";
  }

  get description(): string {
    return (
      `Run the unit tests + the linting validations. If your project ` +
      `has extra validations to perform in its "test" script, you can create a ` +
      `custom script named "test", add your extra validations and invoke ` +
      `this core script inside of it. By using the same name ("test") for your script, ` +
      `it will override this one.`
    );
  }

  protected async configure(command: Command): Promise<void> {
    command.option(`--bail`, `Stop the execution of the tests as soon as an error occures.`);
    command.option(`--jenkins`, `Configure the tests to be run by Jenkins.`);
    command.option(
      `--report <path>`,
      `The relative path to the report, when the tests are run for Jenkins.`,
      {
        default: `output/test-results/report.xml`,
        validator: program.STRING,
      }
    );
  }

  protected async main() {
    await this.invokeScript(LintScript, {}, {});
    await this.invokeScript(TestUnitsScript, this.options, {});
  }
}

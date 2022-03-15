import { Command, program } from '@caporal/core';
import * as path from 'path';
import { configs } from '../config/configs';
import { ScriptBase } from '../scriptBase';

export interface Options {
  report?: string;
}

export class ShowCoverageScript extends ScriptBase<Options> {
  get name(): string {
    return 'show-coverage';
  }

  get description(): string {
    return `Open the tests coverage report.`;
  }

  protected get requiredDependencies(): string[] {
    return ['nyc'];
  }

  protected async configure(command: Command): Promise<void> {
    command.option(`--report <path>`, `The relative path to the coverage report directory.`, {
      default: `output/coverage`,
      validator: program.STRING,
    });
  }

  protected async main() {
    if (configs.isWindows) {
      await this.invokeShellCommand('start', ['', this.getReportDir()], {
        useShellOption: true,
      });
    } else {
      await this.invokeShellCommand('open', [this.getReportDir()]);
    }
  }

  protected getReportDir() {
    const reportDir = path.resolve(
      configs.projectRoot,
      this.options.report,
      'lcov-report/index.html'
    );
    return reportDir;
  }
}

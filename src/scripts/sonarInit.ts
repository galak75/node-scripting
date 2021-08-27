import { Command } from '@caporal/core';
import * as request from 'superagent';
import { URL } from 'url';
import { SONAR_SCANNER } from './sonar';
import { IGlobalOptions } from '../globalOptions';
import { ScriptBase } from '../scriptBase';

const properties = require('java-properties');

export interface Options extends IGlobalOptions {
  shouldAlreadyExist?: boolean;
}

export class SonarInitScript extends ScriptBase<Options> {
  get name(): string {
    return 'sonar-init';
  }

  get description(): string {
    return 'Initializes Sonar project and creates "master" and "develop" long-lived sonar branches.';
  }

  protected async configure(command: Command): Promise<void> {
    command.option(
      `-e, --should-already-exist`,
      `When this flag is enabled, sonar project is expected to already exist; its only effect is to change log
       messages depending on caller expectations...`
    );
  }

  protected async main() {
    const sonarProperties = properties.of('sonar-project.properties');
    const sonarHostUrl = sonarProperties.get('sonar.host.url');
    const sonarProjectKey = sonarProperties.get('sonar.projectKey');

    this.logScriptStart(sonarProjectKey);

    if (await this.sonarProjectAlreadyExists(sonarProjectKey, sonarHostUrl)) {
      this.logSonarInitSkip(sonarProjectKey, sonarHostUrl);
    } else {
      this.logSonarInitStart(sonarProjectKey);
      await this.initSonarProject();
      this.logSonarInitSuccess(sonarProjectKey, sonarHostUrl);
    }
  }

  private async sonarProjectAlreadyExists(sonarProjectKey: string, sonarHostUrl: string): Promise<boolean> {
    let res;

    this.logger.debug(
      `*** Calling Sonar API to check whether ${sonarProjectKey} project exists in ${sonarHostUrl} Sonar instance...`
    );

    try {
      res = await request
        .get(new URL('api/project_branches/list', sonarHostUrl).toString())
        .query({ project: sonarProjectKey })
        .timeout(5000);
    } catch (err) {
      if (err.response?.notFound) {
        // 404 is the only http error we want to keep track of
        res = err.response;
      } else {
        throw err;
      }
    }

    this.logger.debug('*** Sonar API response :', { status: res.statusCode, text: res.text });

    if (res.ok) {
      return true;
    }
    if (res.notFound) {
      return false;
    }

    throw { msg: 'Unexpected response from Sonar API!', response: res };
  }

  private async initSonarProject() {
    await this.invokeShellCommand(SONAR_SCANNER, []);
    await this.invokeShellCommand(SONAR_SCANNER, ['-Dsonar.branch.name=develop']);
  }

  private logScriptStart(sonarProjectKey: string) {
    if (this.options.shouldAlreadyExist) {
      this.logger.info(`Checking '${sonarProjectKey}' Sonar project already exists...`);
    } else {
      this.logger.info(`Initializing '${sonarProjectKey}' Sonar project...`);
    }
  }

  private logSonarInitStart(sonarProjectKey: string) {
    if (this.options.shouldAlreadyExist) {
      this.logger.warn(`'${sonarProjectKey}' Sonar project does not yet exist! Initializing it...`);
    }
  }

  private logSonarInitSuccess(sonarProjectKey: string, sonarHostUrl: string) {
    const sonarProjectUrl = this.buildSonarProjectUrl(sonarProjectKey, sonarHostUrl);
    this.logger.info(
      `'${sonarProjectKey}' Sonar project successfully initialized, and available at ${sonarProjectUrl}`
    );
  }

  private logSonarInitSkip(sonarProjectKey: string, sonarHostUrl: string) {
    const sonarProjectUrl = this.buildSonarProjectUrl(sonarProjectKey, sonarHostUrl);
    if (this.options.shouldAlreadyExist) {
      this.logger.info(`'${sonarProjectKey}' Sonar project exists at ${sonarProjectUrl} as expected.`);
    } else {
      this.logger.warn(
        `'${sonarProjectKey}' Sonar project already exists at ${sonarProjectUrl} ! Skipping sonar initialization...`
      );
    }
  }

  private buildSonarProjectUrl(sonarProjectKey: string, sonarHostUrl: string): URL {
    return new URL(`dashboard?id=${sonarProjectKey}`, sonarHostUrl);
  }
}

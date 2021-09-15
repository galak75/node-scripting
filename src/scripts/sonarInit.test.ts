// ==========================================
// Disabling some linting rules is OK in test files.
// tslint:disable:no-console
// ==========================================
import { describe, it } from 'mocha';
import { expect } from 'chai';
import { setTestingConfigs, timeout } from '../utils/testingUtils';
import { SonarInitScript } from './sonarInit';
import * as sinon from 'sinon';

const chai = require('chai');
chai.use(require('chai-as-promised'));

function getSonarInitScript(shouldAlreadyExist: boolean, logger: {}) : SonarInitScript {
  return new SonarInitScript({
    args: {},
    options: {
      shouldAlreadyExist
    },
    program: sinon.stub() as any,
    command: sinon.stub() as any,
    ddash: sinon.stub() as any,
    logger: logger as any
  });
}

class LoggerRecorder {
  logger: {};
  recordedLogs: string;
  constructor() {
    this.recordedLogs = '';
    // tslint:disable-next-line:no-this-assignment
    const that = this;
    this.logger = new Proxy(
      {},
      {
        get: (target, prop) => {
          // tslint:disable-next-line: only-arrow-functions
          return function() {
            that.recordedLogs += `${prop.toString()}: ${arguments[0]}\n`;
          };
        }
      }
    );
  }
}

describe('Test sonar-init script', function() {
  timeout(this, 30000);

  before(() => {
    setTestingConfigs();
  });

  it(` should fail when sonar-project.properties is missing`, async () => {
    const loggerRecorder = new LoggerRecorder();
    const sonarInitScript = getSonarInitScript(false, loggerRecorder.logger);

    await expect(sonarInitScript.run()).to.be.rejectedWith(
      Error,
      "ENOENT: no such file or directory, open 'sonar-project.properties'"
    );

    expect(loggerRecorder.recordedLogs).to.equal(`info: Script "sonar-init" starting...
error: Script "sonar-init" failed after 0 s with: ENOENT: no such file or directory, open 'sonar-project.properties'
`);
  });
});

// ==========================================
// Disabling some linting rules is OK in test files.
// tslint:disable:no-console
// ==========================================
import { describe, it } from 'mocha';
import { assert, expect } from 'chai';
import { setTestingConfigs, timeout } from '../utils/testingUtils';
import { SonarInitScript } from './sonarInit';
import * as sinon from 'sinon';
import * as fs from 'fs-extra';
const nock = require('nock');

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

describe.only('Test sonar-init script', function() {
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

  describe(' with valid sonar-project.properties file', async () => {
    before(async () => {
      await fs.copyFile('./src/utils/test-sonar-project.properties', './sonar-project.properties');
    });
    after(async () => {
      await fs.unlink('./sonar-project.properties');
    });

    afterEach(() => {
      nock.cleanAll();
    });

    it(` should do something`, async () => {
      nock('https://example.com')
      .get('/sonar/api/project_branches/list')
      .query({ project: 'my-test-project-key' })
      .reply(200);

      const loggerRecorder = new LoggerRecorder();
      const sonarInitScript = getSonarInitScript(false, loggerRecorder.logger);

      console.log('***** Launching sonar-init script in unit test *****');

      await sonarInitScript.run();

      // TODO Geraud : NOT YET IMPLEMENTED

      console.log('***** Pending mocks *****');
      console.log(nock.pendingMocks());
      console.log('*************************');

      assert.isTrue(nock.isDone(), `There are remaining expected HTTP calls: ${nock.pendingMocks().toString()}`);

      const expectedOutput = `info: Script "sonar-init" starting...
info: Initializing 'my-test-project-key' Sonar project...
Blah Blah Blah
`;
      expect(loggerRecorder.recordedLogs).to.equal(expectedOutput);
    });
  });

});

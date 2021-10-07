// ==========================================
// Disabling some linting rules is OK in test files.
// tslint:disable:no-console
// tslint:disable:max-func-body-length
// ==========================================
import { describe, it } from 'mocha';
import { assert, expect } from 'chai';
import { setTestingConfigs, timeout } from '../utils/testingUtils';
import { SonarInitScript } from './sonarInit';
import * as sinon from 'sinon';
import * as fs from 'fs-extra';

const nock = require('nock');

const chai = require('chai');
chai.should();
chai.use(require('chai-as-promised'));
chai.use(require("sinon-chai"));

const sandbox = sinon.createSandbox();

function getSonarInitScript(shouldAlreadyExist: boolean, logger: {}): SonarInitScript {
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
          return function () {
            that.recordedLogs += `${prop.toString()}: ${arguments[0]}\n`;
          };
        }
      }
    );
  }
}

function simulateSonarProjectDoesNotYetExist() {
  nock('https://example.com')
  .get('/sonar/api/project_branches/list')
  .query({project: 'my-test-project-key'})
  .reply(404);
}

function simulateSonarProjectAlreadyExists() {
  nock('https://example.com')
  .get('/sonar/api/project_branches/list')
  .query({project: 'my-test-project-key'})
  .reply(200);
}

describe.only('sonar-init script', function () {
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
    let sonarProjectShouldExist: boolean = false;

    before(async () => {
      await fs.copyFile('./src/utils/test-sonar-project.properties', './sonar-project.properties');
    });
    after(async () => {
      await fs.unlink('./sonar-project.properties');
    });

    afterEach(() => {
      nock.cleanAll();
      sandbox.restore();
    });

    describe(' given that sonar project is not expected to exist yet', async () => {
      before(() => {
        sonarProjectShouldExist = false;
      });

      it(` should skip sonar project initialization with a warning when it does already exist.`, async () => {
        simulateSonarProjectAlreadyExists();

        // @ts-ignore
        const shellCommand = sandbox.spy(SonarInitScript.prototype, 'invokeShellCommand');

        const loggerRecorder = new LoggerRecorder();
        const sonarInitScript = getSonarInitScript(sonarProjectShouldExist, loggerRecorder.logger);

        await sonarInitScript.run();

        assert.isTrue(nock.isDone(), `There are remaining expected HTTP calls: ${nock.pendingMocks().toString()}`);

        // Expected action is to initialize a new Sonar project
        expect(loggerRecorder.recordedLogs).to.satisfy(
          (logs: string) => logs.startsWith(`info: Script "sonar-init" starting...
info: Initializing 'my-test-project-key' Sonar project...`
          ));
        expect(loggerRecorder.recordedLogs).to.contain(
          "warn: 'my-test-project-key' Sonar project already exists at https://example.com/sonar/dashboard?id=my-test-project-key ! Skipping sonar initialization...");

        // @ts-ignore
        // tslint:disable-next-line:no-unused-expression
        shellCommand.should.not.have.been.called;
      });

      it(` should initialize sonar project when it does not yet exist.`, async () => {
        simulateSonarProjectDoesNotYetExist();

        // @ts-ignore
        const shellCommand = sandbox.stub(SonarInitScript.prototype, 'invokeShellCommand').returns(Promise.resolve(0));

        const loggerRecorder = new LoggerRecorder();
        const sonarInitScript = getSonarInitScript(sonarProjectShouldExist, loggerRecorder.logger);

        await sonarInitScript.run();

        assert.isTrue(nock.isDone(), `There are remaining expected HTTP calls: ${nock.pendingMocks().toString()}`);

        // Expected action is to initialize a new Sonar project
        expect(loggerRecorder.recordedLogs).to.satisfy(
          (logs: string) => logs.startsWith(`info: Script "sonar-init" starting...
info: Initializing 'my-test-project-key' Sonar project...`
          ));
        expect(loggerRecorder.recordedLogs).to.contain("info: 'my-test-project-key' Sonar project successfully initialized, and available at https://example.com/sonar/dashboard?id=my-test-project-key")
        expect(loggerRecorder.recordedLogs).to.not.contain("warn");

        // @ts-ignore
        // tslint:disable-next-line:no-unused-expression
        shellCommand.should.have.been.calledTwice;
        shellCommand.should.have.been.calledWithExactly('./node_modules/.bin/sonar-scanner', []);
        shellCommand.should.have.been.calledWithExactly('./node_modules/.bin/sonar-scanner', ['-Dsonar.branch.name=develop']);
      });
    });

    describe(' given that sonar project is expected to already exist', async () => {
      before(() => {
        sonarProjectShouldExist = true;
      });

      it(` should skip sonar project initialization without any warning when it does already exist.`, async () => {
        simulateSonarProjectAlreadyExists();

        // @ts-ignore
        const shellCommand = sandbox.spy(SonarInitScript.prototype, 'invokeShellCommand');

        const loggerRecorder = new LoggerRecorder();
        const sonarInitScript = getSonarInitScript(sonarProjectShouldExist, loggerRecorder.logger);

        await sonarInitScript.run();

        assert.isTrue(nock.isDone(), `There are remaining expected HTTP calls: ${nock.pendingMocks().toString()}`);

        // Expected action is to check Sonar project already exists
        expect(loggerRecorder.recordedLogs).to.satisfy(
          (logs: string) => logs.startsWith(`info: Script "sonar-init" starting...
info: Checking 'my-test-project-key' Sonar project already exists...`
          ));
        expect(loggerRecorder.recordedLogs).to.contain(
          "info: 'my-test-project-key' Sonar project exists at https://example.com/sonar/dashboard?id=my-test-project-key as expected.");
        expect(loggerRecorder.recordedLogs).to.not.contain("warn");

        // @ts-ignore
        // tslint:disable-next-line:no-unused-expression
        shellCommand.should.not.have.been.called;
      });

      it(` should initialize sonar project with a warning when it does not yet exist.`, async () => {
        simulateSonarProjectDoesNotYetExist();

        // @ts-ignore
        const shellCommand = sandbox.stub(SonarInitScript.prototype, 'invokeShellCommand').returns(Promise.resolve(0));

        const loggerRecorder = new LoggerRecorder();
        const sonarInitScript = getSonarInitScript(sonarProjectShouldExist, loggerRecorder.logger);

        await sonarInitScript.run();

        assert.isTrue(nock.isDone(), `There are remaining expected HTTP calls: ${nock.pendingMocks().toString()}`);

        // Expected action is to check Sonar project already exists
        expect(loggerRecorder.recordedLogs).to.satisfy(
          (logs: string) => logs.startsWith(`info: Script "sonar-init" starting...
info: Checking 'my-test-project-key' Sonar project already exists...`
          ));
        expect(loggerRecorder.recordedLogs).to.contain(
          "warn: 'my-test-project-key' Sonar project does not yet exist! Initializing it...");
        expect(loggerRecorder.recordedLogs).to.contain(
          "info: 'my-test-project-key' Sonar project successfully initialized, and available at https://example.com/sonar/dashboard?id=my-test-project-key");

        // @ts-ignore
        // tslint:disable-next-line:no-unused-expression
        shellCommand.should.have.been.calledTwice;
        shellCommand.should.have.been.calledWithExactly('./node_modules/.bin/sonar-scanner', []);
        shellCommand.should.have.been.calledWithExactly('./node_modules/.bin/sonar-scanner', ['-Dsonar.branch.name=develop']);
      });
    });

  });

});

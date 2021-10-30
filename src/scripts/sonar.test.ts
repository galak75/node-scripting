// ==========================================
// Disabling some linting rules is OK in test files.
// tslint:disable:no-console
// tslint:disable:max-func-body-length
// tslint:disable:no-unused-expression
// ==========================================
import { describe, it } from 'mocha';
import { expect } from 'chai';
import { setTestingConfigs, timeout } from '../utils/testingUtils';
import { SONAR_SCANNER, SonarScript } from './sonar';
import * as sinon from 'sinon';
import * as fs from 'fs-extra';
import { SonarInitScript } from './sonarInit';

const nock = require('nock');

const chai = require('chai');
chai.should();
chai.use(require('chai-as-promised'));
chai.use(require("sinon-chai"));
chai.use(require("chai-string"));

const sandbox = sinon.createSandbox();
// @ts-ignore
const shellCommand = sandbox.stub(SonarScript.prototype, 'invokeShellCommand');
// @ts-ignore
const subScript = sandbox.stub(SonarScript.prototype, 'invokeScript');

function getSonarScript(targetBranch: string, logger: {}): SonarScript {
  return new SonarScript({
    args: {},
    options: {
      targetBranch
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

function simulateCurrentGitLocalBranchIs(currentLocalBranch: string) {
  shellCommand.withArgs('git', ['branch', '--show-current'], sinon.match.any).callThrough();
  const mockSpawn = require('mock-spawn');
  const mySpawn = mockSpawn();
  require('child_process').spawn = mySpawn;
  mySpawn.setDefault(mySpawn.simple(0 /* exit code */, currentLocalBranch /* stdout */));
}

describe('sonar script', function () {
  timeout(this, 30000);

  before(() => {
    setTestingConfigs();
  });

  afterEach(() => {
    sandbox.resetHistory();
    sandbox.resetBehavior();
  })

  after(() => {
    sandbox.restore();
  })

  it(` should fail when sonar-project.properties is missing`, async () => {
    const loggerRecorder = new LoggerRecorder();
    const sonarScript = getSonarScript(null, loggerRecorder.logger);

    await expect(sonarScript.run()).to.be.rejectedWith(
      Error,
      "ENOENT: no such file or directory, open 'sonar-project.properties'"
    );

    expect(loggerRecorder.recordedLogs).to.equal(`info: Script "sonar" starting...
error: Script "sonar" failed after 0 s with: ENOENT: no such file or directory, open 'sonar-project.properties'
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

    it(` should successfully analyze code when project already exists in Sonar.`, async () => {
      simulateSonarProjectAlreadyExists();
      simulateCurrentGitLocalBranchIs('current-local-branch');

      const loggerRecorder = new LoggerRecorder();
      const sonarScript = getSonarScript('develop', loggerRecorder.logger);

      await sonarScript.run();

      expect(loggerRecorder.recordedLogs)
      .to.startsWith('info: Script "sonar" starting...\n')
      .and.to.contain('info: Analyzing current branch "current-local-branch" source code...\n')
      .and.to.endWith('info: Script "sonar" successful after 0 s\n');

      subScript.should.not.have.been.called;

      shellCommand.should.have.been.calledTwice;
      shellCommand.should.have.been.calledWith('git', ['branch', '--show-current']);
      shellCommand.should.have.been.calledWithExactly(SONAR_SCANNER, ['-Dsonar.branch.name=current-local-branch', '-Dsonar.branch.target=develop']);
    });

    it(` should initialize Sonar project with a warning and then successfully analyze code when project does not yet exist in Sonar.`, async () => {
      simulateSonarProjectDoesNotYetExist();
      simulateCurrentGitLocalBranchIs('current-local-branch');

      const loggerRecorder = new LoggerRecorder();
      const sonarScript = getSonarScript('develop', loggerRecorder.logger);

      await sonarScript.run();

      expect(loggerRecorder.recordedLogs)
      .to.startsWith('info: Script "sonar" starting...\n')
      .and.to.contain('info: Analyzing current branch "current-local-branch" source code...\n')
      .and.to.endWith('info: Script "sonar" successful after 0 s\n');

      expect(loggerRecorder.recordedLogs)
      .to.contain("warn: 'my-test-project-key' Sonar project does not yet exist on https://example.com/sonar/ ! Initializing it first...\n");

      subScript.should.have.been.calledOnceWithExactly(SonarInitScript, {}, {});

      shellCommand.should.have.been.calledTwice;
      shellCommand.should.have.been.calledWith('git', ['branch', '--show-current']);
      shellCommand.should.have.been.calledWithExactly(SONAR_SCANNER, ['-Dsonar.branch.name=current-local-branch', '-Dsonar.branch.target=develop']);
    });

    // TODO Geraud : add more test cases:
    //               - when git branch fails
    //               - when passing no target branch
    //               - when sonar project does not yet exists

  });

});

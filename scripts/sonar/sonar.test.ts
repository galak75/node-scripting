/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable no-console */
/* eslint-disable max-lines-per-function */
import { assert, expect } from 'chai';
import * as fs from 'fs-extra';
import { describe, it } from 'mocha';
import * as sinon from 'sinon';
import {
  LoggerRecorder,
  simulateSonarProjectAlreadyExists,
  simulateSonarProjectDoesNotYetExist,
  simulateSonarServerIsNotFound,
} from '../../src/utils/sonarTestUtils';
import { setTestingConfigs, timeout } from '../../src/utils/testingUtils';
import { SonarScript, SONAR_SCANNER } from './sonar';
import { SonarInitScript } from './sonarInit';

const nock = require('nock');

const chai = require('chai');
chai.should();
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
chai.use(require('chai-string'));

const sandbox = sinon.createSandbox();
let shellCommand: sinon.SinonStub;
let subScript: sinon.SinonStub;

// eslint-disable-next-line @typescript-eslint/ban-types
function getSonarScript(targetBranch: string, logger: {}): SonarScript {
  let options = {};
  if (targetBranch) {
    options = {
      targetBranch,
    };
  }

  return new SonarScript({
    args: {},
    options,
    program: sinon.stub() as any,
    command: sinon.stub() as any,
    ddash: sinon.stub() as any,
    logger: logger as any,
  });
}

function simulateCurrentGitLocalBranchIs(currentLocalBranch: string) {
  shellCommand.withArgs('git', ['branch', '--show-current'], sinon.match.any).callThrough();
  const mockSpawn = require('mock-spawn');
  const mySpawn = mockSpawn();
  require('child_process').spawn = mySpawn;
  mySpawn.setDefault(mySpawn.simple(0 /* exit code */, currentLocalBranch /* stdout */));
}

function simulateThereIsNoLocalGitRepository() {
  shellCommand.withArgs('git', ['branch', '--show-current'], sinon.match.any).callThrough();
  const mockSpawn = require('mock-spawn');
  const mySpawn = mockSpawn();
  require('child_process').spawn = mySpawn;
  const gitOutputMessage = 'fatal: not a git repository (or any of the parent directories): .git';
  mySpawn.setDefault(mySpawn.simple(128 /* exit code */, gitOutputMessage /* stdout */));
}

const validPropertyFiles = [
  './src/utils/test-sonar-project_url-with-trailing-slash.properties',
  './src/utils/test-sonar-project_url-without-trailing-slash.properties',
];

describe('sonar script', function () {
  timeout(this, 30000);

  before(() => {
    setTestingConfigs();

    // @ts-ignore
    shellCommand = sandbox.stub(SonarScript.prototype, 'invokeShellCommand');
    // @ts-ignore
    subScript = sandbox.stub(SonarScript.prototype, 'invokeScript');
  });

  afterEach(() => {
    sandbox.resetHistory();
    sandbox.resetBehavior();
    nock.cleanAll();
  });

  after(() => {
    sandbox.restore();
  });

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

  validPropertyFiles.forEach((propertyFile) => {
    describe(` when using "${propertyFile}" valid file`, async () => {
      before(async () => {
        await fs.copyFile(propertyFile, './sonar-project.properties');
      });
      after(async () => {
        await fs.unlink('./sonar-project.properties');
      });

      it(` should fail when there is no local git repository`, async () => {
        simulateThereIsNoLocalGitRepository();

        const loggerRecorder = new LoggerRecorder();
        const sonarScript = getSonarScript(null, loggerRecorder.logger);

        await expect(sonarScript.run()).to.be.rejectedWith(
          Error,
          'Expected success codes were "0", but the process exited with "128".'
        );

        expect(loggerRecorder.recordedLogs)
          .to.startWith(`info: Script "sonar" starting...\n`)
          .and.to.contain('info: Executing: git branch,--show-current\n')
          .and.to.endWith(
            'error: Script "sonar" failed after 0 s with: Expected success codes were "0", but the process exited with "128".\n'
          );

        subScript.should.not.have.been.called;

        shellCommand.should.have.been.calledOnceWith('git', ['branch', '--show-current']);
      });

      it(` should fail when sonar server is not found.`, async () => {
        simulateCurrentGitLocalBranchIs('current-local-branch');
        simulateSonarServerIsNotFound();

        const loggerRecorder = new LoggerRecorder();
        const sonarInitScript = getSonarScript(null, loggerRecorder.logger);

        await expect(sonarInitScript.run()).to.be.rejectedWith(Error, 'Not Found');

        assert.isTrue(
          nock.isDone(),
          `There are remaining expected HTTP calls: ${nock.pendingMocks().toString()}`
        );

        expect(loggerRecorder.recordedLogs)
          .to.startWith('info: Script "sonar" starting...\n')
          .and.to.contain.oneOf([
            'error: "https://example.com/sonar/" Sonar server is not reachable.\n',
            'error: "https://example.com/sonar" Sonar server is not reachable.\n',
          ])
          .and.to.endWith('error: Script "sonar" failed after 0 s with: Not Found\n');

        expect(loggerRecorder.recordedLogs).to.not.contain('warn');

        shellCommand.should.have.been.calledOnceWith('git', ['branch', '--show-current']);
      });

      describe(' when project already exists in Sonar', () => {
        beforeEach(() => {
          simulateSonarProjectAlreadyExists();
          simulateCurrentGitLocalBranchIs('current-local-branch');
        });

        it(` should succeed when simple code analysis succeeds.`, async () => {
          const loggerRecorder = new LoggerRecorder();
          const sonarScript = getSonarScript(null, loggerRecorder.logger);

          shellCommand.withArgs(SONAR_SCANNER).returns(0);

          await sonarScript.run();

          expect(loggerRecorder.recordedLogs)
            .to.startWith('info: Script "sonar" starting...\n')
            .and.to.contain(
              'info: Analyzing current branch "current-local-branch" source code...\n'
            )
            .and.to.endWith('info: Script "sonar" successful after 0 s\n');

          subScript.should.not.have.been.called;

          shellCommand.should.have.been.calledTwice;
          shellCommand.should.have.been.calledWith('git', ['branch', '--show-current']);
          shellCommand.should.have.been.calledWithExactly(SONAR_SCANNER, [
            '-Dsonar.branch.name=current-local-branch',
          ]);
        });

        it(` should succeed when code analysis against a target branch succeeds.`, async () => {
          const loggerRecorder = new LoggerRecorder();
          const sonarScript = getSonarScript('develop', loggerRecorder.logger);

          shellCommand.withArgs(SONAR_SCANNER).returns(0);

          await sonarScript.run();

          expect(loggerRecorder.recordedLogs)
            .to.startWith('info: Script "sonar" starting...\n')
            .and.to.contain(
              'info: Analyzing current branch "current-local-branch" source code...\n'
            )
            .and.to.endWith('info: Script "sonar" successful after 0 s\n');

          subScript.should.not.have.been.called;

          shellCommand.should.have.been.calledTwice;
          shellCommand.should.have.been.calledWith('git', ['branch', '--show-current']);
          shellCommand.should.have.been.calledWithExactly(SONAR_SCANNER, [
            '-Dsonar.branch.name=current-local-branch',
            '-Dsonar.branch.target=develop',
          ]);
        });

        it(` should fail when simple code analysis fails.`, async () => {
          const loggerRecorder = new LoggerRecorder();
          const sonarScript = getSonarScript(null, loggerRecorder.logger);

          shellCommand
            .withArgs(SONAR_SCANNER)
            .rejects(new Error('An error occurred while analyzing source code.'));

          await expect(sonarScript.run()).to.be.rejectedWith(
            Error,
            'An error occurred while analyzing source code.'
          );

          expect(loggerRecorder.recordedLogs)
            .to.startWith('info: Script "sonar" starting...\n')
            .and.to.contain(
              'info: Analyzing current branch "current-local-branch" source code...\n'
            )
            .and.to.endWith(
              `error: Script "sonar" failed after 0 s with: An error occurred while analyzing source code.\n`
            );

          subScript.should.not.have.been.called;

          shellCommand.should.have.been.calledTwice;
          shellCommand.should.have.been.calledWith('git', ['branch', '--show-current']);
          shellCommand.should.have.been.calledWithExactly(SONAR_SCANNER, [
            '-Dsonar.branch.name=current-local-branch',
          ]);
        });
      });

      describe(' when project does not yet exist in Sonar', () => {
        beforeEach(() => {
          simulateSonarProjectDoesNotYetExist();
          simulateCurrentGitLocalBranchIs('current-local-branch');
        });

        it(` should initialize Sonar project with a warning and then successfully analyze code.`, async () => {
          const loggerRecorder = new LoggerRecorder();
          const sonarScript = getSonarScript(null, loggerRecorder.logger);

          shellCommand.withArgs(SONAR_SCANNER).returns(0);

          await sonarScript.run();

          expect(loggerRecorder.recordedLogs)
            .to.startWith('info: Script "sonar" starting...\n')
            .and.to.contain.oneOf([
              "warn: 'my-test-project-key' Sonar project does not yet exist on https://example.com/sonar/ ! Initializing it first...\n",
              "warn: 'my-test-project-key' Sonar project does not yet exist on https://example.com/sonar ! Initializing it first...\n",
            ])
            .and.to.contain(
              'info: Analyzing current branch "current-local-branch" source code...\n'
            )
            .and.to.endWith('info: Script "sonar" successful after 0 s\n');

          subScript.should.have.been.calledOnceWithExactly(SonarInitScript, {}, {});

          shellCommand.should.have.been.calledTwice;
          shellCommand.should.have.been.calledWith('git', ['branch', '--show-current']);
          shellCommand.should.have.been.calledWithExactly(SONAR_SCANNER, [
            '-Dsonar.branch.name=current-local-branch',
          ]);
        });

        it(` should initialize Sonar project with a warning and then successfully analyze code against a target branch.`, async () => {
          const loggerRecorder = new LoggerRecorder();
          const sonarScript = getSonarScript('develop', loggerRecorder.logger);

          shellCommand.withArgs(SONAR_SCANNER).returns(0);

          await sonarScript.run();

          expect(loggerRecorder.recordedLogs)
            .to.startWith('info: Script "sonar" starting...\n')
            .and.to.contain.oneOf([
              "warn: 'my-test-project-key' Sonar project does not yet exist on https://example.com/sonar/ ! Initializing it first...\n",
              "warn: 'my-test-project-key' Sonar project does not yet exist on https://example.com/sonar ! Initializing it first...\n",
            ])
            .and.to.contain(
              'info: Analyzing current branch "current-local-branch" source code...\n'
            )
            .and.to.endWith('info: Script "sonar" successful after 0 s\n');

          subScript.should.have.been.calledOnceWithExactly(SonarInitScript, {}, {});

          shellCommand.should.have.been.calledTwice;
          shellCommand.should.have.been.calledWith('git', ['branch', '--show-current']);
          shellCommand.should.have.been.calledWithExactly(SONAR_SCANNER, [
            '-Dsonar.branch.name=current-local-branch',
            '-Dsonar.branch.target=develop',
          ]);
        });

        it(` should fail when Sonar project initialization fails.`, async () => {
          const loggerRecorder = new LoggerRecorder();
          const sonarScript = getSonarScript(null, loggerRecorder.logger);

          subScript
            .withArgs(SonarInitScript)
            .rejects(new Error('An error occurred while calling sonar-init sub-script.'));

          await expect(sonarScript.run()).to.be.rejectedWith(
            Error,
            'An error occurred while calling sonar-init sub-script.'
          );

          expect(loggerRecorder.recordedLogs)
            .to.startWith('info: Script "sonar" starting...\n')
            .and.to.contain.oneOf([
              "warn: 'my-test-project-key' Sonar project does not yet exist on https://example.com/sonar/ ! Initializing it first...\n",
              "warn: 'my-test-project-key' Sonar project does not yet exist on https://example.com/sonar ! Initializing it first...\n",
            ])
            .and.to.endWith(
              'error: Script "sonar" failed after 0 s with: An error occurred while calling sonar-init sub-script.\n'
            )
            .and.to.not.contain(
              'info: Analyzing current branch "current-local-branch" source code...\n'
            );

          subScript.should.have.been.calledOnceWithExactly(SonarInitScript, {}, {});

          shellCommand.should.have.been.calledOnceWith('git', ['branch', '--show-current']);
        });

        it(` should fail when code analysis fails after project initialization.`, async () => {
          const loggerRecorder = new LoggerRecorder();
          const sonarScript = getSonarScript(null, loggerRecorder.logger);

          subScript.withArgs(SonarInitScript).returns(0);
          shellCommand
            .withArgs(SONAR_SCANNER)
            .rejects(new Error('An error occurred while analyzing source code.'));

          await expect(sonarScript.run()).to.be.rejectedWith(
            Error,
            'An error occurred while analyzing source code.'
          );

          expect(loggerRecorder.recordedLogs)
            .to.startWith('info: Script "sonar" starting...\n')
            .and.to.contain.oneOf([
              "warn: 'my-test-project-key' Sonar project does not yet exist on https://example.com/sonar/ ! Initializing it first...\n",
              "warn: 'my-test-project-key' Sonar project does not yet exist on https://example.com/sonar ! Initializing it first...\n",
            ])
            .and.to.contain(
              'info: Analyzing current branch "current-local-branch" source code...\n'
            )
            .and.to.endWith(
              'error: Script "sonar" failed after 0 s with: An error occurred while analyzing source code.\n'
            );

          subScript.should.have.been.calledOnceWithExactly(SonarInitScript, {}, {});

          shellCommand.should.have.been.calledTwice;
          shellCommand.should.have.been.calledWith('git', ['branch', '--show-current']);
          shellCommand.should.have.been.calledWithExactly(SONAR_SCANNER, [
            '-Dsonar.branch.name=current-local-branch',
          ]);
        });
      });
    });
  });

  describe(' when using a sonar-project.properties file where Sonar host is missing', async () => {
    before(async () => {
      await fs.copyFile(
        './src/utils/test-sonar-project_missing-host.properties',
        './sonar-project.properties'
      );
    });
    after(async () => {
      await fs.unlink('./sonar-project.properties');
    });

    it(` should fail with a message about missing host url.`, async () => {
      const loggerRecorder = new LoggerRecorder();
      const sonarScript = getSonarScript(null, loggerRecorder.logger);

      await expect(sonarScript.run()).to.be.rejectedWith(
        Error,
        '"sonar.host.url" property must be defined in "sonar-project.properties" file!'
      );

      subScript.should.not.have.been.called;
      shellCommand.should.not.have.been.called;
    });
  });

  describe(' when using a sonar-project.properties file where Sonar project key is missing', async () => {
    before(async () => {
      await fs.copyFile(
        './src/utils/test-sonar-project_missing-project-key.properties',
        './sonar-project.properties'
      );
    });
    after(async () => {
      await fs.unlink('./sonar-project.properties');
    });

    it(` should fail with a message about missing project key.`, async () => {
      const loggerRecorder = new LoggerRecorder();
      const sonarScript = getSonarScript(null, loggerRecorder.logger);

      await expect(sonarScript.run()).to.be.rejectedWith(
        Error,
        '"sonar.projectKey" property must be defined in "sonar-project.properties" file!'
      );

      subScript.should.not.have.been.called;
      shellCommand.should.not.have.been.called;
    });
  });
});

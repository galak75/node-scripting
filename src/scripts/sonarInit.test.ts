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

describe('Test sonar-init script', function() {
  timeout(this, 30000);

  before(() => {
    setTestingConfigs();
  });

  it(` should fail when sonar-project.properties is missing`, async () => {
    let output = '';
    const logger = new Proxy(
      {},
      {
        get: (target, prop) => {
          // tslint:disable-next-line: only-arrow-functions
          return function() {
            output += `${prop.toString()}: ${arguments[0]}\n`;
          };
        }
      }
    );

    const sonarInitScript = new SonarInitScript({
      args: {},
      options: {
        shouldAlreadyExist: false
      },
      program: sinon.stub() as any,
      command: sinon.stub() as any,
      ddash: sinon.stub() as any,
      logger: logger as any
    });

    await expect(sonarInitScript.run()).to.be.rejectedWith(
      Error,
      "ENOENT: no such file or directory, open 'sonar-project.properties'"
    );

    expect(output).to.equal(`info: Script "sonar-init" starting...
error: Script "sonar-init" failed after 0 s with: ENOENT: no such file or directory, open 'sonar-project.properties'
`);
  });
});

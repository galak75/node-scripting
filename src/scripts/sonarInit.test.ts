// ==========================================
// Disabling some linting rules is OK in test files.
// tslint:disable:no-console
// ==========================================
import { describe, it } from 'mocha';
import { assert } from 'chai';
import { containsText, timeout } from '../utils/testingUtils';
import { run } from '../run';
import { Program } from '@caporal/core';
import { SonarInitScript } from './sonarInit';
import * as sinon from 'sinon';

let caporal: Program;

describe('Test sonar-init script', function () {
  timeout(this, 30000);

  beforeEach(() => {
    caporal = require('@caporal/core').program;
  })

  const scriptUnderTest = new SonarInitScript({
    args: {},
    ddash: [],
    options: {shouldAlreadyExist: false},
    program: caporal,
    // command: contextual command if any??,
    logger: undefined
  });

  it(` should fail when sonar-project.properties is missing`, async () => {

    await scriptUnderTest.run();

    const expectedOutput = `info: Script "sonar-init" starting...

error: Script "sonar-init" failed after 0 s with: ENOENT: no such file or directory, open 'sonar-project.properties'
`;
    assert.isTrue(containsText("FAIL", expectedOutput));
  });

  it(` should still fail when sonar-project.properties is missing`, async () => {

    await run({
      caporal,
      projectRoot: __dirname,
      scriptsIndexModule: `./scripts/index`,
      testsLocations: [`./src/**/*.test.js`]
    });

    const expectedOutput = `info: Script "sonar-init" starting...

error: Script "sonar-init" failed after 0 s with: ENOENT: no such file or directory, open 'sonar-project.properties'
`;
    assert.isTrue(containsText("FAIL", expectedOutput));
  });

  it.only(` should really fail when sonar-project.properties is missing`, async () => {
    let output = '';
    const logger = new Proxy(
      {},
      {
        get: (target, prop) => {
          // tslint:disable-next-line: only-arrow-functions
          return function () {
            if (prop === 'info') {
              output += arguments[0] + '\n';
            }
          };
        }
      }
    );

    await new SonarInitScript({
      args: {},
      options: {
        shouldAlreadyExist: false
      },
      program: sinon.stub() as any,
      command: sinon.stub() as any,
      ddash: sinon.stub() as any,
      logger: logger as any
    }).run();

    assert.isTrue(output.indexOf(`port: 789`) > -1);

  })

})
import { ScriptBase } from '../scriptBase';
import * as request from 'superagent';
import { URL } from 'url';

export abstract class SonarBaseScript<Options> extends ScriptBase<Options> {

  protected async sonarProjectAlreadyExists(sonarProjectKey: string, sonarHostUrl: string): Promise<boolean> {
    let res;

    this.logger.debug(
      `*** Calling Sonar API to check whether ${sonarProjectKey} project exists in ${sonarHostUrl} Sonar instance...`
    );

    try {
      res = await request
      .get(new URL('api/project_branches/list', sonarHostUrl).toString())
      .query({project: sonarProjectKey})
      .timeout(5000);
    } catch (err) {
      if (err.response?.notFound) {
        // 404 is the only http error we want to keep track of
        res = err.response;
      } else {
        throw err;
      }
    }

    this.logger.debug('*** Sonar API response :', {status: res.statusCode, text: res.text});

    if (res.ok) {
      return true;
    }
    if (res.notFound) {
      return false;
    }

    throw {msg: 'Unexpected response from Sonar API!', response: res};
  }
}

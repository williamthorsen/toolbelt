#!/usr/bin/env node
import assert from 'node:assert';
import process from 'node:process';

import { App } from 'aws-cdk-lib';

import { AppStack } from '../stack/AppStack.js';

import 'source-map-support/register.js';

// region Environment-variable validation
['CDK_DEFAULT_ACCOUNT', 'CDK_DEFAULT_REGION'].forEach((envVar) => {
  assert.ok(process.env[envVar], `Expected ${envVar} environment variable to be set`);
});
// endregion

const app = new App();
const stackName = composeStackName(app.node.tryGetContext('appName'));

new AppStack(app, stackName, {
  // see `<tools-repo>/aws/cdk/environments.md` for info on environment-agnostic and environment-specific stacks
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

function composeStackName(appName: string): string {
  assert.ok(appName, 'Expected context.appName to be set in cdk.json');
  return `${appName}Stack`;
}

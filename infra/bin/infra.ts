#!/usr/bin/env node
// CDK app entry point — instantiates all versioned stacks.
import { App, Stack } from 'aws-cdk-lib';
import { DEFAULT_VERSIONS, VERSION_STACKS } from '@config/versions';
import { DEPLOY_VERSIONS } from '@versions/deploy-config';
import { getAppConfig } from '@config/entry-config';
import type { StackDeps } from '@utils/types';

const app = new App();

const { versions } = getAppConfig(
  VERSION_STACKS,
  DEFAULT_VERSIONS,
  DEPLOY_VERSIONS,
  app.node.tryGetContext('stacks'),
);

const stackMap = new Map<string, Stack>();
const deps: StackDeps = {
  getStack(name: string) {
    return stackMap.get(name);
  },
};

for (const { version, factories } of versions) {
  for (const { name, create } of factories) {
    const stack = create(app, version, deps);
    stackMap.set(name, stack);
  }
}

app.synth();

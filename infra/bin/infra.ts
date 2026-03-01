#!/usr/bin/env node
import { App, Stack } from 'aws-cdk-lib';
import { DEFAULT_VERSION, VERSION_STACKS } from '@config/versions';
import { DEPLOY_VERSION } from '@versions/deploy-config';
import { getAppConfig } from '@config/entry-config';
import type { StackDeps } from '@utils/types';

const app = new App();

const { version, factoriesToInstantiate } = getAppConfig(
  VERSION_STACKS,
  DEFAULT_VERSION,
  DEPLOY_VERSION,
  app.node.tryGetContext('stacks'),
);

const stackMap = new Map<string, Stack>();
const deps: StackDeps = {
  getStack(name: string) {
    return stackMap.get(name);
  },
};

for (const { name, create } of factoriesToInstantiate) {
  const stack = create(app, version, deps);
  stackMap.set(name, stack);
}

app.synth();

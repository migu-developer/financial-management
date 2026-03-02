#!/usr/bin/env node

// Reason: This script is used to reset the project to a blank state.
/* eslint-disable no-console */

/**
 * This script is used to reset the project to a blank state.
 * It deletes or moves the /app, /components, /hooks, /scripts, and /constants directories to /app-example based on user input and creates a new /app directory with an index.tsx and _layout.tsx file.
 * You can remove the `reset-project` script from package.json and safely delete this file after running it.
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const root = process.cwd();

/** Directories to move or delete when resetting. */
export const oldDirs = [
  'app',
  'components',
  'hooks',
  'constants',
  'scripts',
] as const;

/** Name of the directory where existing files are moved when user chooses to keep them. */
export const exampleDir = 'app-example';

/** Name of the new app directory. */
export const newAppDir = 'app';

/** Default content for app/index.tsx after reset. */
export const indexContent = `import { Text, View } from "react-native";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Edit app/index.tsx to edit this screen.</Text>
    </View>
  );
}
`;

/** Default content for app/_layout.tsx after reset. */
export const layoutContent = `import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack />;
}
`;

export type ResetChoice = 'y' | 'n';

/**
 * Move or delete existing dirs and create fresh /app with index and _layout.
 * Exported for testing.
 */
export async function moveDirectories(
  projectRoot: string,
  userInput: ResetChoice,
): Promise<void> {
  const exampleDirPath = path.join(projectRoot, exampleDir);

  if (userInput === 'y') {
    await fs.promises.mkdir(exampleDirPath, { recursive: true });
    console.log(`📁 /${exampleDir} directory created.`);
  }

  for (const dir of oldDirs) {
    const oldDirPath = path.join(projectRoot, dir);
    if (fs.existsSync(oldDirPath)) {
      if (userInput === 'y') {
        const newDirPath = path.join(projectRoot, exampleDir, dir);
        await fs.promises.rename(oldDirPath, newDirPath);
        console.log(`➡️ /${dir} moved to /${exampleDir}/${dir}.`);
      } else {
        await fs.promises.rm(oldDirPath, { recursive: true, force: true });
        console.log(`❌ /${dir} deleted.`);
      }
    } else {
      console.log(`➡️ /${dir} does not exist, skipping.`);
    }
  }

  const newAppDirPath = path.join(projectRoot, newAppDir);
  await fs.promises.mkdir(newAppDirPath, { recursive: true });
  console.log('\n📁 New /app directory created.');

  const indexPath = path.join(newAppDirPath, 'index.tsx');
  await fs.promises.writeFile(indexPath, indexContent);
  console.log('📄 app/index.tsx created.');

  const layoutPath = path.join(newAppDirPath, '_layout.tsx');
  await fs.promises.writeFile(layoutPath, layoutContent);
  console.log('📄 app/_layout.tsx created.');

  console.log('\n✅ Project reset complete. Next steps:');
  console.log(
    `1. Run \`npx expo start\` to start a development server.\n2. Edit app/index.tsx to edit the main screen.${
      userInput === 'y'
        ? `\n3. Delete the /${exampleDir} directory when you're done referencing it.`
        : ''
    }`,
  );
}

function runInteractive(): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(
    'Do you want to move existing files to /app-example instead of deleting them? (Y/n): ',
    (answer) => {
      const userInput = (answer.trim().toLowerCase() || 'y') as ResetChoice;
      if (userInput === 'y' || userInput === 'n') {
        moveDirectories(root, userInput).finally(() => rl.close());
      } else {
        console.log("❌ Invalid input. Please enter 'Y' or 'N'.");
        rl.close();
      }
    },
  );
}

const isEntry =
  (typeof require !== 'undefined' && require.main === module) ||
  path.basename(process.argv[1] ?? '') === 'reset-project.ts';
if (isEntry) runInteractive();

import { execSync } from 'child_process';
import { join as pathJoin, relative as pathRelative } from 'path';
import * as fs from 'fs';

/**
 * An array of singleton dependencies.
 * @type {string[]}
 */
const singletonDependencies: string[] = [
  //"react",
  //"@types/react"
];

/**
 * Returns the absolute path of the parent directory of the current directory.
 * @param {string} __dirname - The current directory path.
 * @returns {string} The absolute path of the parent directory.
 */
const rootDirPath = pathJoin(__dirname, '..');

/**
 * Writes a modified package.json file to the specified path.
 * @param {string} rootDirPath - The root directory path.
 * @returns None
 */
fs.writeFileSync(
  pathJoin(rootDirPath, 'dist', 'package.json'),
  Buffer.from(
    JSON.stringify(
      (() => {
        const packageJsonParsed = JSON.parse(
          fs
            .readFileSync(pathJoin(rootDirPath, 'package.json'))
            .toString('utf8'),
        );

        return {
          ...packageJsonParsed,
          main: packageJsonParsed['main']?.replace(/^dist\//, ''),
          types: packageJsonParsed['types']?.replace(/^dist\//, ''),
          module: packageJsonParsed['module']?.replace(/^dist\//, ''),
          bin: !('bin' in packageJsonParsed)
            ? undefined
            : Object.fromEntries(
                Object.entries(packageJsonParsed['bin']).map(([key, value]) => [
                  key,
                  (value as string).replace(/^dist\//, ''),
                ]),
              ),
          exports: !('exports' in packageJsonParsed)
            ? undefined
            : Object.fromEntries(
                Object.entries(packageJsonParsed['exports']).map(
                  ([key, value]) => [
                    key,
                    (value as string).replace(/^\.\/dist\//, './'),
                  ],
                ),
              ),
        };
      })(),
      null,
      2,
    ),
    'utf8',
  ),
);

/**
 * Retrieves a list of common third-party dependencies.
 * @returns {string[]} - An array of common third-party dependencies.
 */
const commonThirdPartyDeps = (() => {
  // For example [ "@emotion" ] it's more convenient than
  // having to list every sub emotion packages (@emotion/css @emotion/utils ...)
  // in singletonDependencies
  const namespaceSingletonDependencies: string[] = [];

  return [
    ...namespaceSingletonDependencies
      .map((namespaceModuleName) =>
        fs
          .readdirSync(
            pathJoin(rootDirPath, 'node_modules', namespaceModuleName),
          )
          .map((submoduleName) => `${namespaceModuleName}/${submoduleName}`),
      )
      .reduce((prev, curr) => [...prev, ...curr], []),
    ...singletonDependencies,
  ];
})();

/**
 * Returns the path to the global directory of Yarn.
 * @param {string} rootDirPath - The root directory path.
 * @returns {string} The path to the global directory of Yarn.
 */
const yarnGlobalDirPath = pathJoin(rootDirPath, '.yarn_home');

fs.rmSync(yarnGlobalDirPath, { recursive: true, force: true });
fs.mkdirSync(yarnGlobalDirPath);

/**
 * Executes the 'yarn link' command with the specified parameters.
 * @param {Object} params - The parameters for executing the command.
 * @param {string} params.targetModuleName - The name of the module to link. Optional.
 * @param {string} params.cwd - The current working directory.
 * @returns None
 */
const execYarnLink = (params: { targetModuleName?: string; cwd: string }) => {
  const { targetModuleName, cwd } = params;

  const cmd = [
    'yarn',
    'link',
    ...(targetModuleName !== undefined
      ? [targetModuleName]
      : ['--no-bin-links']),
  ].join(' ');

  console.log(`$ cd ${pathRelative(rootDirPath, cwd) || '.'} && ${cmd}`);

  execSync(cmd, {
    cwd,
    env: {
      ...process.env,
      HOME: yarnGlobalDirPath,
    },
  });
};

/**
 * Retrieves the paths of the test applications specified in the command line arguments.
 * @returns {string[]} An array of test application paths.
 */
const testAppPaths = (() => {
  const [, , ...testAppNames] = process.argv;

  return testAppNames
    .map((testAppName) => {
      const testAppPath = pathJoin(rootDirPath, '..', testAppName);

      if (fs.existsSync(testAppPath)) {
        return testAppPath;
      }

      console.warn(
        `Skipping ${testAppName} since it cant be found here: ${testAppPath}`,
      );

      return undefined;
    })
    .filter((path): path is string => path !== undefined);
})();

if (testAppPaths.length === 0) {
  console.error('No test app to link into!');
  process.exit(-1);
}

testAppPaths.forEach((testAppPath) =>
  execSync('yarn install', { cwd: testAppPath }),
);

console.log('=== Linking common dependencies ===');

const total = commonThirdPartyDeps.length;
let current = 0;

commonThirdPartyDeps.forEach((commonThirdPartyDep) => {
  current++;

  console.log(`${current}/${total} ${commonThirdPartyDep}`);

  const localInstallPath = pathJoin(
    ...[
      rootDirPath,
      'node_modules',
      ...(commonThirdPartyDep.startsWith('@')
        ? commonThirdPartyDep.split('/')
        : [commonThirdPartyDep]),
    ],
  );

  execYarnLink({ cwd: localInstallPath });
});

commonThirdPartyDeps.forEach((commonThirdPartyDep) =>
  testAppPaths.forEach((testAppPath) =>
    execYarnLink({
      cwd: testAppPath,
      targetModuleName: commonThirdPartyDep,
    }),
  ),
);

console.log('=== Linking in house dependencies ===');

execYarnLink({ cwd: pathJoin(rootDirPath, 'dist') });

testAppPaths.forEach((testAppPath) =>
  execYarnLink({
    cwd: testAppPath,
    targetModuleName: JSON.parse(
      fs.readFileSync(pathJoin(rootDirPath, 'package.json')).toString('utf8'),
    )['name'],
  }),
);

export {};

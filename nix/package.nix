{
  lib,
  stdenv,
  node,
  yarn,
  ffmpeg,
  nativeEnv,
  python3,
  pkg-config,
  makeWrapper,
  autoPatchelfHook,
  yarn-berry_4,
}:

stdenv.mkDerivation (
  nativeEnv
  // {
    pname = "dankbot";
    version = (builtins.fromJSON (builtins.readFile ../package.json)).version;

    # Explicit inputs keep credentials, local dependencies, and editor files out.
    src = lib.fileset.toSource {
      root = ../.;
      fileset = lib.fileset.unions [
        ../src
        ../tests
        ../sounds
        ../package.json
        ../yarn.lock
        ../.yarnrc.yml
        ../.yarn/releases
        ../tsconfig.json
        ../biome.json
        ../.gitignore
        ../scripts
      ];
    };

    offlineCache = yarn-berry_4.fetchYarnBerryDeps {
      yarnLock = ../yarn.lock;
      missingHashes = ./missing-hashes.json;
      hash = "sha256-wMSIcogLv5Wu12/zyVWzfcZgIa1InttnfvMwgYxKFO8=";
    };

    nativeBuildInputs = [
      node
      yarn
      python3
      pkg-config
      makeWrapper
    ]
    ++ lib.optional stdenv.hostPlatform.isLinux autoPatchelfHook;
    buildInputs = lib.optional stdenv.hostPlatform.isLinux stdenv.cc.cc.lib;

    YARN_ENABLE_NETWORK = "0";
    YARN_ENABLE_GLOBAL_CACHE = "false";
    YARN_ENABLE_IMMUTABLE_INSTALLS = "true";
    # Yarn generates its built-in TypeScript patch from the hashed offline input.
    YARN_ENABLE_TELEMETRY = "0";
    # Avoid retaining the compiler and build tools through patched script paths.
    dontPatchShebangs = true;

    configurePhase = ''
      runHook preConfigure
      export YARN_CACHE_FOLDER="$PWD/.yarn/cache"
      cp -r "$offlineCache/cache" "$YARN_CACHE_FOLDER"
      chmod -R u+w "$YARN_CACHE_FOLDER"
      yarn install --immutable --inline-builds
      ${lib.optionalString stdenv.hostPlatform.isLinux "autoPatchelf node_modules"}
      runHook postConfigure
    '';

    buildPhase = ''
      runHook preBuild
      yarn build
      runHook postBuild
    '';

    doCheck = true;
    checkPhase = ''
      runHook preCheck
      yarn lint
      node --test tests/*.test.cjs
      node --test scripts/release/*.test.mjs
      runHook postCheck
    '';

    installPhase = ''
      runHook preInstall
      yarn workspaces focus --production
      # The compiled addon lives in prebuild/. Gyp's temporary trees retain
      # references to Python and Node headers, which must stay out of the image.
      rm -rf node_modules/@discordjs/opus/build node_modules/@discordjs/opus/build-tmp-*
      mkdir -p "$out/lib/dankbot" "$out/bin"
      cp -r dist node_modules sounds package.json "$out/lib/dankbot/"
      makeWrapper ${node}/bin/node "$out/bin/dankbot" \
        --add-flags "$out/lib/dankbot/dist/index.js" \
        --chdir "$out/lib/dankbot" \
        --set FFMPEG_BIN ${ffmpeg}/bin/ffmpeg \
        --prefix PATH : ${lib.makeBinPath [ ffmpeg ]}
      runHook postInstall
    '';

    # Native prebuilt DAVE bindings must load against Nix's shared libraries.
    doInstallCheck = true;
    installCheckPhase = ''
      runHook preInstallCheck
      cd "$out/lib/dankbot"
      node -e 'const opus = new (require("@discordjs/opus").OpusEncoder)(48000, 2); opus.encode(Buffer.alloc(3840)); require("@snazzah/davey");'
      runHook postInstallCheck
    '';
  }
)

{
  description = "Dankbot development environment and Docker image";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        inherit (pkgs) lib;
        node = pkgs.nodejs_22;
        ffmpeg = pkgs.ffmpeg-headless;
        # Use the committed Yarn version, independently of Corepack or host PATH.
        yarn = pkgs.writeShellScriptBin "yarn" ''
          exec ${node}/bin/node ${./.yarn/releases/yarn-4.10.3.cjs} "$@"
        '';
        nativeEnv = {
          FFMPEG_BIN = "${ffmpeg}/bin/ffmpeg";
          npm_config_nodedir = "${pkgs.srcOnly node}";
          npm_config_node_gyp = "${node}/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js";
          npm_config_build_from_source = "true";
        };
        devShell = pkgs.mkShell (
          nativeEnv
          // {
            packages = [
              node
              yarn
              ffmpeg
              pkgs.python3
              pkgs.pkg-config
            ];
            NODE_OPTIONS = "--max-old-space-size=4096";
          }
        );
        bot = pkgs.callPackage ./nix/package.nix {
          inherit
            node
            yarn
            ffmpeg
            nativeEnv
            ;
        };
      in
      {
        devShells = {
          default = devShell;
          # Personal AI tooling is opt-in and does not affect the bot's closure.
          claude = devShell.overrideAttrs (old: {
            nativeBuildInputs = old.nativeBuildInputs ++ [
              (import nixpkgs {
                inherit system;
                config.allowUnfreePredicate = pkg: lib.getName pkg == "claude-code";
              }).claude-code
            ];
          });
        };

        packages = {
          default = bot;
          inherit bot;
        }
        // lib.optionalAttrs pkgs.stdenv.hostPlatform.isLinux {
          dockerImage = pkgs.dockerTools.buildLayeredImage {
            name = "jonocairns/dankbot";
            tag = "latest";
            contents = [ pkgs.cacert ];
            extraCommands = ''
              mkdir -p tmp
              chmod 1777 tmp
            '';
            config = {
              User = "1000:1000";
              WorkingDir = "${bot}/lib/dankbot";
              Cmd = [ "${bot}/bin/dankbot" ];
              Env = [
                "NODE_ENV=production"
                "PATH=${
                  lib.makeBinPath [
                    node
                    ffmpeg
                  ]
                }"
                "FFMPEG_BIN=${ffmpeg}/bin/ffmpeg"
                "SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
                "NODE_EXTRA_CA_CERTS=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
              ];
              Labels = {
                "org.opencontainers.image.source" = "https://github.com/jonocairns/dankbot";
                "org.opencontainers.image.version" = bot.version;
              };
            };
          };
        };

        checks.default = bot;
        formatter = pkgs.nixfmt;
      }
    );
}

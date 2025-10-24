{
  description = "Node.js dev env (pnpm/yarn/ts + Claude Code)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";  # <-- was 24.05
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;  # <-- required for claude-code
        };
        node = pkgs.nodejs_22;        # Node 18+ required; 22 is fine
      in {
        devShells.default = pkgs.mkShell {
          packages = [
            node
            # Yarn 4 via Corepack (don't use pkgs.nodePackages.yarn)
            pkgs.claude-code            # <-- the CLI
          ];

          shellHook = ''
            export NODE_OPTIONS="--max-old-space-size=4096"
            # Yarn 4 is already in .yarn/releases, no corepack enable needed
            echo "Node $(node -v) | Yarn $(yarn -v 2>/dev/null || echo 'run: yarn install') | Claude $(claude --version 2>/dev/null || echo not-installed)"
          '';
        };
      });
}
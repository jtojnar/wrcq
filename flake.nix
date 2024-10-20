{
  description = "System for tracking prequalified entrants for world rogaining championships";

  inputs = {
    flake-compat = {
      url = "github:edolstra/flake-compat";
      flake = false;
    };

    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

    utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, flake-compat, nixpkgs, utils }:
    utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells = {
          default = pkgs.mkShell {
            nativeBuildInputs = [
              pkgs.html-tidy
              pkgs.nodejs_latest
              (pkgs.python3.withPackages (pp: [
                pp.beautifulsoup4
                pp.requests
              ]))
            ];
          };
        };
      }
    );
}

import type { UserConfig } from "@commitlint/types";

const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Allowed commit types
    "type-enum": [
      2,
      "always",
      [
        "feat",     // new feature
        "fix",      // bug fix
        "docs",     // documentation only
        "style",    // formatting, no logic change
        "refactor", // code change that is neither fix nor feat
        "perf",     // performance improvement
        "test",     // adding/fixing tests
        "build",    // build system or dependency changes
        "ci",       // CI configuration changes
        "chore",    // other changes (e.g. release commits)
        "revert",   // revert a previous commit
      ],
    ],
    // Scope is optional but must be lowercase if present
    "scope-case": [2, "always", "lower-case"],
    // Subject must start with lowercase
    "subject-case": [2, "always", "lower-case"],
    // No period at the end of the subject
    "subject-full-stop": [2, "never", "."],
    // Subject must not be empty
    "subject-empty": [2, "never"],
    // Keep it readable in GitHub PR lists
    "header-max-length": [2, "always", 100],
  },
};

export default config;

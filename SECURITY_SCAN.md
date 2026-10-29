# Secret scan review — 2026-10-29

Gitleaks 8.30.1 scanned all locally available refs and full history (309 commits), starting from checkout `568ad867a806c138f887cc6dc6af747d40693312`. The repository is not shallow. Fetching both remotes failed, so remote-only history is not covered.

Reproduce the history scan from the repository root:

```sh
gitleaks git . --log-opts="--all --full-history" --redact=100 --ignore-gitleaks-allow --report-format=json --report-path=/tmp/gitleaks-history-redacted.json
```

The scan returned 45 historical findings (exit status 1). Repeated findings across commits are counted separately. No credential values are included here.

| Historical file | Occurrences | Example commit | Review |
| --- | ---: | --- | --- |
| `api.js` | 22 | `9c741e71a283` | Unverified string in historical obfuscated JavaScript; no provider credential identified. |
| `eslint.config.mjs` | 22 | `2c33980e5db0` | Unverified string in historical obfuscated JavaScript; no provider credential identified. |
| `src/docs/swagger/renter.swagger.ts` | 1 | `2d5a3ec76a42` | Truncated refresh-token example; not a complete usable credential. |

A separate scan of the existing tracked working-tree files returned no findings (exit status 0). The flagged obfuscated JavaScript is absent from the current tracked files. Historical findings remain in Git history; this change does not rewrite history or suppress scanner findings.

No active provider credential was confirmed, and no credentials have been rotated or revoked. The historical obfuscated code is not established to be safe: if it ran in a development, CI, or production environment, the service owners must assess and rotate credentials accessible to that environment. Provider administration and deployment access are needed to carry out and verify those rotations; repository cleanup alone does not rotate a key.

# Secret scan review — 2026-10-29

Gitleaks 8.30.1 scanned all locally available refs and full history (309 commits), starting from checkout `568ad867a806c138f887cc6dc6af747d40693312`. The repository is not shallow. Fetching both remotes failed, so remote-only history is not covered.

Reproduce the history scan from the repository root:

```sh
gitleaks git . --log-opts="--all --full-history" --redact=100 --ignore-gitleaks-allow --report-format=json --report-path=/tmp/gitleaks-history-redacted.json
```

Before the reviewed exceptions below, the scan returned 45 historical findings (exit status 1). Repeated findings across commits are counted separately. No credential values are included here.

| Historical file | Occurrences | Example commit | Review |
| --- | ---: | --- | --- |
| `api.js` | 22 | `9c741e71a283` | Verified non-secret Base64 source chunk; decodes to the `xorDecode` loop. |
| `eslint.config.mjs` | 22 | `2c33980e5db0` | Verified non-secret Base64 source chunk; decodes to the `xorDecode` loop. |
| `src/docs/swagger/renter.swagger.ts` | 1 | `2d5a3ec76a42` | Truncated refresh-token example; not a complete usable credential. |

A separate scan of the existing tracked working-tree files returned no findings (exit status 0). The flagged obfuscated JavaScript is absent from the current tracked files. Historical content remains in Git history. `.gitleaksignore` records only the reviewed false-positive fingerprints, each scoped to its original commit, file, rule, and line; no paths, rules, or commits are broadly excluded.

No active provider credential was confirmed, and no credentials have been rotated or revoked. The historical obfuscated code is not established to be safe: if it ran in a development, CI, or production environment, the service owners must assess and rotate credentials accessible to that environment. Provider administration and deployment access are needed to carry out and verify those rotations; repository cleanup alone does not rotate a key.

## Reviewed false positives and push-hook validation

The original raw findings were reviewed without executing the historical JavaScript. Joining and Base64-decoding its string array shows that the matched chunk spans the `xorDecode` loop: `const kn = key.length;` and `buf[i] ^= key.charCodeAt(i % kn);`. This chunk is encoded source text, not an API credential. Every obfuscated-source finding listed above was checked individually against this decoded context. The API documentation finding, where present, is an incomplete example ending in `...`.

Only these exact historical fingerprints are listed in `.gitleaksignore`. The normal `gitleaks git --redact .` pre-push scan and an explicit `--all --full-history` scan pass with those reviewed exceptions. A temporary Git repository containing a synthetic new credential verifies that the same exceptions do not suppress new secrets. This does not establish that the historical injected code was safe and does not replace provider-side incident response or credential rotation.

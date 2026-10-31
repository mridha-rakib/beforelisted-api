# Production dependency remediation — 2026-10-31

The API audit reported three high-severity production dependencies. The npm and pnpm lockfiles now resolve:

| Package | Previous version | Updated version | Advisory |
| --- | --- | --- | --- |
| body-parser | 2.3.0 | 2.4.0 | GHSA-27r3-jxmh-p828 |
| multer | 2.4.0 | 2.5.0 | GHSA-q7qp-rjg7-q26m |
| follow-redirects | 1.16.1 | 1.16.2 | GHSA-mrwp-f3q8-3g9p |

The direct Multer range now starts at `^2.5.0`. Other application dependency ranges are unchanged. Published SHA-512 integrity values remain present for all three updated packages. The body-parser and Multer dependency declarations were checked against their upstream release tags.

Removed the unused direct dependencies `@sendgrid/mail` and `swagger-ui` and pruned their exclusive dependency trees from both lockfiles. Source inspection found no imports of either dependency: email delivery uses Postmark, and API documentation uses `swagger-ui-express`. This removes the reported `deepmerge` dependency chains without downgrading SendGrid or replacing the documentation middleware.

Validation completed locally:

- Offline npm lockfile resolution and `npm ci --dry-run --offline --ignore-scripts --audit=false` pass.
- The package manifest and root lockfile dependencies agree, updated npm/pnpm versions and checksums agree, and every retained pnpm snapshot reference resolves.
- `node scripts/security-check.mjs` and Git whitespace checks pass.

The registry audit endpoint is unreachable in this environment. A successful live audit is not yet verified. Application tests and type-checking could not run because dependencies are not installed. CI must run the normal install, tests, build, and `npm audit --omit=dev --audit-level=high` before merging.

The separately reported moderate advisories affecting glob/minimatch, ExcelJS, Firebase, and related dependency trees are not all resolved by this change. They require compatibility review of the proposed major upgrades. The existing high/critical audit gate remains enabled. The legacy `bun.lock`, already out of sync with the npm/pnpm manifests before this change, has not been regenerated.

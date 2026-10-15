# Security Policy

## Supported branch

Security fixes are prepared against `main`. Production deployments should be
created only from a reviewed commit on the protected `main` branch.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability, exposed credential,
or repository compromise. Use the repository's private vulnerability-reporting
feature when it is enabled. Otherwise, report it privately through the existing
BeforeListed support contact (`support@beforelisted.com`) and include the
affected URL or path, reproduction steps, and impact without including secret
values.

## Incident response

1. Preserve evidence: commit IDs, pull-request links, workflow run IDs, file
   paths, timestamps, and a read-only diff.
2. Do not run suspicious scripts, install hooks, or builds until reviewed.
3. Restrict repository access and review GitHub Apps, deploy keys, fine-grained
   tokens, Actions workflows, and recent audit-log events.
4. Revoke and rotate credentials that may have been exposed or reachable from a
   compromised runtime. This includes database, email, storage, Stripe, and JWT
   signing secrets.
5. Restore from a verified commit through a reviewed pull request; do not hide
   evidence by rewriting history before an investigation is complete.

## Security maintenance

- Review Dependabot and dependency-audit findings before merging updates.
- Keep GitHub Actions pinned to reviewed immutable commit SHAs and update the
  pins deliberately.
- Keep `.env` files, private keys, and deployment credentials out of Git.
  Browser-visible configuration is not secret storage.
- Require MFA or passkeys for repository and cloud accounts, least-privilege
  access, and an independent pull-request review where the team can support it.

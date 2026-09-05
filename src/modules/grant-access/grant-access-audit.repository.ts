// file: src/modules/grant-access/grant-access-audit.repository.ts

import { BaseRepository } from "@/modules/base/base.repository";

import { GrantAccessUnmatchAuditModel } from "./grant-access-audit.model";

import type { IGrantAccessUnmatchAudit } from "./grant-access-audit.model";

/**
 * Repository for the `grantaccess_unmatch_audit` collection.
 *
 * The base class (`BaseRepository<IGrantAccessUnmatchAudit>`) provides
 * `create`, `findById`, `find`, `updateById`, `deleteById` — which is all
 * we need for the unmatch audit path. No custom query methods are added
 * today; if reports or admin views are added later they should go here.
 */
export class GrantAccessAuditRepository extends BaseRepository<IGrantAccessUnmatchAudit> {
  constructor() {
    super(GrantAccessUnmatchAuditModel);
  }
}

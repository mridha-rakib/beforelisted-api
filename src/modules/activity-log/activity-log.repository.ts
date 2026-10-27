import { BaseRepository } from "@/modules/base/base.repository";

import type { IActivityLog } from "./activity-log.model.js";

import { ActivityLog } from "./activity-log.model.js";

export class ActivityLogRepository extends BaseRepository<IActivityLog> {
  constructor() {
    super(ActivityLog);
  }
}

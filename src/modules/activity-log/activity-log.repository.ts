import { BaseRepository } from "@/modules/base/base.repository";

import type { IActivityLog } from "./activity-log.model";

import { ActivityLog } from "./activity-log.model";

export class ActivityLogRepository extends BaseRepository<IActivityLog> {
  constructor() {
    super(ActivityLog);
  }
}

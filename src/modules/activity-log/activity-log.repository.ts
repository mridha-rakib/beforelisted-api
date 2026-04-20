import { BaseRepository } from "@/modules/base/base.repository";
import { ActivityLog, type IActivityLog } from "./activity-log.model";

export class ActivityLogRepository extends BaseRepository<IActivityLog> {
  constructor() {
    super(ActivityLog);
  }
}


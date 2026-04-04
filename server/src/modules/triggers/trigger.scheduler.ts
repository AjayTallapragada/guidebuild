import { RowDataPacket } from "mysql2";
import { getDb } from "../../config/db.js";
import { triggerService } from "./trigger.service.js";

type ActivePolicyOwnerRow = RowDataPacket & {
  user_id: number;
};

export class TriggerScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  start() {
    if (this.intervalId) {
      return;
    }

    void this.runOnce();
    this.intervalId = setInterval(() => {
      void this.runOnce();
    }, 5 * 60 * 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async runOnce() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    try {
      const db = getDb();
      const [rows] = await db.query<ActivePolicyOwnerRow[]>(
        "SELECT DISTINCT user_id FROM policies WHERE status = 'active'"
      );

      for (const row of rows) {
        const userId = String(row.user_id);
        await triggerService.evaluateAutomatedTriggers(userId, userId);
      }
    } catch (error) {
      console.error("Automated trigger scheduler failed", error);
    } finally {
      this.isRunning = false;
    }
  }
}

export const triggerScheduler = new TriggerScheduler();
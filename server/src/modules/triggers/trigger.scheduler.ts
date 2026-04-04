import { runAutomatedTriggerSweep } from "./trigger.sweep.js";

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
      await runAutomatedTriggerSweep();
    } catch (error) {
      console.error("Automated trigger scheduler failed", error);
    } finally {
      this.isRunning = false;
    }
  }
}

export const triggerScheduler = new TriggerScheduler();
import { getPool, sql } from '../config/database';
import { notificationService } from '../services/notification.service';
import { logger } from '../utils/logger';

export class ReminderEngine {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  start(intervalMs = 60000): void {
    logger.info('🚀 Reminder & SLA engine started');
    // Allow 10s grace period for initial server boot before running first cycle
    setTimeout(() => {
      this.processDueItems();
    }, 10000);
    this.timer = setInterval(() => {
      this.processDueItems();
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('Reminder engine stopped');
    }
  }

  async processDueItems(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      await this.checkUpcomingFollowUps();
      await this.checkOverdueFollowUps();
      await this.checkTicketSLABreaches();
    } catch (err) {
      logger.error('Error in reminder engine cycle', { error: (err as Error).message });
    } finally {
      this.isProcessing = false;
    }
  }

  private async checkUpcomingFollowUps(): Promise<void> {
    try {
      const pool = getPool();
      // Find follow-ups due in the next 15 minutes where reminder has not been sent
      const result = await pool.request().query<{
        id: string;
        title: string;
        assigned_to: string;
        scheduled_at: Date;
      }>(`
        SELECT id, title, assigned_to, scheduled_at
        FROM follow_ups
        WHERE status IN ('Pending', 'In Progress')
          AND reminder_sent = 0
          AND scheduled_at <= DATEADD(minute, 15, GETUTCDATE())
          AND scheduled_at >= DATEADD(minute, -5, GETUTCDATE())
      `);

      for (const item of result.recordset) {
        await notificationService.create({
          userId: item.assigned_to,
          type: 'followup_reminder',
          title: 'Upcoming Follow-up Reminder',
          body: `Task "${item.title}" is scheduled soon.`,
          data: { entityType: 'followup', entityId: item.id, url: '/follow-ups/today' },
        });

        await pool.request()
          .input('id', sql.UniqueIdentifier, item.id)
          .query('UPDATE follow_ups SET reminder_sent = 1, reminder_sent_at = GETUTCDATE() WHERE id = @id');
      }
    } catch (error) {
      logger.debug('checkUpcomingFollowUps error', { error: (error as Error).message });
    }
  }

  private async checkOverdueFollowUps(): Promise<void> {
    try {
      const pool = getPool();
      // Mark as overdue if past scheduled time and not completed
      await pool.request().query(`
        UPDATE follow_ups
        SET status = 'Overdue', updated_at = GETUTCDATE()
        WHERE status = 'Pending'
          AND scheduled_at < GETUTCDATE()
      `);
    } catch (error) {
      logger.debug('checkOverdueFollowUps error', { error: (error as Error).message });
    }
  }

  private async checkTicketSLABreaches(): Promise<void> {
    try {
      const pool = getPool();
      // Find open tickets where resolution due date has passed
      const result = await pool.request().query<{
        id: string;
        ticket_number: string;
        title: string;
        assigned_to?: string;
      }>(`
        SELECT id, ticket_number, title, assigned_to
        FROM tickets
        WHERE status NOT IN ('Resolved', 'Closed')
          AND resolution_due_at < GETUTCDATE()
          AND resolution_due_at >= DATEADD(hour, -2, GETUTCDATE())
      `);

      for (const t of result.recordset) {
        if (t.assigned_to) {
          await notificationService.create({
            userId: t.assigned_to,
            type: 'ticket_escalation',
            title: `SLA Breached: [${t.ticket_number}]`,
            body: `Ticket "${t.title}" has breached its SLA resolution deadline!`,
            data: { entityType: 'ticket', entityId: t.id, url: `/tickets/${t.id}` },
          });
        }
      }
    } catch (error) {
      logger.debug('checkTicketSLABreaches error', { error: (error as Error).message });
    }
  }
}

export const reminderEngine = new ReminderEngine();

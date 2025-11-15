export type TaskStatus = "pending" | "in-progress" | "done";

export interface RoutineTask {
  id: string;
  title: string;
  note?: string;
  dueAt?: string | null;
  repeatMinutes: number;
  status: TaskStatus;
  createdAt: number;
  lastReminderAt?: number | null;
  lastAcknowledgedAt?: number | null;
}

export type MessageTone = "neutral" | "celebrate" | "alert";

export interface AgentMessage {
  id: string;
  role: "agent" | "user";
  content: string;
  createdAt: number;
  tone: MessageTone;
}

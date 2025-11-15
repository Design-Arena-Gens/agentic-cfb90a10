"use client";

import { RoutineTask, TaskStatus } from "../types";

interface TaskBoardProps {
  tasks: RoutineTask[];
  onStatusChange: (id: string, status: TaskStatus) => void;
  onSnooze: (id: string, minutes: number) => void;
  onDelete: (id: string) => void;
}

function formatDueDate(task: RoutineTask): string {
  if (!task.dueAt) {
    return "No target time";
  }

  const due = new Date(task.dueAt);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const formatter = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  });

  if (diffMs < 0) {
    const minutes = Math.round(Math.abs(diffMs) / 60000);
    if (minutes < 60) {
      return `${minutes} min overdue`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours < 24) {
      return `${hours}h ${remainingMinutes}m overdue`;
    }
    const days = Math.floor(hours / 24);
    return `${days}d overdue`;
  }

  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) {
    return "Due now";
  }
  if (minutes < 60) {
    return `Due in ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return `Due in ${hours}h ${remainingMinutes}m`;
  }
  return `Due ${formatter.format(due)}`;
}

function statusBadge(status: TaskStatus) {
  switch (status) {
    case "pending":
      return <span className="status status-pending">Queued</span>;
    case "in-progress":
      return <span className="status status-progress">In motion</span>;
    case "done":
      return <span className="status status-done">Complete</span>;
    default:
      return null;
  }
}

export function TaskBoard({ tasks, onStatusChange, onSnooze, onDelete }: TaskBoardProps) {
  const sorted = [...tasks].sort((a, b) => {
    if (a.status === "done" && b.status !== "done") return 1;
    if (a.status !== "done" && b.status === "done") return -1;

    const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    return aDue - bDue;
  });

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Today&apos;s commitments</h2>
        <p className="panel-sub">Track progress and let the agent orchestrate your nudges.</p>
      </div>
      <div className="task-grid">
        {sorted.length === 0 ? (
          <div className="empty-state">
            <h3>No tasks yet</h3>
            <p>Add a new focus block and the assistant will keep you accountable.</p>
          </div>
        ) : (
          sorted.map((task) => (
            <article key={task.id} className={`task-card task-${task.status}`}>
              <header className="task-card-header">
                <div>
                  <h3>{task.title}</h3>
                  <p className="task-meta">{formatDueDate(task)}</p>
                </div>
                {statusBadge(task.status)}
              </header>
              {task.note ? <p className="task-note">{task.note}</p> : null}
              <footer className="task-card-footer">
                {task.status !== "done" ? (
                  <div className="task-actions">
                    {task.status === "pending" ? (
                      <button type="button" onClick={() => onStatusChange(task.id, "in-progress")}>
                        Start
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="done-btn"
                      onClick={() => onStatusChange(task.id, "done")}
                    >
                      Mark done
                    </button>
                    <button type="button" className="ghost-btn" onClick={() => onSnooze(task.id, 15)}>
                      Snooze 15m
                    </button>
                  </div>
                ) : (
                  <div className="task-actions">
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => onStatusChange(task.id, "pending")}
                    >
                      Reset
                    </button>
                  </div>
                )}
                <button type="button" className="ghost-btn danger" onClick={() => onDelete(task.id)}>
                  Delete
                </button>
              </footer>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

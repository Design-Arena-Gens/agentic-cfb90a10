"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { AssistantFeed } from "../components/AssistantFeed";
import { TaskComposer, TaskDraft } from "../components/TaskComposer";
import { TaskBoard } from "../components/TaskBoard";
import { AgentMessage, RoutineTask, TaskStatus } from "../types";

const TASKS_KEY = "routine-companion.tasks";
const FEED_KEY = "routine-companion.feed";

interface TaskAction {
  type:
    | "hydrate"
    | "add"
    | "updateStatus"
    | "delete"
    | "ackReminder"
    | "snooze";
  payload?: unknown;
}

type UpdateStatusPayload = { id: string; status: TaskStatus; timestamp: number };
type SnoozePayload = { id: string; minutes: number; timestamp: number };

type AckPayload = { id: string; timestamp: number };

function routineReducer(state: RoutineTask[], action: TaskAction): RoutineTask[] {
  switch (action.type) {
    case "hydrate":
      return Array.isArray(action.payload) ? (action.payload as RoutineTask[]) : state;
    case "add":
      return [action.payload as RoutineTask, ...state];
    case "updateStatus": {
      const { id, status, timestamp } = action.payload as UpdateStatusPayload;
      return state.map((task) =>
        task.id === id
          ? {
              ...task,
              status,
              lastAcknowledgedAt: timestamp,
              lastReminderAt: status === "done" ? timestamp : task.lastReminderAt
            }
          : task
      );
    }
    case "ackReminder": {
      const { id, timestamp } = action.payload as AckPayload;
      return state.map((task) =>
        task.id === id
          ? {
              ...task,
              lastReminderAt: timestamp
            }
          : task
      );
    }
    case "snooze": {
      const { id, minutes, timestamp } = action.payload as SnoozePayload;
      return state.map((task) => {
        if (task.id !== id) {
          return task;
        }
        const base = task.dueAt ? new Date(task.dueAt).getTime() : Date.now();
        const nextDue = new Date(base + minutes * 60_000).toISOString();
        return {
          ...task,
          dueAt: nextDue,
          lastReminderAt: timestamp
        };
      });
    }
    case "delete": {
      const id = action.payload as string;
      return state.filter((task) => task.id !== id);
    }
    default:
      return state;
  }
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function buildTask(draft: TaskDraft): RoutineTask {
  return {
    id: makeId(),
    title: draft.title,
    note: draft.note || undefined,
    dueAt: draft.dueAt ?? null,
    repeatMinutes: draft.repeatMinutes,
    status: "pending",
    createdAt: Date.now(),
    lastReminderAt: null,
    lastAcknowledgedAt: null
  };
}

export default function HomePage() {
  const [tasksHydrated, setTasksHydrated] = useState(false);
  const [feedHydrated, setFeedHydrated] = useState(false);
  const [tasks, dispatch] = useReducer(routineReducer, [] as RoutineTask[]);
  const [feed, setFeed] = useState<AgentMessage[]>([]);

  const pushAgentMessage = useCallback((content: string, tone: AgentMessage["tone"] = "neutral") => {
    setFeed((previous) => {
      const message: AgentMessage = {
        id: makeId(),
        role: "agent",
        tone,
        content,
        createdAt: Date.now()
      };
      const merged = [message, ...previous].slice(0, 40);
      return merged.sort((a, b) => a.createdAt - b.createdAt);
    });
  }, []);

  useEffect(() => {
    if (tasksHydrated) {
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    }
  }, [tasks, tasksHydrated]);

  useEffect(() => {
    if (feedHydrated) {
      localStorage.setItem(FEED_KEY, JSON.stringify(feed));
    }
  }, [feed, feedHydrated]);

  useEffect(() => {
    const storedTasks = localStorage.getItem(TASKS_KEY);
    if (storedTasks) {
      try {
        const parsed: RoutineTask[] = JSON.parse(storedTasks);
        dispatch({ type: "hydrate", payload: parsed });
      } catch (error) {
        console.error("Failed to parse stored tasks", error);
      }
    }
    setTasksHydrated(true);
  }, []);

  useEffect(() => {
    const storedFeed = localStorage.getItem(FEED_KEY);
    if (storedFeed) {
      try {
        const parsed: AgentMessage[] = JSON.parse(storedFeed);
        setFeed(parsed);
      } catch (error) {
        console.error("Failed to parse stored feed", error);
      }
    }
    setFeedHydrated(true);
  }, []);

  const handleCreateTask = useCallback(
    (draft: TaskDraft) => {
      const task = buildTask(draft);
      dispatch({ type: "add", payload: task });
      pushAgentMessage(`Got it. I will keep nudging you on “${task.title}”.`, "neutral");
    },
    [pushAgentMessage]
  );

  const handleStatusChange = useCallback(
    (id: string, status: TaskStatus) => {
      const task = tasks.find((item) => item.id === id);
      const timestamp = Date.now();
      dispatch({ type: "updateStatus", payload: { id, status, timestamp } satisfies UpdateStatusPayload });
      if (!task) {
        return;
      }
      if (status === "done") {
        pushAgentMessage(`Beautiful work on “${task.title}”. Logging it as complete.`, "celebrate");
      } else if (status === "in-progress") {
        pushAgentMessage(`Starting “${task.title}”. I will hold you to it.`, "neutral");
      } else {
        pushAgentMessage(`Resetting “${task.title}”. Tell me when you ignite it again.`, "neutral");
      }
    },
    [pushAgentMessage, tasks]
  );

  const handleSnooze = useCallback(
    (id: string, minutes: number) => {
      const task = tasks.find((item) => item.id === id);
      const timestamp = Date.now();
      dispatch({ type: "snooze", payload: { id, minutes, timestamp } satisfies SnoozePayload });
      if (task) {
        pushAgentMessage(`Snoozed “${task.title}” for ${minutes} minutes. I will circle back soon.`, "neutral");
      }
    },
    [pushAgentMessage, tasks]
  );

  const handleDelete = useCallback(
    (id: string) => {
      const task = tasks.find((item) => item.id === id);
      dispatch({ type: "delete", payload: id });
      if (task) {
        pushAgentMessage(`Removing “${task.title}” from the roster.`, "neutral");
      }
    },
    [pushAgentMessage, tasks]
  );

  const evaluateReminders = useCallback(() => {
    const now = Date.now();

    tasks.forEach((task) => {
      if (task.status === "done") {
        return;
      }

      const interval = Math.max(task.repeatMinutes, 5) * 60_000;
      const lastReminder = task.lastReminderAt ?? 0;
      const dueAt = task.dueAt ? new Date(task.dueAt).getTime() : null;
      const isOverdue = typeof dueAt === "number" && dueAt < now;
      const dueSoon = typeof dueAt === "number" && dueAt >= now && dueAt - now <= 15 * 60_000;
      const elapsedSinceReminder = now - lastReminder;

      if (!isOverdue && !dueSoon) {
        return;
      }

      if (elapsedSinceReminder < interval) {
        return;
      }

      dispatch({ type: "ackReminder", payload: { id: task.id, timestamp: now } satisfies AckPayload });

      if (isOverdue) {
        pushAgentMessage(
          `“${task.title}” is still open and overdue. What is blocking progress?`,
          "alert"
        );
      } else if (dueSoon) {
        const minutes = Math.max(1, Math.round((dueAt! - now) / 60_000));
        pushAgentMessage(
          `“${task.title}” is coming up in ${minutes} minute${minutes === 1 ? "" : "s"}. Prep now so you glide into it.`,
          "alert"
        );
      }
    });
  }, [pushAgentMessage, tasks]);

  useEffect(() => {
    if (!tasksHydrated) {
      return;
    }
    const interval = setInterval(() => {
      evaluateReminders();
    }, 30_000);

    evaluateReminders();

    return () => clearInterval(interval);
  }, [evaluateReminders, tasksHydrated]);

  const pendingTasks = tasks.filter((task) => task.status !== "done");
  const completedToday = tasks.filter((task) => task.status === "done").length;
  const nextFocus = pendingTasks
    .slice()
    .sort((a, b) => {
      const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
      const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
      return aDue - bDue;
    })[0];

  return (
    <main>
      <header className="hero">
        <p className="hero-kicker">Agentic Routine Companion</p>
        <h1>Stay accountable with a minimalist Jarvis for your day.</h1>
        <p className="hero-sub">
          Thread your commitments into a single command center. The assistant keeps watch, nudges you when
          momentum slips, and celebrates wins.
        </p>
        <div className="hero-stats">
          <div className="stat">
            <span className="stat-label">Active focuses</span>
            <span className="stat-value">{pendingTasks.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Completed today</span>
            <span className="stat-value">{completedToday}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Next up</span>
            <span className="stat-value">{nextFocus ? nextFocus.title : "Nothing scheduled"}</span>
          </div>
        </div>
      </header>

      <div className="layout">
        <TaskComposer onCreate={handleCreateTask} />
        <TaskBoard tasks={tasks} onStatusChange={handleStatusChange} onSnooze={handleSnooze} onDelete={handleDelete} />
        <AssistantFeed messages={feed} />
      </div>
    </main>
  );
}

"use client";

import { FormEvent, useState } from "react";

export interface TaskDraft {
  title: string;
  note: string;
  dueAt?: string | null;
  repeatMinutes: number;
}

interface TaskComposerProps {
  onCreate: (draft: TaskDraft) => void;
}

const cadenceOptions = [
  { label: "Every 15 minutes", value: 15 },
  { label: "Every 30 minutes", value: 30 },
  { label: "Hourly", value: 60 },
  { label: "Every 2 hours", value: 120 },
  { label: "Once a day", value: 720 }
];

export function TaskComposer({ onCreate }: TaskComposerProps) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [dueAt, setDueAt] = useState<string>("");
  const [repeatMinutes, setRepeatMinutes] = useState<number>(60);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return;
    }

    onCreate({
      title: trimmedTitle,
      note: note.trim(),
      dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      repeatMinutes
    });

    setTitle("");
    setNote("");
    setDueAt("");
    setRepeatMinutes(60);
  };

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <h2>Create a new focus block</h2>
        <p className="panel-sub">Tell the agent what matters, it will nudge until it is done.</p>
      </div>
      <div className="field-group">
        <label className="field">
          <span>Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Morning workout, Deep work sprint, Inbox review..."
          />
        </label>
        <label className="field">
          <span>Details</span>
          <textarea
            value={note}
            rows={3}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add context, requirements, or resources the agent should remember."
          />
        </label>
        <div className="field-split">
          <label className="field">
            <span>Target time</span>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Reminder cadence</span>
            <select
              value={repeatMinutes}
              onChange={(event) => setRepeatMinutes(Number(event.target.value))}
            >
              {cadenceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="panel-actions">
        <button type="submit" className="primary-btn">
          Schedule with the agent
        </button>
      </div>
    </form>
  );
}

"use client";

import { memo, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { clsx } from "clsx";
import { CalendarCheck, FileText, GripVertical, Mail, Phone, Users } from "lucide-react";

import type { Application, Student } from "@/lib/mock-data";
import { PIPELINE_STAGES, PipelineStageId, stageLabel, stageTone } from "@/lib/pipeline";

export function PipelineBoard({
  companyId,
  applications,
  students,
  readOnly = false,
}: {
  companyId: string;
  applications: Application[];
  students: Student[];
  readOnly?: boolean;
}) {
  const [cards, setCards] = useState(applications);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState<{
    ids: string[];
    targetStage: PipelineStageId;
  } | null>(null);
  const [syncingIds, setSyncingIds] = useState<string[]>([]);
  const [syncError, setSyncError] = useState("");
  const [remarks, setRemarks] = useState("");
  const [rejectedAtRound, setRejectedAtRound] = useState<PipelineStageId>("TECHNICAL_ROUND_1");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const studentMap = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );

  function toggleSelection(id: string) {
    if (readOnly) return;
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function onDragEnd(event: DragEndEvent) {
    const targetStage = event.over?.id as PipelineStageId | undefined;
    const activeId = String(event.active.id);

    if (readOnly) {
      return;
    }

    if (!targetStage || !PIPELINE_STAGES.some((stage) => stage.id === targetStage)) {
      return;
    }

    const ids = selected.includes(activeId) ? selected : [activeId];
    requestMove(ids, targetStage);
  }

  function requestMove(ids: string[], targetStage: PipelineStageId) {
    if (targetStage === "SELECTED" || targetStage === "REJECTED" || targetStage === "DROPPED") {
      setPending({ ids, targetStage });
      setRemarks("");
      return;
    }

    applyMove(ids, targetStage);
  }

  async function applyMove(
    ids: string[],
    targetStage: PipelineStageId,
    extra?: { remarks?: string; rejectedAtRound?: PipelineStageId },
  ) {
    const today = new Date().toISOString().slice(0, 10);
    const previousCards = cards;

    setSyncError("");
    setSyncingIds((current) => Array.from(new Set([...current, ...ids])));
    setCards((current) =>
      current.map((card) => {
        if (!ids.includes(card.id)) return card;

        return {
          ...card,
          currentStage: targetStage,
          currentOutcome:
            targetStage === "SELECTED"
              ? "SELECTED"
              : targetStage === "REJECTED"
                ? "REJECTED"
                : "PENDING",
          remarks: extra?.remarks ?? card.remarks,
          rejectedAtRound:
            targetStage === "REJECTED" ? extra?.rejectedAtRound ?? card.currentStage : undefined,
          rejectionReason: targetStage === "REJECTED" ? extra?.remarks : undefined,
          selectedRound: targetStage === "SELECTED" ? card.currentStage : card.selectedRound,
          selectedAt: targetStage === "SELECTED" ? today : card.selectedAt,
          droppedStage: targetStage === "DROPPED" ? card.currentStage : undefined,
          droppedReason: targetStage === "DROPPED" ? extra?.remarks : undefined,
          roundStatuses: [
            ...card.roundStatuses,
            {
              stage: targetStage,
              outcome:
                targetStage === "SELECTED"
                  ? "SELECTED"
                  : targetStage === "REJECTED"
                    ? "REJECTED"
                    : "PENDING",
              remarks: extra?.remarks,
              changedAt: today,
            },
          ],
        };
      }),
    );
    setSelected((current) => current.filter((id) => !ids.includes(id)));
    setPending(null);

    const response = await fetch("/api/applications/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        applicationIds: ids,
        targetStage,
        remarks: extra?.remarks,
        rejectedAtRound: extra?.rejectedAtRound,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setCards(previousCards);
      setSyncError(data?.error || data?.sheetResult?.reason || "Status sync failed.");
    }

    setSyncingIds((current) => current.filter((id) => !ids.includes(id)));
  }

  function submitTerminalMove() {
    if (!pending || !remarks.trim()) return;
    applyMove(pending.ids, pending.targetStage, {
      remarks,
      rejectedAtRound: pending.targetStage === "SELECTED" ? undefined : rejectedAtRound,
    });
  }

  async function deleteSelected() {
    if (selected.length === 0) return;
    const ok = window.confirm(`Delete ${selected.length} application(s) from the sheet?`);
    if (!ok) return;

    const previousCards = cards;
    setCards((current) => current.filter((card) => !selected.includes(card.id)));
    const response = await fetch("/api/applications/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationIds: selected }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setCards(previousCards);
      setSyncError(data?.sheetResult?.reason || "Delete sync failed.");
      return;
    }
    setSelected([]);
  }

  return (
    <section className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950">Round Pipeline</h2>
          <p className="text-sm text-slate-500">
            Select multiple students, then drag one selected card to move the group.
          </p>
        </div>
        {readOnly ? (
          <p className="rounded-[8px] bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600">
            Stakeholder read-only view
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => requestMove(selected, "SELECTED")}
            disabled={selected.length === 0}
            className="h-10 rounded-[8px] bg-emerald-600 px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Move selected to Selected
          </button>
          <button
            type="button"
            onClick={() => requestMove(selected, "REJECTED")}
            disabled={selected.length === 0}
            className="h-10 rounded-[8px] bg-rose-600 px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Reject selected
          </button>
          <button
            type="button"
            onClick={deleteSelected}
            disabled={selected.length === 0}
            className="h-10 rounded-[8px] border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            Delete selected
          </button>
          </div>
        )}
      </div>

      {syncError ? (
        <p className="mb-4 rounded-[8px] bg-rose-50 p-3 text-sm font-semibold text-rose-700">
          {syncError}
        </p>
      ) : null}

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="thin-scrollbar grid auto-cols-[minmax(260px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">
          {PIPELINE_STAGES.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage.id}
              cards={cards.filter((card) => card.currentStage === stage.id)}
              studentMap={studentMap}
              selected={selected}
              syncingIds={syncingIds}
              toggleSelection={toggleSelection}
              readOnly={readOnly}
            />
          ))}
        </div>
      </DndContext>

      {pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-[8px] bg-white p-5 shadow-xl">
            <h3 className="text-xl font-black text-slate-950">
              {pending.targetStage === "SELECTED"
                ? "Selection remarks"
                : pending.targetStage === "REJECTED"
                  ? "Rejection remarks"
                  : "Dropped reason"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Remarks are saved to the Applications sheet for RSA analysis.
            </p>
            {pending.targetStage !== "SELECTED" ? (
              <label className="mt-4 block text-sm font-bold text-slate-700">
                Round
                <select
                  value={rejectedAtRound}
                  onChange={(event) =>
                    setRejectedAtRound(event.target.value as PipelineStageId)
                  }
                  className="mt-2 h-11 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm"
                >
                  {PIPELINE_STAGES.filter(
                    (stage) => !["SELECTED", "REJECTED"].includes(stage.id),
                  ).map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="mt-4 block text-sm font-bold text-slate-700">
              Remarks
              <textarea
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                rows={4}
                className="mt-2 w-full resize-none rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-3 text-sm"
                placeholder={
                  pending.targetStage === "SELECTED"
                    ? "Example: Strong React fundamentals and clear project explanation"
                    : "Example: Weak in backend Django basics"
                }
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPending(null)}
                className="h-10 rounded-[8px] border border-slate-200 px-4 text-sm font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitTerminalMove}
                disabled={!remarks.trim()}
                className="h-10 rounded-[8px] bg-indigo-600 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Save and Sync
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function StageColumn({
  stage,
  cards,
  studentMap,
  selected,
  syncingIds,
  toggleSelection,
  readOnly,
}: {
  stage: PipelineStageId;
  cards: Application[];
  studentMap: Map<string, Student>;
  selected: string[];
  syncingIds: string[];
  toggleSelection: (id: string) => void;
  readOnly: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const tone = stageTone(stage);

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "min-h-[520px] rounded-[8px] border bg-slate-50 p-3 transition",
        isOver ? "border-indigo-500 bg-indigo-50" : "border-slate-200",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-black uppercase text-slate-700">{stageLabel(stage)}</h3>
        <span
          className={clsx(
            "rounded-full px-2.5 py-1 text-xs font-black",
            tone === "selected" && "bg-emerald-100 text-emerald-700",
            tone === "rejected" && "bg-rose-100 text-rose-700",
            tone === "dropped" && "bg-amber-100 text-amber-700",
            tone === "technical" && "bg-cyan-100 text-cyan-700",
            tone === "assessment" && "bg-violet-100 text-violet-700",
            tone === "progress" && "bg-indigo-100 text-indigo-700",
          )}
        >
          {cards.length}
        </span>
      </div>
      <div className="space-y-3">
        {cards.map((card) => (
          <StudentPipelineCard
            key={card.id}
            application={card}
            student={studentMap.get(card.studentId)}
            checked={selected.includes(card.id)}
            syncing={syncingIds.includes(card.id)}
            onToggle={() => toggleSelection(card.id)}
            readOnly={readOnly}
          />
        ))}
        {cards.length === 0 ? (
          <div className="flex min-h-24 flex-col items-center justify-center rounded-[8px] border border-dashed border-slate-300 bg-white text-center text-sm text-slate-400">
            <Users className="mb-2 h-5 w-5" aria-hidden="true" />
            Drop students here
          </div>
        ) : null}
      </div>
    </div>
  );
}

const StudentPipelineCard = memo(function StudentPipelineCard({
  application,
  student,
  checked,
  syncing,
  onToggle,
  readOnly,
}: {
  application: Application;
  student?: Student;
  checked: boolean;
  syncing: boolean;
  onToggle: () => void;
  readOnly: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: application.id,
    disabled: readOnly,
  });
  const pipelineStatus = statusForStage(application.currentStage);

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={clsx(
        "rounded-[8px] border border-slate-200 bg-white p-3 shadow-sm",
        isDragging && "z-40 opacity-80 shadow-lg",
        checked && "border-indigo-500 ring-2 ring-indigo-100",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            disabled={readOnly}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
          />
          <span>
            <span className="block text-sm font-black text-slate-950">
              {student?.name ?? "Unknown"}
            </span>
          </span>
        </label>
        <button
          type="button"
          className="rounded-[8px] p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-wait disabled:opacity-50"
          title="Drag student"
          disabled={syncing || readOnly}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 space-y-2 text-xs text-slate-600">
        <p className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{student?.email || "Email pending"}</span>
        </p>
        <p className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{student?.phone || "Phone pending"}</span>
        </p>
        {student?.resumeUrl ? (
          <a
            href={student.resumeUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 font-bold text-indigo-600"
          >
            <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Resume
          </a>
        ) : (
          <p className="flex items-center gap-2 text-slate-400">
            <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Resume pending
          </p>
        )}
        <p className="font-bold text-slate-700">
          Status: {syncing ? "Syncing..." : pipelineStatus}
        </p>
      </div>
      {application.remarks ? (
        <p className="mt-3 line-clamp-2 text-xs text-slate-600">{application.remarks}</p>
      ) : null}
      {application.selectedAt ? (
        <p className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
          <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {application.selectedAt}
        </p>
      ) : null}
    </article>
  );
});

function statusForStage(stage: PipelineStageId) {
  if (stage === "SELECTED") return "Selected";
  if (stage === "REJECTED") return "Rejected";
  if (stage === "DROPPED") return "Dropped";
  return "In Progress";
}

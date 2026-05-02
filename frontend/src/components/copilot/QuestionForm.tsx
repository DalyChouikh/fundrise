import { useState } from "react";
import { ChevronLeft, ChevronRight, Check, Edit2 } from "lucide-react";
import type { QuestionDef, QuestionForm as QuestionFormType } from "@/types";

interface QuestionFormProps {
  form: QuestionFormType;
  onSubmit: (toolCallId: string, answers: Record<string, unknown>) => void;
  disabled?: boolean;
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: QuestionDef;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  if (question.type === "radio") {
    return (
      <div className="space-y-2">
        {(question.options ?? []).map((opt) => (
          <label key={opt} className="flex items-center gap-2.5 cursor-pointer group">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${value === opt ? "border-brand-accent bg-brand-accent" : "border-brand-border group-hover:border-brand-accent/60"}`}>
              {value === opt && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <input type="radio" className="sr-only" checked={value === opt} onChange={() => onChange(opt)} />
            <span className="text-sm text-brand-text">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "checkbox") {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="space-y-2">
        {(question.options ?? []).map((opt) => {
          const checked = selected.includes(opt);
          return (
            <label key={opt} className="flex items-center gap-2.5 cursor-pointer group">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${checked ? "border-brand-accent bg-brand-accent" : "border-brand-border group-hover:border-brand-accent/60"}`}>
                {checked && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => onChange(checked ? selected.filter((s) => s !== opt) : [...selected, opt])}
              />
              <span className="text-sm text-brand-text">{opt}</span>
            </label>
          );
        })}
      </div>
    );
  }

  if (question.type === "textarea") {
    return (
      <textarea
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder ?? ""}
        rows={3}
        className="w-full rounded-xl border border-brand-border/40 bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-1 focus:ring-brand-accent resize-none"
      />
    );
  }

  return (
    <input
      type="text"
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={question.placeholder ?? ""}
      className="w-full rounded-xl border border-brand-border/40 bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-1 focus:ring-brand-accent"
    />
  );
}

function formatAnswer(_q: QuestionDef, value: unknown): string {
  if (Array.isArray(value)) return (value as string[]).join(", ") || "—";
  return (value as string) || "—";
}

export function QuestionForm({ form, onSubmit, disabled }: QuestionFormProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);

  const isReview = step === form.questions.length;
  const currentQuestion = form.questions[step];

  const canAdvance = isReview
    ? true
    : !currentQuestion.required ||
      (Array.isArray(answers[currentQuestion.id])
        ? (answers[currentQuestion.id] as unknown[]).length > 0
        : !!(answers[currentQuestion.id] as string));

  const handleSubmit = () => {
    if (submitted) return;
    setSubmitted(true);
    onSubmit(form.tool_call_id, answers);
  };

  if (submitted) {
    return (
      <div className="rounded-2xl rounded-tl-sm bg-white border border-brand-border/20 shadow-sm p-3 text-sm">
        <p className="font-medium text-brand-text mb-2">{form.title}</p>
        <div className="space-y-1">
          {form.questions.map((q) => (
            <div key={q.id} className="flex gap-2">
              <span className="text-brand-muted shrink-0">{q.label}:</span>
              <span className="text-brand-text">{formatAnswer(q, answers[q.id])}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl rounded-tl-sm bg-white border border-brand-border/20 shadow-sm p-3 w-full">
      <p className="text-xs text-brand-muted mb-3">{form.title}</p>

      {isReview ? (
        <div className="space-y-2 mb-4">
          <p className="text-sm font-medium text-brand-text mb-2">Review your answers</p>
          {form.questions.map((q, i) => (
            <div key={q.id} className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-brand-muted">{q.label}</p>
                <p className="text-sm text-brand-text">{formatAnswer(q, answers[q.id])}</p>
              </div>
              <button onClick={() => setStep(i)} className="text-brand-muted hover:text-brand-accent shrink-0">
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-4">
          <p className="text-sm font-medium text-brand-text mb-2">{currentQuestion.label}</p>
          <QuestionInput
            question={currentQuestion}
            value={answers[currentQuestion.id]}
            onChange={(val) => setAnswers((a) => ({ ...a, [currentQuestion.id]: val }))}
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="flex items-center gap-1 text-xs text-brand-muted hover:text-brand-text disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back
        </button>
        <span className="text-xs text-brand-muted">
          {isReview ? "Review" : `${step + 1} / ${form.questions.length}`}
        </span>
        {isReview ? (
          <button
            onClick={handleSubmit}
            disabled={disabled}
            className="flex items-center gap-1 text-xs font-medium bg-brand-accent text-white px-3 py-1.5 rounded-lg hover:bg-brand-accent/90 disabled:opacity-50 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Submit
          </button>
        ) : (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance}
            className="flex items-center gap-1 text-xs font-medium text-brand-accent hover:text-brand-accent/80 disabled:opacity-30 transition-colors"
          >
            {step === form.questions.length - 1 ? "Review" : "Next"}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

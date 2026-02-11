/**
 * Dev-only structured logging utility for KodKod form agent pipeline.
 * All functions are gated by `import.meta.env.DEV` and tree-shaken in production.
 */

const _isDev = import.meta.env.DEV;

export type Stage =
  | 'SCRAPE'
  | 'HEURISTIC'
  | 'CLASSIFY'
  | 'AI_CALL'
  | 'FILL_REGULAR'
  | 'FILL_CUSTOM'
  | 'FILL_DEBUGGER'
  | 'FILL_MAIN'
  | 'CAPTURE'
  | 'LEARN'
  | 'MATCH'
  | 'DETECT'
  | 'GAP';

const STAGE_COLORS: Record<Stage, string> = {
  SCRAPE: '#22d3ee',       // cyan
  HEURISTIC: '#a78bfa',    // violet
  CLASSIFY: '#f59e0b',     // amber
  AI_CALL: '#6366f1',      // indigo
  FILL_REGULAR: '#10b981', // emerald
  FILL_CUSTOM: '#14b8a6',  // teal
  FILL_DEBUGGER: '#f97316',// orange
  FILL_MAIN: '#8b5cf6',    // purple
  CAPTURE: '#ec4899',      // pink
  LEARN: '#3b82f6',        // blue
  MATCH: '#eab308',        // yellow
  DETECT: '#64748b',       // slate
  GAP: '#ef4444',           // red
};

function prefix(stage: Stage): [string, string, string] {
  const color = STAGE_COLORS[stage];
  return [
    `%c[KodKod:${stage}]%c `,
    `color:${color};font-weight:bold`,
    'color:inherit',
  ];
}

export function devLog(stage: Stage, message: string, data?: unknown): void {
  if (!_isDev) return;
  const [fmt, c1, c2] = prefix(stage);
  if (data !== undefined) {
    console.log(fmt + message, c1, c2, data);
  } else {
    console.log(fmt + message, c1, c2);
  }
}

export function devWarn(stage: Stage, message: string, data?: unknown): void {
  if (!_isDev) return;
  const [fmt, c1, c2] = prefix(stage);
  if (data !== undefined) {
    console.warn(fmt + message, c1, c2, data);
  } else {
    console.warn(fmt + message, c1, c2);
  }
}

export function devError(stage: Stage, message: string, data?: unknown): void {
  if (!_isDev) return;
  const [fmt, c1, c2] = prefix(stage);
  if (data !== undefined) {
    console.error(fmt + message, c1, c2, data);
  } else {
    console.error(fmt + message, c1, c2);
  }
}

export function devGroup(stage: Stage, label: string): void {
  if (!_isDev) return;
  const [fmt, c1, c2] = prefix(stage);
  console.groupCollapsed(fmt + label, c1, c2);
}

export function devGroupEnd(): void {
  if (!_isDev) return;
  console.groupEnd();
}

export function devTable(data: unknown): void {
  if (!_isDev) return;
  console.table(data);
}

// Timing utilities using performance.now()
const _timers = new Map<string, number>();

export function devTimeStart(label: string): void {
  if (!_isDev) return;
  _timers.set(label, performance.now());
}

export function devTimeEnd(stage: Stage, label: string): void {
  if (!_isDev) return;
  const start = _timers.get(label);
  if (start === undefined) return;
  _timers.delete(label);
  const ms = (performance.now() - start).toFixed(1);
  console.log(
    `%c[KodKod:${stage}]%c ${label} %c${ms}ms`,
    `color:${STAGE_COLORS[stage]};font-weight:bold`,
    'color:inherit',
    'color:#22c55e;font-weight:bold',
  );
}

// Per-field fill result logging
export interface FieldFillLog {
  fieldId: string;
  label: string;
  type: string;
  value: string;
  success: boolean;
  method?: string;
  retried?: boolean;
}

export function devFieldSummary(stage: Stage, logs: FieldFillLog[]): void {
  if (!_isDev) return;
  const [fmt, c1, c2] = prefix(stage);
  const filled = logs.filter(l => l.success).length;
  const failed = logs.filter(l => !l.success).length;
  console.log(fmt + `Field summary: ${filled} filled, ${failed} failed`, c1, c2);
  console.table(
    logs.map(l => ({
      fieldId: l.fieldId,
      label: l.label.slice(0, 40),
      type: l.type,
      value: l.value.slice(0, 30),
      success: l.success ? 'Y' : 'N',
      method: l.method || '-',
      retried: l.retried ? 'Y' : '-',
    }))
  );
}

// Gap Report — shows which fields were resolved by which source,
// and highlights unresolved fields as candidates for global knowledge entries.
export type FieldSource = 'heuristic' | 'memory' | 'global' | 'ai' | 'none';

export interface FieldGapEntry {
  fieldId: string;
  label: string;
  type: string;
  source: FieldSource;
  options?: { value: string; text: string }[];
  platform?: string;
}

export function devGapReport(fields: FieldGapEntry[], platform?: string): void {
  if (!_isDev) return;

  const counts: Record<FieldSource, number> = { heuristic: 0, memory: 0, global: 0, ai: 0, none: 0 };
  for (const f of fields) {
    counts[f.source]++;
  }

  const [fmt, c1, c2] = prefix('GAP');
  console.log(
    fmt + `Gap Report: ${fields.length} fields — heuristic:${counts.heuristic} memory:${counts.memory} global:${counts.global} ai:${counts.ai} NONE:${counts.none}` +
    (platform ? ` [${platform}]` : ''),
    c1, c2,
  );

  // Full table of all fields with sources
  console.table(
    fields.map(f => ({
      fieldId: f.fieldId,
      label: f.label.slice(0, 50),
      type: f.type,
      source: f.source,
    }))
  );

  // Collapsed group for unresolved fields (candidates for new global knowledge)
  const unresolved = fields.filter(f => f.source === 'none');
  if (unresolved.length > 0) {
    console.groupCollapsed(
      `%c[KodKod:GAP]%c ${unresolved.length} UNRESOLVED fields — candidates for global knowledge`,
      `color:#ef4444;font-weight:bold`,
      'color:inherit',
    );
    for (const f of unresolved) {
      console.log({
        fieldId: f.fieldId,
        label: f.label,
        type: f.type,
        platform: f.platform || platform || 'unknown',
        options: f.options?.map(o => o.text),
      });
    }
    console.groupEnd();
  }
}

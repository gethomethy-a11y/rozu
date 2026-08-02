/* Runtime validation of the model's routine before it reaches the UI.
 *
 * The request uses structured outputs, so the response should already match
 * the schema — but structured outputs cannot express "non-empty array", and a
 * truncated response (max_tokens) can still yield well-formed-but-incomplete
 * JSON. Anything that fails here falls back, so the user always gets a
 * complete routine rather than a half-rendered one. */
import type { Routine, Step } from './types';

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isStep(v: unknown): v is Step {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return isNonEmptyString(s.title) && isNonEmptyString(s.desc) && isNonEmptyString(s.heritage_detail);
}

function isStepArray(v: unknown): v is Step[] {
  return Array.isArray(v) && v.length > 0 && v.every(isStep);
}

/**
 * Returns the routine only if every field the UI reads is present and usable.
 * `morning` and `evening` must be non-empty arrays of objects whose `title`,
 * `desc` and `heritage_detail` are all strings.
 */
export function validateRoutine(v: unknown): Routine | null {
  if (typeof v !== 'object' || v === null) return null;
  const r = v as Record<string, unknown>;

  if (!isStepArray(r.morning)) return null;
  if (!isStepArray(r.evening)) return null;
  if (!isNonEmptyString(r.heritage_insight)) return null;
  if (!isNonEmptyString(r.spf)) return null;
  if (!isNonEmptyString(r.key_ingredient)) return null;

  // avoid[] and lifestyle[] render as lists; empty is survivable, malformed is not.
  if (!Array.isArray(r.avoid) || !r.avoid.every(isNonEmptyString)) return null;
  if (
    !Array.isArray(r.lifestyle) ||
    !r.lifestyle.every(
      (l) => typeof l === 'object' && l !== null && isNonEmptyString((l as Record<string, unknown>).text),
    )
  ) {
    return null;
  }

  return {
    heritage_insight: r.heritage_insight,
    spf: r.spf,
    key_ingredient: r.key_ingredient,
    morning: r.morning,
    evening: r.evening,
    avoid: r.avoid as string[],
    lifestyle: r.lifestyle as { text: string }[],
  };
}

/** JSON Schema handed to the model via output_config.format. */
const stepSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    desc: { type: 'string' },
    heritage_detail: { type: 'string' },
  },
  required: ['title', 'desc', 'heritage_detail'],
  additionalProperties: false,
} as const;

export const ROUTINE_SCHEMA = {
  type: 'object',
  properties: {
    heritage_insight: { type: 'string' },
    spf: { type: 'string' },
    key_ingredient: { type: 'string' },
    morning: { type: 'array', items: stepSchema },
    evening: { type: 'array', items: stepSchema },
    avoid: { type: 'array', items: { type: 'string' } },
    lifestyle: {
      type: 'array',
      items: {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text'],
        additionalProperties: false,
      },
    },
  },
  required: ['heritage_insight', 'spf', 'key_ingredient', 'morning', 'evening', 'avoid', 'lifestyle'],
  additionalProperties: false,
} as const;

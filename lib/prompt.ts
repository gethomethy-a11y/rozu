/* The prompt handed to the model.
 *
 * Originally ported unchanged from rozu-v7.html, where it was given only
 * heritage, skin type and the three lifestyle answers. Four of the seven quiz
 * questions — skin tone, concerns, gender and current routine level — were
 * collected, shown to the customer, and then silently discarded.
 *
 * Concerns are the worst of those to lose: someone who selects "Puffiness" and
 * "Fine lines" is telling you exactly what they are paying to solve, and the
 * routine that came back talked about whatever the heritage implied instead.
 * They are now the part of the prompt with a hard requirement attached.
 */
import { CONCERN_LABELS, GENDER_LABELS, LEVEL_LABELS, TONE_LABELS } from './quiz';
import type { Profile } from './order';

const SLEEP = ['Before midnight 7-8h', 'Midnight-1am', 'After 1am or irregular', 'Less than 6h'];
const STRESS = ['Low', 'Moderate', 'High'];
const DIET = ['Balanced', 'High dairy/sugar', 'Plant-based', 'No pattern'];

const label = (i: number | null | undefined, table: readonly string[]): string =>
  i === null || i === undefined ? '' : (table[i] ?? '');

export function buildPrompt(p: Profile): string {
  const concerns = (p.concerns ?? []).map((i) => CONCERN_LABELS[i]).filter(Boolean);
  const tone = label(p.tone, TONE_LABELS);
  const gender = label(p.gender, GENDER_LABELS);
  const level = label(p.level, LEVEL_LABELS);

  // Unanswered questions are left out entirely rather than sent as blanks.
  const facts = [
    'You are a skincare expert. Build a personalised routine.',
    `Heritage: ${p.heritage}, Skin type: ${p.skin}`,
    tone && `Skin tone: ${tone}`,
    concerns.length && `Concerns they chose: ${concerns.join(', ')}`,
    gender && `Identifies as: ${gender}`,
    level && `Current routine level: ${level}`,
    `Sleep: ${SLEEP[p.life.sleep || 0]}, Stress: ${STRESS[p.life.stress || 0]}, Diet: ${DIET[p.life.diet || 0]}`,
  ].filter(Boolean) as string[];

  const lines: string[] = [...facts, ''];

  /* The requirement, stated as a checkable rule rather than a hope. Without it
     the model reliably drifts back to whatever the heritage suggests — melanin
     and sebum — and never mentions the puffiness the customer actually asked
     about. */
  if (concerns.length) {
    lines.push(
      `EVERY concern listed above must be addressed by name in at least one step's ` +
        `heritage_detail, or in the avoid list, or in a lifestyle tip. Do not leave any ` +
        `of them unmentioned. Where a concern and the heritage interact, say how.`,
      '',
    );
  }
  if (level) {
    lines.push(`Match the number of steps to their current level — do not hand a beginner nine products.`, '');
  }

  lines.push(
    'Return ONLY valid JSON, no markdown:',
    '{"heritage_insight":"1 short sentence","spf":"SPF 30 or SPF 50+","key_ingredient":"name",' +
      '"morning":[{"title":"short step name","desc":"why, max 8 words","heritage_detail":"1-2 sentences on why for this heritage and their concerns"}],' +
      '"evening":[{"title":"step","desc":"why","heritage_detail":"heritage and concern context"}],' +
      '"avoid":["item1","item2","item3"],"lifestyle":[{"text":"1 personalised tip"}]}',
    '3-4 morning steps, 3 evening steps. Keep titles under 4 words.',
  );

  return lines.join('\n');
}

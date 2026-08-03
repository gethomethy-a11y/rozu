/* ══════════════════════════════════════
   DATA — QS, HO, SO and the static landing content.
   Ported unchanged from rozu-v7.html.
   ══════════════════════════════════════ */
import { IC, box } from './icons';

export type Mode = 'solo' | 'couple' | 'gift';
export type Filling = 'self' | 'partner';

/** `ans` — question id → selected index, except `concerns` which holds indices. */
export type Answers = Record<string, number | number[] | undefined>;
export type Life = { sleep: number | null; stress: number | null; diet: number | null };

export const emptyLife = (): Life => ({ sleep: null, stress: null, diet: null });

export type QOption = { ic?: string; sw?: string; lb: string; sb?: string };
export type Question = {
  id: string;
  lb: string;
  ti: string;
  sb?: string;
  type: 'single' | 'grid' | 'multi' | 'lifestyle';
  opts?: QOption[];
};

export const HO = ['East Asian', 'Southeast Asian', 'South Asian', 'Middle Eastern / N. African', 'Black / African', 'Latin / Hispanic', 'Northern European', 'Southern European', 'Mixed heritage'];
export const SO = ['Dry', 'Oily', 'Combination', 'Normal', 'Sensitive'];

export const QS: Question[] = [
  {
    id: 'gender', lb: 'About you', ti: 'How do you identify?', type: 'single',
    opts: [
      { ic: box(38, 12, '#7a1d4a12', IC.woman(19)), lb: 'Woman' },
      { ic: box(38, 12, '#7a1d4a12', IC.man(19)), lb: 'Man' },
      { ic: box(38, 12, '#7a1d4a12', IC.nonbinary(19)), lb: 'Non-binary / Other' },
    ],
  },
  {
    id: 'heritage', lb: 'Your heritage', ti: 'Where is your family from?',
    sb: 'This shapes everything about your skin.', type: 'single',
    opts: HO.map(function (l) { return { ic: box(38, 12, '#7a1d4a12', IC.globe(19)), lb: l }; }),
  },
  {
    id: 'skintone', lb: 'Skin tone', ti: 'Your skin tone?', type: 'grid',
    opts: [
      { sw: '#f7d7c2', lb: 'Fair', sb: 'Cool / pink' },
      { sw: '#f0c19c', lb: 'Light', sb: 'Warm / golden' },
      { sw: '#d69868', lb: 'Medium', sb: 'Neutral' },
      { sw: '#b5723e', lb: 'Tan', sb: 'Warm' },
      { sw: '#7d4a1e', lb: 'Deep', sb: 'Rich' },
      { sw: '#3d2210', lb: 'Very deep', sb: 'Deep' },
    ],
  },
  {
    id: 'skintype', lb: 'Skin type', ti: 'How does your skin feel?', type: 'single',
    opts: [
      { ic: box(38, 12, '#e6f0fa', IC.drySkin(20)), lb: 'Dry', sb: 'Tight, sometimes flaky' },
      { ic: box(38, 12, '#fdf3e0', IC.oilySkin(20)), lb: 'Oily', sb: 'Shiny, enlarged pores' },
      { ic: box(38, 12, '#f0f4fa', IC.comboSkin(20)), lb: 'Combination', sb: 'Oily T-zone, dry cheeks' },
      { ic: box(38, 12, '#e8f7ee', IC.normalSkin(20)), lb: 'Normal', sb: 'Balanced, rarely reacts' },
      { ic: box(38, 12, '#fdeef1', IC.sensitiveSkin(20)), lb: 'Sensitive', sb: 'Reacts easily, redness' },
    ],
  },
  {
    id: 'concerns', lb: 'Concerns', ti: 'What bothers your skin?',
    sb: 'Select all that apply.', type: 'multi',
    opts: [
      { ic: box(38, 12, '#fff', IC.acne(30)), lb: 'Acne & breakouts' },
      { ic: box(38, 12, '#fff', IC.darkspot(30)), lb: 'Dark spots' },
      { ic: box(38, 12, '#fff', IC.redness(30)), lb: 'Redness & sensitivity' },
      { ic: box(38, 12, '#fff', IC.dryness(30)), lb: 'Dryness' },
      { ic: box(38, 12, '#fff', IC.puffiness(30)), lb: 'Puffiness' },
      { ic: box(38, 12, '#fff', IC.dullness(30)), lb: 'Dullness / no glow' },
      { ic: box(38, 12, '#fff', IC.aging(30)), lb: 'Fine lines' },
      { ic: box(38, 12, '#fff', IC.bodyacne(30)), lb: 'Body acne' },
    ],
  },
  { id: 'lifestyle', lb: 'Lifestyle', ti: 'Your daily life.', sb: 'Your routine should fit your life.', type: 'lifestyle' },
  {
    id: 'routine', lb: 'Current routine', ti: 'Your skincare right now?', type: 'single',
    opts: [
      { ic: box(38, 12, '#f4f1f3', IC.levelNone(20)), lb: 'Nothing', sb: 'Just water' },
      { ic: box(38, 12, '#e6f0fa', IC.levelBasic(20)), lb: 'Basic', sb: 'Cleanser + moisturiser' },
      { ic: box(38, 12, '#e8f7ee', IC.levelMod(20)), lb: 'Moderate', sb: 'Serum + SPF + more' },
      { ic: box(38, 12, '#f7eef3', IC.levelAdv(20)), lb: 'Advanced', sb: 'Many products, actives' },
    ],
  },
];

export const HERITAGE_ROWS = [
  { t: 'Southeast Asian', d: 'PIH risk · sebum-active · dehydrated under oil', tag: 'Niacinamide + SPF 30', bg: '#fdf3e0', ic: IC.oilySkin(19) },
  { t: 'Northern European', d: 'Thin barrier · UV sensitivity · redness-prone', tag: 'Ceramides + SPF 50+', bg: '#e6f0fa', ic: IC.drySkin(19) },
  { t: 'Black / African', d: 'High melanin · hyperpigmentation persists', tag: 'Vitamin C + targeted actives', bg: '#f5e6d5', ic: IC.darkspot(28) },
  { t: 'South Asian', d: 'Uneven tone · preservative sensitivity', tag: 'Gentle actives + consistency', bg: '#f7ecf2', ic: IC.aging(28) },
];

export const FAQS = [
  { q: 'Why does heritage change my skincare?', a: 'Melanin levels, barrier thickness, and sebum patterns differ by heritage. Higher melanin means natural UV protection but <b>higher dark spot risk after a breakout</b>. Thinner barriers mean more redness. These differences change what every product does on your skin.' },
  { q: "Isn't SPF 50 always better?", a: 'Not for everyone. Melanin provides natural SPF 4–13. For oilier East Asian or Black skin, SPF 50 causes buildup that congests pores — SPF 30 is ideal daily. Northern European skin is the exception, where SPF 50+ is genuinely necessary.' },
  { q: 'How does diet affect my skin?', a: '<b>High-dairy diets are linked to sebum overproduction in East Asian skin.</b> Cortisol worsens dark spots in darker skin and redness in lighter skin. RŌZU maps these connections from your actual lifestyle answers.' },
  { q: 'How does couple mode work?', a: 'Both of you fill in the quiz separately. RŌZU builds individual protocols for each heritage, then shows what you can share — same habits, different products — plus a compatibility score.' },
];

export const WHO: { m: Mode; ic: string; t: string; s: string; p: string }[] = [
  { m: 'solo', ic: IC.heart(22), t: 'Just me', s: 'My personal heritage glow plan', p: '$9' },
  { m: 'couple', ic: IC.hearts(23), t: 'Me + my partner', s: 'Two heritages, one shared routine', p: '$12' },
  { m: 'gift', ic: IC.gift(22), t: 'A gift for them', s: 'Build it for someone, send them the plan', p: '$9' },
];

export const SLEEP_OPTS = ['Before midnight, 7–8h', 'Midnight–1am', 'After 1am or irregular', 'Less than 6h'];
export const STRESS_OPTS = ['Low — mostly relaxed', 'Moderate', 'High — often stressed'];
export const DIET_OPTS = ['Balanced, mostly whole foods', 'A lot of dairy or sugar', 'Mostly plant-based', 'No real pattern'];

export function heritageOf(a: Answers): string { return HO[a.heritage as number] || 'Southeast Asian'; }
export function skinOf(a: Answers): string { return SO[a.skintype as number] || 'Combination'; }

/* The answer labels, read back off QS rather than retyped, so a wording change
   in the quiz cannot silently drift from what the model is told. */
const optLabels = (id: string): string[] => (QS.find((q) => q.id === id)?.opts ?? []).map((o) => o.lb);

export const GENDER_LABELS = optLabels('gender');
export const TONE_LABELS = optLabels('skintone');
export const CONCERN_LABELS = optLabels('concerns');
export const LEVEL_LABELS = optLabels('routine');

const oneOf = (a: Answers, id: string): number | null => (typeof a[id] === 'number' ? (a[id] as number) : null);

/** Indices, not labels: the server maps them itself, so nothing a browser
 *  types can ever reach the model prompt. */
export function concernsOf(a: Answers): number[] {
  return Array.isArray(a.concerns) ? (a.concerns as number[]) : [];
}
export const toneOf = (a: Answers) => oneOf(a, 'skintone');
export const genderOf = (a: Answers) => oneOf(a, 'gender');
export const levelOf = (a: Answers) => oneOf(a, 'routine');

export function canGo(q: Question, ca: Answers, cl: Life): boolean {
  if (q.type === 'multi') { const v = ca[q.id]; return Array.isArray(v) && v.length > 0; }
  if (q.type === 'lifestyle') return cl.sleep !== null && cl.stress !== null && cl.diet !== null;
  return ca[q.id] !== undefined;
}

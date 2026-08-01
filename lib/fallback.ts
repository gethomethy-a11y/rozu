/* ══════════════════════════════════════
   FALLBACK ROUTINE GENERATOR
   Ported unchanged from rozu-v7.html. Deterministic, no network. This is what
   the user gets whenever the model call fails, times out, or returns
   unparseable JSON — never an error screen.
   ══════════════════════════════════════ */
import type { Life } from './quiz';
import type { Routine } from './types';

export function fallback(h: string, s: string, cl: Life): Routine {
  const isSE = h.indexOf('Southeast') > -1 || h.indexOf('East Asian') > -1;
  const isEuro = h.indexOf('European') > -1;
  const isOily = s === 'Oily' || s === 'Combination';

  return {
    heritage_insight: h + ' skin has distinct melanin levels, barrier strength, and sebum patterns that need a tailored approach.',
    spf: isEuro ? 'SPF 50+' : 'SPF 30',
    key_ingredient: isSE ? 'Niacinamide 5–10%' : isEuro ? 'Ceramides' : 'Vitamin C',
    morning: [
      {
        title: isOily ? 'Gel cleanser' : 'Cream cleanser',
        desc: isOily ? 'Gentle, no sulfates' : 'Protects your barrier',
        heritage_detail: h + ' skin benefits from pH-balanced cleansers. Harsh sulfates disrupt the acid mantle and trigger either compensatory oil production or sensitivity.',
      },
      {
        title: isSE ? 'Niacinamide serum' : 'Ceramide serum',
        desc: isSE ? 'Prevents dark spots' : 'Strengthens barrier',
        heritage_detail: isSE
          ? 'Post-inflammatory hyperpigmentation is the top skin risk for your heritage. Consistent niacinamide stops dark spots forming after a breakout.'
          : 'Northern European skin has a thinner stratum corneum. Ceramides are essential to prevent moisture loss and reactive redness.',
      },
      {
        title: isOily ? 'Gel moisturiser' : 'Ceramide cream',
        desc: 'Hydration for your type',
        heritage_detail: h + ' skin ' + (isOily
          ? 'overproduces sebum when dehydrated — water-based hydration breaks that cycle. Heavy creams congest your skin type.'
          : 'has naturally lower lipid levels and needs richer emollients to hold barrier function through the day.'),
      },
      {
        title: isEuro ? 'SPF 50+' : 'SPF 30',
        desc: 'Matched to your melanin',
        heritage_detail: isEuro
          ? 'Fair skin has minimal melanin protection. UV is the single biggest driver of premature ageing and pigmentation for your heritage.'
          : 'Your melanin provides natural SPF 4–13. SPF 30 gives ideal daily protection without the product buildup that congests oilier skin.',
      },
    ],
    evening: [
      {
        title: isOily ? 'Double cleanse' : 'Gentle cleanser',
        desc: 'Removes the day cleanly',
        heritage_detail: 'Evening cleansing resets ' + h + ' skin for overnight repair. ' + (isOily
          ? 'Double cleansing lifts sunscreen and sebum without stripping the barrier.'
          : 'Minimal friction preserves your sensitive barrier.'),
      },
      {
        title: 'Active treatment',
        desc: isSE ? 'Fades dark spots' : 'Cell turnover',
        heritage_detail: 'Night is the best time for ' + h + ' skin to use actives — no UV interference and the skin is already in repair mode. Use 2–3x per week.',
      },
      {
        title: isOily ? 'Sleeping mask' : 'Night cream',
        desc: 'Locks in overnight repair',
        heritage_detail: h + ' skin does its most active cellular regeneration at night. The right occlusive formula amplifies that process significantly.',
      },
    ],
    avoid: isOily
      ? ['Heavy face oils or thick creams', 'Alcohol-based toners', 'High-sugar and dairy-heavy meals']
      : isEuro
        ? ['Fragrance in skincare', 'Harsh physical exfoliants', 'Skipping SPF on cloudy days']
        : ['Harsh sulfate cleansers', 'Over-exfoliating', 'Inconsistent SPF use'],
    lifestyle: [
      {
        text: (cl.sleep || 0) >= 2
          ? 'Sleep before 1am — late nights spike cortisol, which worsens ' + (isSE ? 'dark spots' : 'redness') + ' for your heritage'
          : "Your sleep pattern supports your skin's overnight repair cycle — keep it consistent",
      },
      {
        text: (cl.diet || 0) === 1
          ? 'Cut back on dairy and sugar — both are directly linked to sebum overproduction'
          : 'Your diet is working with your skin, not against it',
      },
      {
        text: (cl.stress || 0) >= 2
          ? 'High stress raises cortisol, which slows barrier repair — even 5 minutes of breathing helps'
          : 'Drink 2L water daily — dehydration shows on the surface within 48 hours',
      },
    ],
  };
}

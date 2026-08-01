/* buildPrompt — ported unchanged from rozu-v7.html. */
import type { Life } from './quiz';

export function buildPrompt(hh: string, ss: string, ll: Life): string {
  const sleepTxt = ['Before midnight 7-8h', 'Midnight-1am', 'After 1am or irregular', 'Less than 6h'][ll.sleep || 0];
  const stressTxt = ['Low', 'Moderate', 'High'][ll.stress || 0];
  const dietTxt = ['Balanced', 'High dairy/sugar', 'Plant-based', 'No pattern'][ll.diet || 0];
  return 'You are a skincare expert. Build a personalised routine.\n' +
    'Heritage: ' + hh + ', Skin type: ' + ss + '\n' +
    'Sleep: ' + sleepTxt + ', Stress: ' + stressTxt + ', Diet: ' + dietTxt + '\n' +
    'Return ONLY valid JSON, no markdown:\n' +
    '{"heritage_insight":"1 short sentence","spf":"SPF 30 or SPF 50+","key_ingredient":"name",' +
    '"morning":[{"title":"short step name","desc":"why, max 8 words","heritage_detail":"1-2 sentences on why for this heritage"}],' +
    '"evening":[{"title":"step","desc":"why","heritage_detail":"heritage context"}],' +
    '"avoid":["item1","item2","item3"],"lifestyle":[{"text":"1 personalised tip"}]}\n' +
    '3-4 morning steps, 3 evening steps. Keep titles under 4 words.';
}

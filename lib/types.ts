export type Step = {
  title: string;
  desc: string;
  heritage_detail: string;
};

export type Routine = {
  heritage_insight: string;
  spf: string;
  key_ingredient: string;
  morning: Step[];
  evening: Step[];
  avoid: string[];
  lifestyle: { text: string }[];
};

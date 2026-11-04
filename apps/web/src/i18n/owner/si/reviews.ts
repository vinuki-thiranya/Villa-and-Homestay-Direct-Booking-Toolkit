import type { Dict } from '../t';
import type { reviews as en } from '../en/reviews';

export const reviews: Dict<typeof en> = {
  title: 'සමාලෝචන',
  summary_one: 'පොදු සමාලෝචනයක් අනුව ★ {avg}',
  summary_other: 'පොදු සමාලෝචන {n} ක් අනුව ★ {avg}',
  noPublic: 'තවම පොදු සමාලෝචන නැත',
  privateCount: 'පෞද්ගලික {n}',
  how: 'පිටවන දිනයේ අමුත්තන්ගෙන් අසනු ලැබේ; ★4–5 ඔබගේ වෙබ් අඩවියේ පෙන්වා Google වෙත ආරාධනා කරයි, ★1–3 ලැබෙන්නේ ඔබට පමණි.',
  empty: 'තවම සමාලෝචන නැත. පිටවීමේ පණිවිඩයෙන් සෑම සෘජු අමුත්තෙකුගෙන්ම එකක් ඉල්ලයි.',
  public: 'පොදු',
  private: 'පෞද්ගලික',
  noComment: 'අදහසක් නැත.',
  yourReply: 'ඔබගේ පිළිතුර:',
  editReply: 'පිළිතුර සංස්කරණය කරන්න',
  reply: 'පිළිතුරු දෙන්න',
  saveReply: 'පිළිතුර සුරකින්න',
  showOnSite: 'මෙම සමාලෝචනය මගේ වෙබ් අඩවියේ පෙන්වන්න',
};

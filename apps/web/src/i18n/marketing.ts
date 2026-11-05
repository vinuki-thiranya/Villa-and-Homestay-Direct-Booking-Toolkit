/*
 * Marketing site (staydirect.lk) interface text in English and Sinhala. Long-form copy (area pages,
 * blog, FAQ, case study) lives in apps/web/content/marketing/{en,si}/*.md. Sinhala terms follow
 * i18n/owner/GLOSSARY.md; brand names stay in Latin script.
 */
import type { MarketingLang } from '@/lib/site-routing';

const en = {
  brandTag: 'Direct bookings for Sri Lankan villas and homestays',
  nav: { pricing: 'Pricing', areas: 'Areas', blog: 'Blog', faq: 'FAQ', login: 'Owner login', main: 'Main' },
  home: {
    metaTitle: 'Direct booking software for guesthouses in Sri Lanka',
    metaDescription:
      'A Booking.com commission alternative for Sri Lankan villas and homestays: your own booking site, calendar sync with Airbnb and Booking.com, deposits to your own account.',
    pill: 'For villas, guesthouses, homestays and surf camps',
    h1: 'Keep the commission you pay Booking.com.',
    lede: 'Your own booking site, one calendar for every channel, WhatsApp answered. Direct bookings cost you a card fee of about 3%, not an OTA commission.',
    demo: 'See a live guest site',
    start: 'Start free for 3 months',
    featuresTitle: 'Everything a 2–15 room property needs',
    pricingTitle: 'Pricing in rupees',
    pricingIntro: 'Monthly, or a percentage of direct bookings instead. Annual plans: 2 months free. Add-ons: 10% of each one sold.',
    seePricing: 'Compare plans and work out your saving',
    areasTitle: 'Built for these areas',
    blogTitle: 'Guides for owners',
    faqTitle: 'Questions owners ask',
    allFaq: 'All questions',
    caseStudy: 'Example: a season on direct bookings',
  },
  features: {
    site: ['Your own booking site', 'villa-name.staydirect.lk or your own domain, in five languages, fast on a 4G phone in Europe or India.'],
    sync: ['No more double bookings', 'Airbnb, Booking.com, Agoda and Vrbo calendars sync every 15 minutes. Clashes alert you on WhatsApp.'],
    pay: ['Deposits to your own account', 'PayHere cards and wallets, PayPal, LankaQR and bank transfer, paid straight to you.'],
    whatsapp: ['WhatsApp-first', 'Confirmations and directions in the guest’s language. Your guests already live on WhatsApp.'],
    safe: ['Never sells a night twice', 'The database itself refuses a second sale of any night: direct, Airbnb or Booking.com.'],
    report: ['See what you saved', 'Every month: occupancy, revenue by channel and the OTA commission you kept.'],
  },
  plans: {
    perMonth: '/month',
    orPct: 'or {pct}% of direct bookings',
    extra: '+ LKR {fee} per extra property',
    extraManaged: '+ LKR {fee} per managed property',
    popular: 'Most popular',
    basic: ['1 property, up to 5 rooms', 'Booking site', 'Calendar + iCal sync', 'Deposits', 'WhatsApp quick replies', 'Reports'],
    pro: ['1 property, up to 15 rooms', 'Everything in Basic', 'AI concierge', 'Housekeeping board', 'Add-on marketplace', 'Reviews + guest CRM'],
    pro_multi: ['Up to 5 properties', 'Everything in Pro', 'Multi-property calendar', 'Manager accounts', 'Consolidated reports'],
    manager: ['Unlimited properties', 'Everything in Pro Multi', 'Per-owner statements', 'Payout calculation', 'White-label guest sites'],
  },
  pricing: {
    metaTitle: 'Pricing: direct booking software for Sri Lanka',
    metaDescription: 'StayDirect LK plans in rupees: from LKR 5,000 a month, or 2.5% of direct bookings with no monthly fee. Work out what you keep versus OTA commission.',
    h1: 'Simple pricing in rupees',
    lede: 'Start on the percentage plan and pay nothing in a quiet month, or take a flat plan when direct bookings grow.',
    calcTitle: 'What would you keep?',
    calcIntro: 'An estimate with your own numbers. It compares an OTA commission with our percentage plan and a typical card fee; check your real rates.',
    rate: 'Average nightly rate (LKR)',
    nights: 'Direct nights per month',
    commission: 'OTA commission you pay (%)',
    cardFee: 'Card fee (%)',
    otaCost: 'Commission on these nights',
    directCost: 'Direct: card fee + 2.5% plan',
    keep: 'You keep about',
    perMonthShort: 'a month',
    note: 'Illustration only. Card fees depend on your PayHere plan and the guest’s card; bank transfer and LankaQR under LKR 5,000 cost less.',
  },
  areas: {
    metaTitle: 'Direct booking software for guesthouses in {area}',
    breadcrumb: 'Areas',
    season: 'Season',
    region: 'Region',
    others: 'Other areas',
  },
  blog: {
    metaTitle: 'Guides for villa and guesthouse owners in Sri Lanka',
    metaDescription: 'Practical guides on commission, iCal sync, deposits, WhatsApp, Google, SLTDA and pricing for small Sri Lankan villas and homestays.',
    h1: 'Guides for owners',
    lede: 'Practical, sourced and written for 2–15 room properties in Sri Lanka.',
    minutes: '{n} min read',
    related: 'More guides',
    back: 'All guides',
    englishOnly: 'This guide is not translated yet; here is the English version.',
  },
  faq: { metaTitle: 'FAQ: direct booking software for Sri Lankan guesthouses' },
  caseStudy: { banner: 'Example with illustrative numbers. Not a real customer.' },
  cta: { title: 'Try it on your own property', body: 'Three months free. We set it up with you in about an hour.', button: 'Start free' },
  footer: { areas: 'Areas', guides: 'Guides', company: 'StayDirect LK', pricing: 'Pricing', faq: 'FAQ', alternative: 'Booking.com commission alternative', caseStudy: 'Example case study', login: 'Owner login' },
  langLabel: 'Language',
  notFound: { title: 'Page not found', body: 'This page does not exist or has moved.', home: 'Home' },
};

type Shape<T> = { [K in keyof T]: T[K] extends string ? string : T[K] extends string[] ? string[] : Shape<T[K]> };

const si: Shape<typeof en> = {
  brandTag: 'ශ්‍රී ලංකාවේ විලා හා හෝම්ස්ටේ සඳහා සෘජු වෙන්කිරීම්',
  nav: { pricing: 'මිල ගණන්', areas: 'ප්‍රදේශ', blog: 'මාර්ගෝපදේශ', faq: 'ප්‍රශ්න', login: 'හිමිකරු පිවිසුම', main: 'ප්‍රධාන' },
  home: {
    metaTitle: 'ලංකාවේ ආගන්තුක නිවාස සඳහා සෘජු වෙන්කිරීම් මෘදුකාංගය',
    metaDescription:
      'ලංකාවේ විලා හා හෝම්ස්ටේ සඳහා Booking.com කොමිස් මුදලට විකල්පයක්: ඔබේම වෙන්කිරීම් වෙබ් අඩවිය, Airbnb හා Booking.com සමඟ දින දර්ශන සමමුහුර්තය, ඔබේම ගිණුමට තැන්පතු.',
    pill: 'විලා, ආගන්තුක නිවාස, හෝම්ස්ටේ හා සර්ෆ් කඳවුරු සඳහා',
    h1: 'Booking.com වෙත ගෙවන කොමිස් මුදල ඔබ ළඟම තබා ගන්න.',
    lede: 'ඔබේම වෙන්කිරීම් වෙබ් අඩවිය, සියලු නාලිකා සඳහා එක දින දර්ශනයක්, WhatsApp පණිවිඩවලට පිළිතුරු. සෘජු වෙන්කිරීමකට ඔබට වැය වන්නේ OTA කොමිසක් නොව, 3% ක් පමණ කාඩ්පත් ගාස්තුවකි.',
    demo: 'සජීවී අමුත්තන්ගේ වෙබ් අඩවියක් බලන්න',
    start: 'මාස 3 ක් නොමිලේ අරඹන්න',
    featuresTitle: 'කාමර 2–15 ක නවාතැනකට අවශ්‍ය සියල්ල',
    pricingTitle: 'රුපියල්වලින් මිල ගණන්',
    pricingIntro: 'මාසිකව, නැතහොත් ඒ වෙනුවට සෘජු වෙන්කිරීම්වලින් ප්‍රතිශතයක්. වාර්ෂික පැකේජ: මාස 2 ක් නොමිලේ. අමතර සේවා: විකුණන සෑම එකකින්ම 10%.',
    seePricing: 'පැකේජ සසඳා ඔබේ ඉතිරිය ගණනය කරන්න',
    areasTitle: 'මෙම ප්‍රදේශ සඳහා සැකසූ',
    blogTitle: 'හිමිකරුවන් සඳහා මාර්ගෝපදේශ',
    faqTitle: 'හිමිකරුවන් අසන ප්‍රශ්න',
    allFaq: 'සියලු ප්‍රශ්න',
    caseStudy: 'උදාහරණය: සෘජු වෙන්කිරීම් සමඟ එක් වාරයක්',
  },
  features: {
    site: ['ඔබේම වෙන්කිරීම් වෙබ් අඩවිය', 'villa-name.staydirect.lk හෝ ඔබේම domain එක, භාෂා පහකින්, යුරෝපයේ හෝ ඉන්දියාවේ 4G දුරකථනයකත් වේගවත්.'],
    sync: ['තවත් ද්විත්ව වෙන්කිරීම් නැත', 'Airbnb, Booking.com, Agoda හා Vrbo දින දර්ශන සෑම මිනිත්තු 15 කටම සමමුහුර්ත වේ. ගැටුම් ගැන WhatsApp මඟින් දැනුම් දෙයි.'],
    pay: ['තැන්පතු ඔබේම ගිණුමට', 'PayHere කාඩ්පත් හා wallet, PayPal, LankaQR හා බැංකු මාරුව, කෙලින්ම ඔබට.'],
    whatsapp: ['WhatsApp ප්‍රමුඛ', 'තහවුරු කිරීම් හා මාර්ග උපදෙස් අමුත්තාගේ භාෂාවෙන්. ඔබේ අමුත්තන් දැනටමත් WhatsApp භාවිත කරති.'],
    safe: ['කිසිදු රාත්‍රියක් දෙවරක් නොවිකුණයි', 'සෘජු, Airbnb හෝ Booking.com ඕනෑම රාත්‍රියක දෙවන විකිණීම දත්ත සමුදාය විසින්ම ප්‍රතික්ෂේප කරයි.'],
    report: ['ඔබ ඉතිරි කළ දේ බලන්න', 'සෑම මසකම: පිරුම් අනුපාතය, නාලිකා අනුව ආදායම හා ඔබ ඉතිරි කළ OTA කොමිස් මුදල.'],
  },
  plans: {
    perMonth: '/මසකට',
    orPct: 'නැතහොත් සෘජු වෙන්කිරීම්වලින් {pct}%',
    extra: '+ අමතර නවාතැනකට LKR {fee}',
    extraManaged: '+ කළමනාකරණය කරන නවාතැනකට LKR {fee}',
    popular: 'වඩාත් ජනප්‍රිය',
    basic: ['නවාතැන් 1, කාමර 5 දක්වා', 'වෙන්කිරීම් වෙබ් අඩවිය', 'දින දර්ශනය + iCal සමමුහුර්තය', 'තැන්පතු', 'WhatsApp ඉක්මන් පිළිතුරු', 'වාර්තා'],
    pro: ['නවාතැන් 1, කාමර 15 දක්වා', 'Basic හි ඇති සියල්ල', 'AI සහායක', 'පිරිසිදු කිරීමේ පුවරුව', 'අමතර සේවා වෙළඳපොළ', 'සමාලෝචන + අමුත්තන්ගේ CRM'],
    pro_multi: ['නවාතැන් 5 දක්වා', 'Pro හි ඇති සියල්ල', 'නවාතැන් කිහිපයක දින දර්ශනය', 'කළමනාකරු ගිණුම්', 'ඒකාබද්ධ වාර්තා'],
    manager: ['අසීමිත නවාතැන්', 'Pro Multi හි ඇති සියල්ල', 'හිමිකරු අනුව ප්‍රකාශන', 'ගෙවීම් ගණනය', 'ඔබේම සන්නාමයෙන් වෙබ් අඩවි'],
  },
  pricing: {
    metaTitle: 'මිල ගණන්: ලංකාව සඳහා සෘජු වෙන්කිරීම් මෘදුකාංගය',
    metaDescription: 'StayDirect LK පැකේජ රුපියල්වලින්: මසකට LKR 5,000 සිට, නැතහොත් මාසික ගාස්තුවක් නැතිව සෘජු වෙන්කිරීම්වලින් 2.5%. OTA කොමිසට සාපේක්ෂව ඔබට ඉතිරි වන දේ ගණනය කරන්න.',
    h1: 'රුපියල්වලින් සරල මිල ගණන්',
    lede: 'ප්‍රතිශත පැකේජයෙන් අරඹා අඩු කාලයකදී කිසිවක් නොගෙවන්න, නැතහොත් සෘජු වෙන්කිරීම් වැඩි වන විට ස්ථාවර පැකේජයක් ගන්න.',
    calcTitle: 'ඔබට ඉතිරි වන්නේ කීයද?',
    calcIntro: 'ඔබේම අගයන් සමඟ ඇස්තමේන්තුවක්. එය OTA කොමිසක් අපගේ ප්‍රතිශත පැකේජය හා සාමාන්‍ය කාඩ්පත් ගාස්තුවක් සමඟ සසඳයි; ඔබේ සැබෑ අනුපාත පරීක්ෂා කරන්න.',
    rate: 'රාත්‍රියක සාමාන්‍ය මිල (LKR)',
    nights: 'මසකට සෘජු රාත්‍රී ගණන',
    commission: 'ඔබ ගෙවන OTA කොමිස (%)',
    cardFee: 'කාඩ්පත් ගාස්තුව (%)',
    otaCost: 'මෙම රාත්‍රීවලට කොමිස',
    directCost: 'සෘජු: කාඩ්පත් ගාස්තුව + 2.5% පැකේජය',
    keep: 'ඔබට ඉතිරි වන්නේ ආසන්න වශයෙන්',
    perMonthShort: 'මසකට',
    note: 'නිදර්ශනයක් පමණි. කාඩ්පත් ගාස්තු ඔබේ PayHere පැකේජය හා අමුත්තාගේ කාඩ්පත අනුව වෙනස් වේ; බැංකු මාරුව හා LKR 5,000 ට අඩු LankaQR ගෙවීම් අඩු වියදම්.',
  },
  areas: {
    metaTitle: '{area} ආගන්තුක නිවාස සඳහා සෘජු වෙන්කිරීම් මෘදුකාංගය',
    breadcrumb: 'ප්‍රදේශ',
    season: 'කාලය',
    region: 'කලාපය',
    others: 'වෙනත් ප්‍රදේශ',
  },
  blog: {
    metaTitle: 'ලංකාවේ විලා හා ආගන්තුක නිවාස හිමිකරුවන් සඳහා මාර්ගෝපදේශ',
    metaDescription: 'ලංකාවේ කුඩා විලා හා හෝම්ස්ටේ සඳහා කොමිස්, iCal සමමුහුර්තය, තැන්පතු, WhatsApp, Google, SLTDA හා මිල ගණන් ගැන ප්‍රායෝගික මාර්ගෝපදේශ.',
    h1: 'හිමිකරුවන් සඳහා මාර්ගෝපදේශ',
    lede: 'ලංකාවේ කාමර 2–15 ක නවාතැන් සඳහා ලියූ, මූලාශ්‍ර සහිත ප්‍රායෝගික මාර්ගෝපදේශ.',
    minutes: 'කියවීමට මිනිත්තු {n}',
    related: 'තවත් මාර්ගෝපදේශ',
    back: 'සියලු මාර්ගෝපදේශ',
    englishOnly: 'මෙම මාර්ගෝපදේශය තවම පරිවර්තනය කර නැත; මෙන්න ඉංග්‍රීසි පිටපත.',
  },
  faq: { metaTitle: 'ප්‍රශ්න: ලංකාවේ ආගන්තුක නිවාස සඳහා සෘජු වෙන්කිරීම්' },
  caseStudy: { banner: 'නිදර්ශන අගයන් සහිත උදාහරණයකි. සැබෑ පාරිභෝගිකයෙකු නොවේ.' },
  cta: { title: 'ඔබේම නවාතැනේ උත්සාහ කරන්න', body: 'මාස තුනක් නොමිලේ. පැයක් පමණ ඇතුළත ඔබ සමඟ එක්ව සකසමු.', button: 'නොමිලේ අරඹන්න' },
  footer: { areas: 'ප්‍රදේශ', guides: 'මාර්ගෝපදේශ', company: 'StayDirect LK', pricing: 'මිල ගණන්', faq: 'ප්‍රශ්න', alternative: 'Booking.com කොමිසට විකල්පය', caseStudy: 'උදාහරණ අධ්‍යයනය', login: 'හිමිකරු පිවිසුම' },
  langLabel: 'භාෂාව',
  notFound: { title: 'පිටුව හමු නොවීය', body: 'මෙම පිටුව නොපවතී, නැතහොත් වෙනත් තැනකට ගෙන ගොස් ඇත.', home: 'මුල් පිටුව' },
};

export type MarketingText = typeof en;
export const MARKETING_TEXT: Record<MarketingLang, MarketingText> = { en, si };

/** Area names as each language writes them. */
export const AREA_NAMES: Record<MarketingLang, Record<string, string>> = {
  en: { mirissa: 'Mirissa', weligama: 'Weligama', ella: 'Ella', 'arugam-bay': 'Arugam Bay', kandy: 'Kandy', sigiriya: 'Sigiriya' },
  si: { mirissa: 'මිරිස්ස', weligama: 'වැලිගම', ella: 'ඇල්ල', 'arugam-bay': 'ආරුගම් බොක්ක', kandy: 'මහනුවර', sigiriya: 'සීගිරිය' },
};

export function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (vars[k] === undefined ? m : String(vars[k])));
}

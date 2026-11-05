// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Sinhala Sinhalese (`si`).
class AppLocalizationsSi extends AppLocalizations {
  AppLocalizationsSi([String locale = 'si']) : super(locale);

  @override
  String get errorNoConnectionNothingSaved =>
      'සම්බන්ධතාවක් නැත, තවම කිසිවක් සුරැකී නැත.';

  @override
  String get errorGeneric => 'යම් දෝෂයක් සිදු විය';

  @override
  String offlineSavedAgo(String ago) {
    return 'අන්තර්ජාලය නැත — $ago සුරැකූ තොරතුරු පෙන්වයි';
  }

  @override
  String get paid => 'ගෙවා ඇත';

  @override
  String get paidInFull => 'සම්පූර්ණයෙන් ගෙවා ඇත';

  @override
  String dueAmount(String amount) {
    return 'ගෙවිය යුතු $amount';
  }

  @override
  String balanceDue(String amount) {
    return 'ඉතිරි මුදල $amount';
  }

  @override
  String get justNow => 'මේ දැන්';

  @override
  String minutesAgo(int count) {
    return 'මිනිත්තු $countකට පෙර';
  }

  @override
  String hoursAgo(int count) {
    return 'පැය $countකට පෙර';
  }

  @override
  String daysAgo(int count) {
    return 'දින $countකට පෙර';
  }

  @override
  String get channelOther => 'වෙනත් දින දර්ශනය';

  @override
  String get channelCalendar => 'දින දර්ශනය';

  @override
  String get listAnd => ' සහ ';

  @override
  String get navToday => 'අද';

  @override
  String get navTasks => 'කාර්යයන්';

  @override
  String get navInbox => 'පණිවිඩ';

  @override
  String get allProperties => 'සියලු දේපළ';

  @override
  String switchPropertyCurrent(String name) {
    return 'දේපළ මාරු කරන්න, දැනට $name';
  }

  @override
  String get account => 'ගිණුම';

  @override
  String get signOut => 'ගිණුමෙන් ඉවත් වන්න';

  @override
  String get language => 'භාෂාව';

  @override
  String get languageSinhala => 'සිංහල';

  @override
  String get languageEnglish => 'English';

  @override
  String get loginTagline =>
      'ඔබගේ වෙන්කිරීම්, කාර්යයන් හා අමුත්තන් — අද දේ මුලින්ම.';

  @override
  String get mobileNumber => 'ජංගම දුරකථන අංකය';

  @override
  String get codeFromSms => 'SMS මගින් ලැබුණු ඉලක්කම් 6ක කේතය';

  @override
  String get pleaseWait => 'මඳක් රැඳී සිටින්න…';

  @override
  String get signIn => 'ඇතුළු වන්න';

  @override
  String get sendCode => 'කේතය යවන්න';

  @override
  String get useDifferentNumber => 'වෙනත් අංකයක් භාවිත කරන්න';

  @override
  String get loginNoConnection =>
      'සම්බන්ධතාවක් නැත. අන්තර්ජාලය පරීක්ෂා කර නැවත උත්සාහ කරන්න.';

  @override
  String get setUpOnWebFirst =>
      'මුලින්ම වෙබ් අඩවියේ ඔබගේ දේපළ සකසන්න, ඉන්පසු මෙතැනින් ඇතුළු වන්න.';

  @override
  String get greetingMorning => 'සුභ උදෑසනක්';

  @override
  String get greetingAfternoon => 'සුභ දහවලක්';

  @override
  String get greetingEvening => 'සුභ සන්ධ්‍යාවක්';

  @override
  String greetingWithName(String greeting, String name) {
    return '$greeting, $name';
  }

  @override
  String get poyaDay => 'පොහොය දිනය';

  @override
  String get poyaToday =>
      'අද පොහොය දිනයයි: මත්පැන් අලෙවිය හා පිළිගැන්වීම තහනම්. බොහෝ අමුත්තන් පන්සල් වඳින්නට යති.';

  @override
  String poyaTomorrow(String name) {
    return 'හෙට $name: මත්පැන් අලෙවිය හා පිළිගැන්වීම තහනම්.';
  }

  @override
  String holidayToday(String name) {
    return 'අද රජයේ නිවාඩු දිනයකි: $name';
  }

  @override
  String conflictsAlert(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          'ද්විත්ව වෙන්කිරීම් $countක්. විසඳීමට වෙබ් පාලක පුවරුව විවෘත කරන්න.',
    );
    return '$_temp0';
  }

  @override
  String syncFailing(String list) {
    return 'දින දර්ශන සමමුහුර්ත කිරීම අසාර්ථකයි: $list';
  }

  @override
  String get syncPending =>
      'දින දර්ශන සම්බන්ධයි, පළමු සමමුහුර්ත කිරීම පොරොත්තුවෙන්';

  @override
  String syncOk(String ago) {
    return 'දින දර්ශන සමමුහුර්තයි, $ago පරීක්ෂා කළා';
  }

  @override
  String get syncNone => 'Airbnb හෝ Booking.com දින දර්ශන සම්බන්ධ කර නැත';

  @override
  String get glanceArriving => 'පැමිණෙන';

  @override
  String get glanceLeaving => 'පිටවන';

  @override
  String get glanceUnpaid => 'නොගෙවූ';

  @override
  String get glanceAllPaid => 'සියල්ල ගෙවා ඇත';

  @override
  String get glanceBalances => 'ඉතිරි මුදල්';

  @override
  String get arrivingToday => 'අද පැමිණෙන අය';

  @override
  String get noArrivals => 'අද පැමිණීම් නැත.';

  @override
  String get leavingToday => 'අද පිටවන අය';

  @override
  String get noDepartures => 'අද පිටවීම් නැත.';

  @override
  String get waitingApproval => 'ඔබගේ අනුමැතිය බලාපොරොත්තුවෙන්';

  @override
  String get unpaidBalances => 'නොගෙවූ ඉතිරි මුදල්';

  @override
  String get everyonePaid => 'සියලු දෙනා ගෙවා ඇත.';

  @override
  String get next14Days => 'ඉදිරි දින 14';

  @override
  String get thisMonth => 'මෙම මාසය';

  @override
  String get occupancy => 'පිරුණු ප්‍රතිශතය';

  @override
  String get directRevenue => 'සෘජු ආදායම';

  @override
  String get commissionSaved => 'ඉතිරි කළ කොමිස් මුදල';

  @override
  String get calendarSync => 'දින දර්ශන සමමුහුර්ත කිරීම';

  @override
  String get syncFailingShort => 'අසාර්ථකයි';

  @override
  String syncedAgo(String ago) {
    return '$ago සමමුහුර්ත කළා';
  }

  @override
  String get notSyncedYet => 'තවම සමමුහුර්ත කර නැත';

  @override
  String get noCalendarsConnected =>
      'තවම Airbnb / Booking.com දින දර්ශන සම්බන්ධ කර නැත.';

  @override
  String get guestFallback => 'අමුත්තා';

  @override
  String guestsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'අමුත්තන් $count',
    );
    return '$_temp0';
  }

  @override
  String portfolioSummary(int arrivals, int departures, int count) {
    return 'අද දේපළ $countක: පැමිණීම් $arrivals හා පිටවීම් $departures';
  }

  @override
  String fullTonight(String pct) {
    return 'අද රාත්‍රියට $pct% පිරී ඇත';
  }

  @override
  String inOut(String arrivals, String departures) {
    return 'පැමිණීම් $arrivals · පිටවීම් $departures';
  }

  @override
  String tasksOpen(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'විවෘත කාර්යයන් $count',
    );
    return '$_temp0';
  }

  @override
  String guestsWaiting(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'අමුත්තන් $countක් බලාපොරොත්තුවෙන්',
    );
    return '$_temp0';
  }

  @override
  String conflictsShort(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'ද්විත්ව වෙන්කිරීම් $countක්',
    );
    return '$_temp0';
  }

  @override
  String get calendarSyncFailing => 'දින දර්ශන සමමුහුර්ත කිරීම අසාර්ථකයි';

  @override
  String todayDate(String date) {
    return 'අද $date';
  }

  @override
  String get toDo => 'කළ යුතු';

  @override
  String get allDoneToday => 'අදට සියල්ල අවසන්.';

  @override
  String get done => 'අවසන්';

  @override
  String get noConnectionTryOnline =>
      'සම්බන්ධතාවක් නැත — අන්තර්ජාලයට සම්බන්ධ වූ පසු නැවත උත්සාහ කරන්න.';

  @override
  String photosCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'ඡායාරූප $count',
    );
    return '$_temp0';
  }

  @override
  String taskCost(String cost) {
    return 'වියදම $cost';
  }

  @override
  String get noConversations => 'තවම WhatsApp සංවාද නැත.';

  @override
  String needsYou(String summary) {
    return 'ඔබගේ උදව් අවශ්‍යයි: $summary';
  }

  @override
  String get aiConcierge => 'AI සහායකයා';

  @override
  String get aiResumed => 'AI සහායකයා නැවත ක්‍රියාත්මකයි';

  @override
  String get aiPaused => 'AI සහායකයා නවතා ඇත';

  @override
  String get conversationClosed => 'සංවාදය වසා දැමුවා';

  @override
  String get handedBack => 'නැවත AI සහායකයාට භාර දුන්නා';

  @override
  String get resumeAi => 'AI සහායකයා නැවත ආරම්භ කරන්න';

  @override
  String get pauseAi => 'AI සහායකයා නවත්වන්න';

  @override
  String get handBackToAi => 'අවසන් — AI වෙත භාර දෙන්න';

  @override
  String get closeConversation => 'සංවාදය වසන්න';

  @override
  String get guestNeedsYou => 'අමුත්තාට ඔබගේ උදව් අවශ්‍යයි.';

  @override
  String get quickReplies => 'ඉක්මන් පිළිතුරු';

  @override
  String get messageHint => 'පණිවිඩය';

  @override
  String get send => 'යවන්න';

  @override
  String get offlineCannotSend =>
      'ඔබ අන්තර්ජාලයට සම්බන්ධ නැත. නැවත සම්බන්ධ වූ විට පණිවිඩ යැවිය හැක.';

  @override
  String get windowClosed =>
      'පැය 24ක WhatsApp කාලය අවසන්. අමුත්තා නැවත ලිව්වාම පිළිතුරු දිය හැක.';

  @override
  String get noQuickReplies =>
      'තවම ඉක්මන් පිළිතුරු නැත — වෙබ් අඩවියෙන් සම්මත ඒවා එක් කරන්න.';

  @override
  String get messageNotSent => 'සම්බන්ධතාවක් නැත — පණිවිඩය යැවුණේ නැත.';

  @override
  String get msgQueued => 'පෝලිමේ';

  @override
  String get msgSent => 'යැව්වා';

  @override
  String get msgDelivered => 'ලැබුණා';

  @override
  String get msgRead => 'කියෙව්වා';

  @override
  String get msgFailed => 'අසාර්ථකයි';
}

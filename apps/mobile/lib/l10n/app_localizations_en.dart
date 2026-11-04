// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get errorNoConnectionNothingSaved =>
      'No connection and nothing saved yet.';

  @override
  String get errorGeneric => 'Something went wrong';

  @override
  String offlineSavedAgo(String ago) {
    return 'Offline — showing what was saved $ago';
  }

  @override
  String get paid => 'Paid';

  @override
  String get paidInFull => 'Paid in full';

  @override
  String dueAmount(String amount) {
    return 'Due $amount';
  }

  @override
  String balanceDue(String amount) {
    return 'Balance due $amount';
  }

  @override
  String get justNow => 'just now';

  @override
  String minutesAgo(int count) {
    return '$count min ago';
  }

  @override
  String hoursAgo(int count) {
    return '$count h ago';
  }

  @override
  String daysAgo(int count) {
    return '$count d ago';
  }

  @override
  String get channelOther => 'Other calendar';

  @override
  String get channelCalendar => 'Calendar';

  @override
  String get listAnd => ' and ';

  @override
  String get navToday => 'Today';

  @override
  String get navTasks => 'Tasks';

  @override
  String get navInbox => 'Inbox';

  @override
  String get allProperties => 'All properties';

  @override
  String switchPropertyCurrent(String name) {
    return 'Switch property, current $name';
  }

  @override
  String get account => 'Account';

  @override
  String get signOut => 'Sign out';

  @override
  String get language => 'Language';

  @override
  String get languageSinhala => 'සිංහල';

  @override
  String get languageEnglish => 'English';

  @override
  String get loginTagline => 'Your bookings, tasks and guests — today first.';

  @override
  String get mobileNumber => 'Mobile number';

  @override
  String get codeFromSms => '6-digit code from SMS';

  @override
  String get pleaseWait => 'Please wait…';

  @override
  String get signIn => 'Sign in';

  @override
  String get sendCode => 'Send code';

  @override
  String get useDifferentNumber => 'Use a different number';

  @override
  String get loginNoConnection =>
      'No connection. Check your internet and try again.';

  @override
  String get setUpOnWebFirst =>
      'Set up your property on the web first, then sign in here.';

  @override
  String get greetingMorning => 'Good morning';

  @override
  String get greetingAfternoon => 'Good afternoon';

  @override
  String get greetingEvening => 'Good evening';

  @override
  String greetingWithName(String greeting, String name) {
    return '$greeting, $name';
  }

  @override
  String get poyaDay => 'Poya day';

  @override
  String get poyaToday =>
      'Poya day: no alcohol may be sold or served today. Many guests visit temples.';

  @override
  String poyaTomorrow(String name) {
    return 'Tomorrow is $name: no alcohol may be sold or served.';
  }

  @override
  String holidayToday(String name) {
    return 'Public holiday today: $name';
  }

  @override
  String conflictsAlert(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          '$count double-booking conflicts. Open the web dashboard to resolve.',
      one: '1 double-booking conflict. Open the web dashboard to resolve.',
    );
    return '$_temp0';
  }

  @override
  String syncFailing(String list) {
    return 'Calendar sync failing: $list';
  }

  @override
  String get syncPending => 'Calendars connected, first sync pending';

  @override
  String syncOk(String ago) {
    return 'Calendars in sync, checked $ago';
  }

  @override
  String get syncNone => 'No Airbnb or Booking.com calendars connected';

  @override
  String get glanceArriving => 'arriving';

  @override
  String get glanceLeaving => 'leaving';

  @override
  String get glanceUnpaid => 'unpaid';

  @override
  String get glanceAllPaid => 'All paid';

  @override
  String get glanceBalances => 'balances';

  @override
  String get arrivingToday => 'Arriving today';

  @override
  String get noArrivals => 'No arrivals today.';

  @override
  String get leavingToday => 'Leaving today';

  @override
  String get noDepartures => 'No departures today.';

  @override
  String get waitingApproval => 'Waiting for your approval';

  @override
  String get unpaidBalances => 'Unpaid balances';

  @override
  String get everyonePaid => 'Everyone has paid.';

  @override
  String get next14Days => 'Next 14 days';

  @override
  String get thisMonth => 'This month';

  @override
  String get occupancy => 'Occupancy';

  @override
  String get directRevenue => 'Direct revenue';

  @override
  String get commissionSaved => 'Commission saved';

  @override
  String get calendarSync => 'Calendar sync';

  @override
  String get syncFailingShort => 'Failing';

  @override
  String syncedAgo(String ago) {
    return 'Synced $ago';
  }

  @override
  String get notSyncedYet => 'Not synced yet';

  @override
  String get noCalendarsConnected =>
      'No Airbnb / Booking.com calendars connected yet.';

  @override
  String get guestFallback => 'Guest';

  @override
  String guestsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count guests',
      one: '1 guest',
    );
    return '$_temp0';
  }

  @override
  String portfolioSummary(int arrivals, int departures, int count) {
    return '$arrivals arriving and $departures leaving today across $count properties';
  }

  @override
  String fullTonight(String pct) {
    return '$pct% full tonight';
  }

  @override
  String inOut(String arrivals, String departures) {
    return '$arrivals in · $departures out';
  }

  @override
  String tasksOpen(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count tasks open',
      one: '1 task open',
    );
    return '$_temp0';
  }

  @override
  String guestsWaiting(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count guests waiting',
      one: '1 guest waiting',
    );
    return '$_temp0';
  }

  @override
  String conflictsShort(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count double-booking conflicts',
      one: '1 double-booking conflict',
    );
    return '$_temp0';
  }

  @override
  String get calendarSyncFailing => 'calendar sync failing';

  @override
  String todayDate(String date) {
    return 'Today $date';
  }

  @override
  String get toDo => 'To do';

  @override
  String get allDoneToday => 'All done for today.';

  @override
  String get done => 'Done';

  @override
  String get noConnectionTryOnline => 'No connection — try again when online.';

  @override
  String photosCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count photos',
      one: '1 photo',
    );
    return '$_temp0';
  }

  @override
  String taskCost(String cost) {
    return 'cost $cost';
  }

  @override
  String get noConversations => 'No WhatsApp conversations yet.';

  @override
  String needsYou(String summary) {
    return 'Needs you: $summary';
  }

  @override
  String get aiConcierge => 'AI concierge';

  @override
  String get aiResumed => 'AI concierge resumed';

  @override
  String get aiPaused => 'AI concierge paused';

  @override
  String get conversationClosed => 'Conversation closed';

  @override
  String get handedBack => 'Handed back to the concierge';

  @override
  String get resumeAi => 'Resume AI concierge';

  @override
  String get pauseAi => 'Pause AI concierge';

  @override
  String get handBackToAi => 'Done — hand back to AI';

  @override
  String get closeConversation => 'Close conversation';

  @override
  String get guestNeedsYou => 'The guest needs you.';

  @override
  String get quickReplies => 'Quick replies';

  @override
  String get messageHint => 'Message';

  @override
  String get send => 'Send';

  @override
  String get offlineCannotSend =>
      'You are offline. Messages can be sent when you are back online.';

  @override
  String get windowClosed =>
      'The 24-hour WhatsApp window is closed. You can reply once the guest writes again.';

  @override
  String get noQuickReplies =>
      'No quick replies yet — load the defaults on the web.';

  @override
  String get messageNotSent => 'No connection — message not sent.';

  @override
  String get msgQueued => 'queued';

  @override
  String get msgSent => 'sent';

  @override
  String get msgDelivered => 'delivered';

  @override
  String get msgRead => 'read';

  @override
  String get msgFailed => 'failed';
}

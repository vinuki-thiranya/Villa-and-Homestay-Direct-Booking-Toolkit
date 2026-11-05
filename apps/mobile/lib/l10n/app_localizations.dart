import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_si.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('si'),
  ];

  /// No description provided for @errorNoConnectionNothingSaved.
  ///
  /// In en, this message translates to:
  /// **'No connection and nothing saved yet.'**
  String get errorNoConnectionNothingSaved;

  /// No description provided for @errorGeneric.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong'**
  String get errorGeneric;

  /// No description provided for @offlineSavedAgo.
  ///
  /// In en, this message translates to:
  /// **'Offline — showing what was saved {ago}'**
  String offlineSavedAgo(String ago);

  /// No description provided for @paid.
  ///
  /// In en, this message translates to:
  /// **'Paid'**
  String get paid;

  /// No description provided for @paidInFull.
  ///
  /// In en, this message translates to:
  /// **'Paid in full'**
  String get paidInFull;

  /// No description provided for @dueAmount.
  ///
  /// In en, this message translates to:
  /// **'Due {amount}'**
  String dueAmount(String amount);

  /// No description provided for @balanceDue.
  ///
  /// In en, this message translates to:
  /// **'Balance due {amount}'**
  String balanceDue(String amount);

  /// No description provided for @justNow.
  ///
  /// In en, this message translates to:
  /// **'just now'**
  String get justNow;

  /// No description provided for @minutesAgo.
  ///
  /// In en, this message translates to:
  /// **'{count} min ago'**
  String minutesAgo(int count);

  /// No description provided for @hoursAgo.
  ///
  /// In en, this message translates to:
  /// **'{count} h ago'**
  String hoursAgo(int count);

  /// No description provided for @daysAgo.
  ///
  /// In en, this message translates to:
  /// **'{count} d ago'**
  String daysAgo(int count);

  /// No description provided for @channelOther.
  ///
  /// In en, this message translates to:
  /// **'Other calendar'**
  String get channelOther;

  /// No description provided for @channelCalendar.
  ///
  /// In en, this message translates to:
  /// **'Calendar'**
  String get channelCalendar;

  /// No description provided for @listAnd.
  ///
  /// In en, this message translates to:
  /// **' and '**
  String get listAnd;

  /// No description provided for @navToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get navToday;

  /// No description provided for @navTasks.
  ///
  /// In en, this message translates to:
  /// **'Tasks'**
  String get navTasks;

  /// No description provided for @navInbox.
  ///
  /// In en, this message translates to:
  /// **'Inbox'**
  String get navInbox;

  /// No description provided for @allProperties.
  ///
  /// In en, this message translates to:
  /// **'All properties'**
  String get allProperties;

  /// No description provided for @switchPropertyCurrent.
  ///
  /// In en, this message translates to:
  /// **'Switch property, current {name}'**
  String switchPropertyCurrent(String name);

  /// No description provided for @account.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get account;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get signOut;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @languageSinhala.
  ///
  /// In en, this message translates to:
  /// **'සිංහල'**
  String get languageSinhala;

  /// No description provided for @languageEnglish.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get languageEnglish;

  /// No description provided for @loginTagline.
  ///
  /// In en, this message translates to:
  /// **'Your bookings, tasks and guests — today first.'**
  String get loginTagline;

  /// No description provided for @mobileNumber.
  ///
  /// In en, this message translates to:
  /// **'Mobile number'**
  String get mobileNumber;

  /// No description provided for @codeFromSms.
  ///
  /// In en, this message translates to:
  /// **'6-digit code from SMS'**
  String get codeFromSms;

  /// No description provided for @pleaseWait.
  ///
  /// In en, this message translates to:
  /// **'Please wait…'**
  String get pleaseWait;

  /// No description provided for @signIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get signIn;

  /// No description provided for @sendCode.
  ///
  /// In en, this message translates to:
  /// **'Send code'**
  String get sendCode;

  /// No description provided for @useDifferentNumber.
  ///
  /// In en, this message translates to:
  /// **'Use a different number'**
  String get useDifferentNumber;

  /// No description provided for @loginNoConnection.
  ///
  /// In en, this message translates to:
  /// **'No connection. Check your internet and try again.'**
  String get loginNoConnection;

  /// No description provided for @setUpOnWebFirst.
  ///
  /// In en, this message translates to:
  /// **'Set up your property on the web first, then sign in here.'**
  String get setUpOnWebFirst;

  /// No description provided for @greetingMorning.
  ///
  /// In en, this message translates to:
  /// **'Good morning'**
  String get greetingMorning;

  /// No description provided for @greetingAfternoon.
  ///
  /// In en, this message translates to:
  /// **'Good afternoon'**
  String get greetingAfternoon;

  /// No description provided for @greetingEvening.
  ///
  /// In en, this message translates to:
  /// **'Good evening'**
  String get greetingEvening;

  /// No description provided for @greetingWithName.
  ///
  /// In en, this message translates to:
  /// **'{greeting}, {name}'**
  String greetingWithName(String greeting, String name);

  /// No description provided for @poyaDay.
  ///
  /// In en, this message translates to:
  /// **'Poya day'**
  String get poyaDay;

  /// No description provided for @poyaToday.
  ///
  /// In en, this message translates to:
  /// **'Poya day: no alcohol may be sold or served today. Many guests visit temples.'**
  String get poyaToday;

  /// No description provided for @poyaTomorrow.
  ///
  /// In en, this message translates to:
  /// **'Tomorrow is {name}: no alcohol may be sold or served.'**
  String poyaTomorrow(String name);

  /// No description provided for @holidayToday.
  ///
  /// In en, this message translates to:
  /// **'Public holiday today: {name}'**
  String holidayToday(String name);

  /// No description provided for @conflictsAlert.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 double-booking conflict. Open the web dashboard to resolve.} other{{count} double-booking conflicts. Open the web dashboard to resolve.}}'**
  String conflictsAlert(int count);

  /// No description provided for @syncFailing.
  ///
  /// In en, this message translates to:
  /// **'Calendar sync failing: {list}'**
  String syncFailing(String list);

  /// No description provided for @syncPending.
  ///
  /// In en, this message translates to:
  /// **'Calendars connected, first sync pending'**
  String get syncPending;

  /// No description provided for @syncOk.
  ///
  /// In en, this message translates to:
  /// **'Calendars in sync, checked {ago}'**
  String syncOk(String ago);

  /// No description provided for @syncNone.
  ///
  /// In en, this message translates to:
  /// **'No Airbnb or Booking.com calendars connected'**
  String get syncNone;

  /// No description provided for @glanceArriving.
  ///
  /// In en, this message translates to:
  /// **'arriving'**
  String get glanceArriving;

  /// No description provided for @glanceLeaving.
  ///
  /// In en, this message translates to:
  /// **'leaving'**
  String get glanceLeaving;

  /// No description provided for @glanceUnpaid.
  ///
  /// In en, this message translates to:
  /// **'unpaid'**
  String get glanceUnpaid;

  /// No description provided for @glanceAllPaid.
  ///
  /// In en, this message translates to:
  /// **'All paid'**
  String get glanceAllPaid;

  /// No description provided for @glanceBalances.
  ///
  /// In en, this message translates to:
  /// **'balances'**
  String get glanceBalances;

  /// No description provided for @arrivingToday.
  ///
  /// In en, this message translates to:
  /// **'Arriving today'**
  String get arrivingToday;

  /// No description provided for @noArrivals.
  ///
  /// In en, this message translates to:
  /// **'No arrivals today.'**
  String get noArrivals;

  /// No description provided for @leavingToday.
  ///
  /// In en, this message translates to:
  /// **'Leaving today'**
  String get leavingToday;

  /// No description provided for @noDepartures.
  ///
  /// In en, this message translates to:
  /// **'No departures today.'**
  String get noDepartures;

  /// No description provided for @waitingApproval.
  ///
  /// In en, this message translates to:
  /// **'Waiting for your approval'**
  String get waitingApproval;

  /// No description provided for @unpaidBalances.
  ///
  /// In en, this message translates to:
  /// **'Unpaid balances'**
  String get unpaidBalances;

  /// No description provided for @everyonePaid.
  ///
  /// In en, this message translates to:
  /// **'Everyone has paid.'**
  String get everyonePaid;

  /// No description provided for @next14Days.
  ///
  /// In en, this message translates to:
  /// **'Next 14 days'**
  String get next14Days;

  /// No description provided for @thisMonth.
  ///
  /// In en, this message translates to:
  /// **'This month'**
  String get thisMonth;

  /// No description provided for @occupancy.
  ///
  /// In en, this message translates to:
  /// **'Occupancy'**
  String get occupancy;

  /// No description provided for @directRevenue.
  ///
  /// In en, this message translates to:
  /// **'Direct revenue'**
  String get directRevenue;

  /// No description provided for @commissionSaved.
  ///
  /// In en, this message translates to:
  /// **'Commission saved'**
  String get commissionSaved;

  /// No description provided for @calendarSync.
  ///
  /// In en, this message translates to:
  /// **'Calendar sync'**
  String get calendarSync;

  /// No description provided for @syncFailingShort.
  ///
  /// In en, this message translates to:
  /// **'Failing'**
  String get syncFailingShort;

  /// No description provided for @syncedAgo.
  ///
  /// In en, this message translates to:
  /// **'Synced {ago}'**
  String syncedAgo(String ago);

  /// No description provided for @notSyncedYet.
  ///
  /// In en, this message translates to:
  /// **'Not synced yet'**
  String get notSyncedYet;

  /// No description provided for @noCalendarsConnected.
  ///
  /// In en, this message translates to:
  /// **'No Airbnb / Booking.com calendars connected yet.'**
  String get noCalendarsConnected;

  /// No description provided for @guestFallback.
  ///
  /// In en, this message translates to:
  /// **'Guest'**
  String get guestFallback;

  /// No description provided for @guestsCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 guest} other{{count} guests}}'**
  String guestsCount(int count);

  /// No description provided for @portfolioSummary.
  ///
  /// In en, this message translates to:
  /// **'{arrivals} arriving and {departures} leaving today across {count} properties'**
  String portfolioSummary(int arrivals, int departures, int count);

  /// No description provided for @fullTonight.
  ///
  /// In en, this message translates to:
  /// **'{pct}% full tonight'**
  String fullTonight(String pct);

  /// No description provided for @inOut.
  ///
  /// In en, this message translates to:
  /// **'{arrivals} in · {departures} out'**
  String inOut(String arrivals, String departures);

  /// No description provided for @tasksOpen.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 task open} other{{count} tasks open}}'**
  String tasksOpen(int count);

  /// No description provided for @guestsWaiting.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 guest waiting} other{{count} guests waiting}}'**
  String guestsWaiting(int count);

  /// No description provided for @conflictsShort.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 double-booking conflict} other{{count} double-booking conflicts}}'**
  String conflictsShort(int count);

  /// No description provided for @calendarSyncFailing.
  ///
  /// In en, this message translates to:
  /// **'calendar sync failing'**
  String get calendarSyncFailing;

  /// No description provided for @todayDate.
  ///
  /// In en, this message translates to:
  /// **'Today {date}'**
  String todayDate(String date);

  /// No description provided for @toDo.
  ///
  /// In en, this message translates to:
  /// **'To do'**
  String get toDo;

  /// No description provided for @allDoneToday.
  ///
  /// In en, this message translates to:
  /// **'All done for today.'**
  String get allDoneToday;

  /// No description provided for @done.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get done;

  /// No description provided for @noConnectionTryOnline.
  ///
  /// In en, this message translates to:
  /// **'No connection — try again when online.'**
  String get noConnectionTryOnline;

  /// No description provided for @photosCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 photo} other{{count} photos}}'**
  String photosCount(int count);

  /// No description provided for @taskCost.
  ///
  /// In en, this message translates to:
  /// **'cost {cost}'**
  String taskCost(String cost);

  /// No description provided for @noConversations.
  ///
  /// In en, this message translates to:
  /// **'No WhatsApp conversations yet.'**
  String get noConversations;

  /// No description provided for @needsYou.
  ///
  /// In en, this message translates to:
  /// **'Needs you: {summary}'**
  String needsYou(String summary);

  /// No description provided for @aiConcierge.
  ///
  /// In en, this message translates to:
  /// **'AI concierge'**
  String get aiConcierge;

  /// No description provided for @aiResumed.
  ///
  /// In en, this message translates to:
  /// **'AI concierge resumed'**
  String get aiResumed;

  /// No description provided for @aiPaused.
  ///
  /// In en, this message translates to:
  /// **'AI concierge paused'**
  String get aiPaused;

  /// No description provided for @conversationClosed.
  ///
  /// In en, this message translates to:
  /// **'Conversation closed'**
  String get conversationClosed;

  /// No description provided for @handedBack.
  ///
  /// In en, this message translates to:
  /// **'Handed back to the concierge'**
  String get handedBack;

  /// No description provided for @resumeAi.
  ///
  /// In en, this message translates to:
  /// **'Resume AI concierge'**
  String get resumeAi;

  /// No description provided for @pauseAi.
  ///
  /// In en, this message translates to:
  /// **'Pause AI concierge'**
  String get pauseAi;

  /// No description provided for @handBackToAi.
  ///
  /// In en, this message translates to:
  /// **'Done — hand back to AI'**
  String get handBackToAi;

  /// No description provided for @closeConversation.
  ///
  /// In en, this message translates to:
  /// **'Close conversation'**
  String get closeConversation;

  /// No description provided for @guestNeedsYou.
  ///
  /// In en, this message translates to:
  /// **'The guest needs you.'**
  String get guestNeedsYou;

  /// No description provided for @quickReplies.
  ///
  /// In en, this message translates to:
  /// **'Quick replies'**
  String get quickReplies;

  /// No description provided for @messageHint.
  ///
  /// In en, this message translates to:
  /// **'Message'**
  String get messageHint;

  /// No description provided for @send.
  ///
  /// In en, this message translates to:
  /// **'Send'**
  String get send;

  /// No description provided for @offlineCannotSend.
  ///
  /// In en, this message translates to:
  /// **'You are offline. Messages can be sent when you are back online.'**
  String get offlineCannotSend;

  /// No description provided for @windowClosed.
  ///
  /// In en, this message translates to:
  /// **'The 24-hour WhatsApp window is closed. You can reply once the guest writes again.'**
  String get windowClosed;

  /// No description provided for @noQuickReplies.
  ///
  /// In en, this message translates to:
  /// **'No quick replies yet — load the defaults on the web.'**
  String get noQuickReplies;

  /// No description provided for @messageNotSent.
  ///
  /// In en, this message translates to:
  /// **'No connection — message not sent.'**
  String get messageNotSent;

  /// No description provided for @msgQueued.
  ///
  /// In en, this message translates to:
  /// **'queued'**
  String get msgQueued;

  /// No description provided for @msgSent.
  ///
  /// In en, this message translates to:
  /// **'sent'**
  String get msgSent;

  /// No description provided for @msgDelivered.
  ///
  /// In en, this message translates to:
  /// **'delivered'**
  String get msgDelivered;

  /// No description provided for @msgRead.
  ///
  /// In en, this message translates to:
  /// **'read'**
  String get msgRead;

  /// No description provided for @msgFailed.
  ///
  /// In en, this message translates to:
  /// **'failed'**
  String get msgFailed;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'si'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'si':
      return AppLocalizationsSi();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}

import 'package:intl/intl.dart';

import 'l10n/app_localizations.dart';

/// Money keeps the currency code in every language (LKR 150,000 / USD 1,234.50), Western digits.
String money(num? amount, String currency) {
  final value = (amount ?? 0).toDouble();
  final noDecimals = currency == 'LKR' || currency == 'INR';
  final fixed = value.abs().toStringAsFixed(noDecimals ? 0 : 2);
  final parts = fixed.split('.');
  final whole = parts[0].replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ',');
  final sign = value < 0 ? '−' : '';
  return '$sign$currency $whole${parts.length > 1 ? '.${parts[1]}' : ''}';
}

/// '2026-11-04' → '4 Nov' (English) / '4 නොවැ' (Sinhala), month names from the app's locale.
/// Sinhala date symbols are loaded by the Material localizations delegate; tests call
/// initializeDateFormatting first.
String shortDate(String? iso, [String locale = 'en']) {
  if (iso == null || iso.length < 10) return '';
  final d = DateTime.tryParse(iso.substring(0, 10));
  if (d == null) return '';
  return DateFormat('d MMM', locale).format(d);
}

String isoDate(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// Sri Lanka has no daylight saving: Colombo is always UTC+05:30.
DateTime colomboNow([DateTime? now]) => (now ?? DateTime.now()).toUtc().add(const Duration(hours: 5, minutes: 30));

/// Today's date in Colombo (the property's day, whatever the phone's timezone).
String colomboToday([DateTime? now]) => isoDate(colomboNow(now));

/// "5 min ago" style label for cache times and messages.
String ago(AppLocalizations l, DateTime t, [DateTime? now]) {
  final diff = (now ?? DateTime.now()).difference(t);
  if (diff.inMinutes < 1) return l.justNow;
  if (diff.inHours < 1) return l.minutesAgo(diff.inMinutes);
  if (diff.inDays < 1) return l.hoursAgo(diff.inHours);
  return l.daysAgo(diff.inDays);
}

/// Channel brand names stay in Latin script in every language.
const _channelLabels = {
  'airbnb': 'Airbnb',
  'booking_com': 'Booking.com',
  'agoda': 'Agoda',
  'vrbo': 'Vrbo',
};

/// Human name for an OTA channel key from the API.
String channelLabel(AppLocalizations l, String? key) =>
    _channelLabels[key] ?? (key == 'other' ? l.channelOther : key ?? l.channelCalendar);

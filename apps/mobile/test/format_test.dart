import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:staydirect_owner/format.dart';
import 'package:staydirect_owner/l10n/app_localizations.dart';

void main() {
  test('money formats both currencies', () {
    expect(money(1234.5, 'USD'), 'USD 1,234.50');
    expect(money(150000, 'LKR'), 'LKR 150,000');
    expect(money(-25, 'USD'), '−USD 25.00');
  });

  test('dates', () async {
    await initializeDateFormatting('si');
    expect(shortDate('2026-11-04'), '4 Nov');
    expect(shortDate('2026-11-04', 'si'), isNot(contains('Nov'))); // Sinhala month name
    expect(isoDate(DateTime(2027, 1, 9)), '2027-01-09');
    final now = DateTime(2026, 11, 4, 12);
    final en = lookupAppLocalizations(const Locale('en'));
    final si = lookupAppLocalizations(const Locale('si'));
    expect(ago(en, now.subtract(const Duration(minutes: 5)), now), '5 min ago');
    expect(ago(en, now.subtract(const Duration(hours: 3)), now), '3 h ago');
    expect(ago(si, now.subtract(const Duration(hours: 3)), now), 'පැය 3කට පෙර');
  });

  test('Colombo day is UTC+05:30 whatever the phone timezone', () {
    expect(colomboToday(DateTime.utc(2026, 11, 23, 18, 29)), '2026-11-23');
    expect(colomboToday(DateTime.utc(2026, 11, 23, 18, 30)), '2026-11-24');
  });
}

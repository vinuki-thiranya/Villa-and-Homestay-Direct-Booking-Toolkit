import 'package:flutter_test/flutter_test.dart';
import 'package:staydirect_owner/format.dart';

void main() {
  test('money formats both currencies', () {
    expect(money(1234.5, 'USD'), 'USD 1,234.50');
    expect(money(150000, 'LKR'), 'LKR 150,000');
    expect(money(-25, 'USD'), '−USD 25.00');
  });

  test('dates', () {
    expect(shortDate('2026-11-04'), '4 Nov');
    expect(isoDate(DateTime(2027, 1, 9)), '2027-01-09');
    final now = DateTime(2026, 11, 4, 12);
    expect(ago(now.subtract(const Duration(minutes: 5)), now), '5 min ago');
    expect(ago(now.subtract(const Duration(hours: 3)), now), '3 h ago');
  });
}

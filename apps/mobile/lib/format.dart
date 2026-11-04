/// Small formatting helpers (no intl dependency needed for two currencies and ISO dates).
String money(num? amount, String currency) {
  final value = (amount ?? 0).toDouble();
  final noDecimals = currency == 'LKR' || currency == 'INR';
  final fixed = value.abs().toStringAsFixed(noDecimals ? 0 : 2);
  final parts = fixed.split('.');
  final whole = parts[0].replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ',');
  final sign = value < 0 ? '−' : '';
  return '$sign$currency $whole${parts.length > 1 ? '.${parts[1]}' : ''}';
}

const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/// '2026-11-04' → '4 Nov'
String shortDate(String? iso) {
  if (iso == null || iso.length < 10) return '';
  final m = int.tryParse(iso.substring(5, 7)) ?? 1;
  final d = int.tryParse(iso.substring(8, 10)) ?? 1;
  return '$d ${_months[m - 1]}';
}

String isoDate(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// "5 min ago" style label for cache times and messages.
String ago(DateTime t, [DateTime? now]) {
  final diff = (now ?? DateTime.now()).difference(t);
  if (diff.inMinutes < 1) return 'just now';
  if (diff.inHours < 1) return '${diff.inMinutes} min ago';
  if (diff.inDays < 1) return '${diff.inHours} h ago';
  return '${diff.inDays} d ago';
}

const _channelLabels = {
  'airbnb': 'Airbnb',
  'booking_com': 'Booking.com',
  'agoda': 'Agoda',
  'vrbo': 'Vrbo',
  'other': 'Other calendar',
};

/// Human name for an OTA channel key from the API.
String channelLabel(String? key) => _channelLabels[key] ?? key ?? 'Calendar';

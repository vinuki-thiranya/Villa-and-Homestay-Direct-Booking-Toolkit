import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../format.dart';
import '../main.dart';
import '../widgets.dart';

/// Today first: who arrives, who leaves, who still owes money, and whether calendar sync is healthy.
class TodayScreen extends StatelessWidget {
  const TodayScreen({super.key, required this.services, required this.propertyId, required this.onUnauthorized});
  final AppServices services;
  final String propertyId;
  final Future<void> Function() onUnauthorized;

  @override
  Widget build(BuildContext context) {
    final pid = propertyId;
    return CachedView(
      cacheKey: 'dashboard:$pid',
      store: services.store,
      onUnauthorized: onUnauthorized,
      fetch: () => services.api.get('/properties/$pid/dashboard'),
      builder: (context, data, offline, reload) {
        final d = data as Map<String, dynamic>;
        final currency = d['currency'] as String? ?? 'USD';
        List<Map<String, dynamic>> list(String k) => ((d[k] as List?) ?? const []).cast<Map<String, dynamic>>();
        final sync = list('syncHealth');
        final failing = sync.where((s) => (s['consecutiveFailures'] as num? ?? 0) > 0).toList();
        final conflicts = list('openConflicts');
        final month = (d['month'] as Map<String, dynamic>?) ?? const {};
        return ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            if (conflicts.isNotEmpty || failing.isNotEmpty)
              _Alert(
                text: conflicts.isNotEmpty
                    ? '${conflicts.length} double-booking conflict${conflicts.length == 1 ? '' : 's'} — open the web dashboard to resolve.'
                    : 'Calendar sync is failing for ${failing.map((s) => s['roomName']).join(', ')}.',
              ),
            SectionTitle('Arriving today', count: list('arrivalsToday').length),
            ...list('arrivalsToday').map((b) => _BookingTile(b: b, currency: currency)),
            if (list('arrivalsToday').isEmpty) const EmptyNote('No arrivals today.'),
            SectionTitle('Leaving today', count: list('departuresToday').length),
            ...list('departuresToday').map((b) => _BookingTile(b: b, currency: currency)),
            if (list('departuresToday').isEmpty) const EmptyNote('No departures today.'),
            if (list('pendingApproval').isNotEmpty) ...[
              SectionTitle('Waiting for your approval', count: list('pendingApproval').length),
              ...list('pendingApproval').map((b) => _BookingTile(b: b, currency: currency)),
            ],
            SectionTitle('Unpaid balances', count: list('unpaidBalances').length),
            ...list('unpaidBalances').map((b) => _BookingTile(b: b, currency: currency)),
            if (list('unpaidBalances').isEmpty) const EmptyNote('Everyone has paid.'),
            SectionTitle('Next 14 days', count: list('upcomingArrivals').length),
            ...list('upcomingArrivals').take(8).map((b) => _BookingTile(b: b, currency: currency)),
            const SectionTitle('This month'),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Wrap(spacing: 8, runSpacing: 8, children: [
                _Stat('Occupancy', '${month['occupancyPct'] ?? 0}%'),
                _Stat('Direct revenue', money(month['directRevenue'] as num?, currency)),
                _Stat('Commission saved', money(month['commissionSaved'] as num?, currency)),
              ]),
            ),
            SectionTitle('Calendar sync', count: sync.length),
            ...sync.map((s) {
              final bad = (s['consecutiveFailures'] as num? ?? 0) > 0;
              return ListTile(
                dense: true,
                leading: Icon(bad ? Icons.error : Icons.check_circle, color: bad ? const Color(0xFFB3261E) : const Color(0xFF1B7F3B)),
                title: Text('${s['roomName']} · ${s['channel']}'),
                subtitle: Text(bad
                    ? (s['lastError']?.toString() ?? 'Failing')
                    : (s['lastSuccessAt'] != null ? 'Synced ${ago(DateTime.parse(s['lastSuccessAt'] as String))}' : 'Not synced yet')),
              );
            }),
            if (sync.isEmpty) const EmptyNote('No Airbnb / Booking.com calendars connected yet.'),
          ],
        );
      },
    );
  }
}

class _BookingTile extends StatelessWidget {
  const _BookingTile({required this.b, required this.currency});
  final Map<String, dynamic> b;
  final String currency;

  @override
  Widget build(BuildContext context) {
    final phone = b['guestPhone'] as String?;
    return Card(
      child: ListTile(
        title: Text('${b['guestName'] ?? 'Guest'} · ${b['roomName']}'),
        subtitle: Text('${shortDate(b['from'] as String?)} → ${shortDate(b['to'] as String?)} · ${b['guests']} guests · ${b['reference']}'),
        trailing: PaidChip(balance: (b['balance'] as num?) ?? 0, currency: b['currency'] as String? ?? currency),
        onTap: phone == null
            ? null
            : () => launchUrl(Uri.parse('https://wa.me/${phone.replaceAll(RegExp(r'[^0-9]'), '')}'), mode: LaunchMode.externalApplication),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat(this.label, this.value);
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: t.labelMedium),
          const SizedBox(height: 4),
          Text(value, style: t.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
        ]),
      ),
    );
  }
}

class _Alert extends StatelessWidget {
  const _Alert({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      color: scheme.errorContainer,
      child: ListTile(
        leading: Icon(Icons.warning_amber, color: scheme.onErrorContainer),
        title: Text(text, style: TextStyle(color: scheme.onErrorContainer)),
      ),
    );
  }
}

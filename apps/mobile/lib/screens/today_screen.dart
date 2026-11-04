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
        final failing = sync.where(_failing).toList();
        final conflicts = list('openConflicts');
        final month = (d['month'] as Map<String, dynamic>?) ?? const {};
        return ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            if (conflicts.isNotEmpty)
              _Alert(text: '${conflicts.length} double-booking conflict${conflicts.length == 1 ? '' : 's'}. Open the web dashboard to resolve.'),
            SyncBanner(sync: sync, failing: failing),
            _Glance(
              arriving: list('arrivalsToday').length,
              leaving: list('departuresToday').length,
              unpaid: list('unpaidBalances').length,
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
              final bad = _failing(s);
              final c = StatusColors.of(context);
              return ListTile(
                leading: Icon(bad ? Icons.error : Icons.check_circle, color: bad ? c.bad : c.ok),
                title: Text('${s['roomName']} · ${channelLabel(s['channel'] as String?)}'),
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

bool _failing(Map<String, dynamic> s) => (s['consecutiveFailures'] as num? ?? 0) > 0 || s['lastStatus'] == 'error';

/// Always-visible calendar sync state at the top of Today: red when a feed fails, green when all
/// feeds are fresh, neutral when nothing is connected.
class SyncBanner extends StatelessWidget {
  const SyncBanner({super.key, required this.sync, required this.failing});
  final List<Map<String, dynamic>> sync;
  final List<Map<String, dynamic>> failing;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final c = StatusColors.of(context);
    final String text;
    final IconData icon;
    final Color fg;
    if (failing.isNotEmpty) {
      text = 'Calendar sync failing: ${failing.map((s) => '${s['roomName']} (${channelLabel(s['channel'] as String?)})').join(', ')}';
      icon = Icons.sync_problem;
      fg = c.bad;
    } else if (sync.isNotEmpty) {
      final times = sync.map((s) => s['lastSuccessAt'] as String?).whereType<String>().map(DateTime.parse).toList()..sort();
      text = times.isEmpty ? 'Calendars connected, first sync pending' : 'Calendars in sync, checked ${ago(times.first)}';
      icon = Icons.sync;
      fg = c.ok;
    } else {
      text = 'No Airbnb or Booking.com calendars connected';
      icon = Icons.sync_disabled;
      fg = scheme.onSurfaceVariant;
    }
    return Semantics(
      liveRegion: failing.isNotEmpty,
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 12, 16, 4),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        constraints: const BoxConstraints(minHeight: 48),
        decoration: BoxDecoration(
          color: failing.isNotEmpty ? scheme.errorContainer : scheme.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(12),
          border: Border(left: BorderSide(color: fg, width: 4)),
        ),
        child: Row(children: [
          Icon(icon, color: failing.isNotEmpty ? scheme.onErrorContainer : fg, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text,
                style: TextStyle(
                  color: failing.isNotEmpty ? scheme.onErrorContainer : scheme.onSurface,
                  fontWeight: failing.isNotEmpty ? FontWeight.w600 : FontWeight.w500,
                )),
          ),
        ]),
      ),
    );
  }
}

/// Three numbers an owner checks first: arrivals, departures, who still owes money.
class _Glance extends StatelessWidget {
  const _Glance({required this.arriving, required this.leaving, required this.unpaid});
  final int arriving;
  final int leaving;
  final int unpaid;

  @override
  Widget build(BuildContext context) {
    final c = StatusColors.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Row(children: [
        Expanded(child: _GlanceTile(value: '$arriving', label: 'arriving')),
        const SizedBox(width: 8),
        Expanded(child: _GlanceTile(value: '$leaving', label: 'leaving')),
        const SizedBox(width: 8),
        Expanded(
          child: _GlanceTile(
            value: unpaid == 0 ? 'All paid' : '$unpaid',
            label: unpaid == 0 ? 'balances' : 'unpaid',
            color: unpaid == 0 ? c.ok : c.bad,
          ),
        ),
      ]),
    );
  }
}

class _GlanceTile extends StatelessWidget {
  const _GlanceTile({required this.value, required this.label, this.color});
  final String value;
  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(color: scheme.surfaceContainerHigh, borderRadius: BorderRadius.circular(12)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(value, style: t.titleLarge?.copyWith(fontWeight: FontWeight.w700, color: color ?? scheme.onSurface)),
        Text(label, style: t.labelMedium?.copyWith(color: scheme.onSurfaceVariant)),
      ]),
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

import 'package:flutter/material.dart';

import '../format.dart';
import '../main.dart';
import '../property_scope.dart';
import '../widgets.dart';

/// All properties at a glance (Pro Multi / Manager): what needs attention today, worst first.
class PortfolioScreen extends StatelessWidget {
  const PortfolioScreen({super.key, required this.services, required this.onUnauthorized});
  final AppServices services;
  final Future<void> Function() onUnauthorized;

  /// Problems first: conflicts and sync failures, then guests waiting for a reply, then money owed.
  static int _urgency(Map<String, dynamic> p) =>
      ((p['conflicts'] as num? ?? 0) + (p['syncFailures'] as num? ?? 0)).toInt() * 100 +
      (p['needsReply'] as num? ?? 0).toInt() * 10 +
      ((p['unpaid'] as num? ?? 0) > 0 ? 1 : 0);

  @override
  Widget build(BuildContext context) {
    return CachedView(
      cacheKey: 'portfolio',
      store: services.store,
      onUnauthorized: onUnauthorized,
      fetch: () => services.api.get('/portfolio'),
      builder: (context, data, offline, reload) {
        final list = (data as List).cast<Map<String, dynamic>>()..sort((a, b) => _urgency(b).compareTo(_urgency(a)));
        final arrivals = list.fold<int>(0, (s, p) => s + (p['arrivals'] as num? ?? 0).toInt());
        final departures = list.fold<int>(0, (s, p) => s + (p['departures'] as num? ?? 0).toInt());
        return ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
              child: Text('$arrivals arriving and $departures leaving today across ${list.length} properties',
                  style: Theme.of(context).textTheme.titleMedium),
            ),
            ...list.map((p) => _PropertyCard(p: p)),
          ],
        );
      },
    );
  }
}

class _PropertyCard extends StatelessWidget {
  const _PropertyCard({required this.p});
  final Map<String, dynamic> p;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final problems = (p['conflicts'] as num? ?? 0) + (p['syncFailures'] as num? ?? 0);
    final unpaid = (p['unpaid'] as num?) ?? 0;
    final chips = <Widget>[
      _Chip('${p['occupancyTonightPct']}% full tonight'),
      _Chip('${p['arrivals']} in · ${p['departures']} out'),
      if ((p['openTasks'] as num? ?? 0) > 0) _Chip('${p['openTasks']} tasks open'),
      if ((p['needsReply'] as num? ?? 0) > 0) _Chip('${p['needsReply']} guest${p['needsReply'] == 1 ? '' : 's'} waiting', strong: true),
    ];
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        // Open that property on Today.
        onTap: () => PropertyScopeProvider.of(context).select(p['propertyId'] as String),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text(p['name'] as String, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700))),
              PaidChip(balance: unpaid, currency: p['currency'] as String? ?? 'USD'),
            ]),
            if (problems > 0) ...[
              const SizedBox(height: 8),
              Row(children: [
                Icon(Icons.error, size: 18, color: scheme.error),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    [
                      if ((p['conflicts'] as num? ?? 0) > 0) '${p['conflicts']} double-booking conflict${p['conflicts'] == 1 ? '' : 's'}',
                      if ((p['syncFailures'] as num? ?? 0) > 0) 'calendar sync failing',
                    ].join(' and '),
                    style: TextStyle(color: scheme.error, fontWeight: FontWeight.w600),
                  ),
                ),
              ]),
            ],
            const SizedBox(height: 10),
            Wrap(spacing: 8, runSpacing: 8, children: chips),
            const SizedBox(height: 4),
            Text('Today ${shortDate(p['today'] as String?)}', style: Theme.of(context).textTheme.labelSmall),
          ]),
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip(this.text, {this.strong = false});
  final String text;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: strong ? scheme.primaryContainer : scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(text, style: TextStyle(color: strong ? scheme.onPrimaryContainer : scheme.onSurface, fontSize: 13)),
    );
  }
}

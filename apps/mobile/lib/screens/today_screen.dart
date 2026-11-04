import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api.dart';
import '../format.dart';
import '../l10n/app_localizations.dart';
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
      // Holidays travel with the dashboard so the Poya notice is there offline too.
      fetch: () async {
        final d = Map<String, dynamic>.from(await services.api.get('/properties/$pid/dashboard') as Map);
        final today = colomboToday();
        final tomorrow = isoDate(colomboNow().add(const Duration(days: 1)));
        try {
          d['holidays'] = await services.api.get('/holidays?from=$today&to=$tomorrow');
        } on ApiException {
          d['holidays'] = const []; // a missing holiday list never breaks Today
        }
        return d;
      },
      builder: (context, data, offline, reload) {
        final d = data as Map<String, dynamic>;
        final l = context.l10n;
        final now = colomboNow();
        final notice = holidayNotice(
          (d['holidays'] as List?) ?? const [],
          isoDate(now),
          isoDate(now.add(const Duration(days: 1))),
        );
        final currency = d['currency'] as String? ?? 'USD';
        List<Map<String, dynamic>> list(String k) => ((d[k] as List?) ?? const []).cast<Map<String, dynamic>>();
        final sync = list('syncHealth');
        final failing = sync.where(_failing).toList();
        final conflicts = list('openConflicts');
        final month = (d['month'] as Map<String, dynamic>?) ?? const {};
        return ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            _Greeting(name: services.store.ownerName),
            if (notice != null) HolidayBanner(notice: notice),
            if (conflicts.isNotEmpty) _Alert(text: l.conflictsAlert(conflicts.length)),
            SyncBanner(sync: sync, failing: failing),
            _Glance(
              arriving: list('arrivalsToday').length,
              leaving: list('departuresToday').length,
              unpaid: list('unpaidBalances').length,
            ),
            const SizedBox(height: 4),
            SectionTitle(l.arrivingToday, count: list('arrivalsToday').length),
            ...list('arrivalsToday').map((b) => _BookingTile(b: b, currency: currency)),
            if (list('arrivalsToday').isEmpty) EmptyNote(l.noArrivals),
            SectionTitle(l.leavingToday, count: list('departuresToday').length),
            ...list('departuresToday').map((b) => _BookingTile(b: b, currency: currency)),
            if (list('departuresToday').isEmpty) EmptyNote(l.noDepartures),
            if (list('pendingApproval').isNotEmpty) ...[
              SectionTitle(l.waitingApproval, count: list('pendingApproval').length),
              ...list('pendingApproval').map((b) => _BookingTile(b: b, currency: currency)),
            ],
            const SizedBox(height: 4),
            SectionTitle(l.unpaidBalances, count: list('unpaidBalances').length),
            ...list('unpaidBalances').map((b) => _BookingTile(b: b, currency: currency)),
            if (list('unpaidBalances').isEmpty) EmptyNote(l.everyonePaid),
            SectionTitle(l.next14Days, count: list('upcomingArrivals').length),
            ...list('upcomingArrivals').take(8).map((b) => _BookingTile(b: b, currency: currency)),
            const SizedBox(height: 4),
            SectionTitle(l.thisMonth),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Wrap(spacing: 8, runSpacing: 8, children: [
                _Stat(l.occupancy, '${month['occupancyPct'] ?? 0}%'),
                _Stat(l.directRevenue, money(month['directRevenue'] as num?, currency)),
                _Stat(l.commissionSaved, money(month['commissionSaved'] as num?, currency)),
              ]),
            ),
            const SizedBox(height: 4),
            SectionTitle(l.calendarSync, count: sync.length),
            ...sync.map((s) {
              final bad = _failing(s);
              final c = StatusColors.of(context);
              return ListTile(
                leading: Icon(bad ? Icons.error : Icons.check_circle, color: bad ? c.bad : c.ok),
                title: Text('${s['roomName']} · ${channelLabel(l, s['channel'] as String?)}'),
                subtitle: Text(bad
                    ? (s['lastError']?.toString() ?? l.syncFailingShort)
                    : (s['lastSuccessAt'] != null ? l.syncedAgo(ago(l, DateTime.parse(s['lastSuccessAt'] as String))) : l.notSyncedYet)),
              );
            }),
            if (sync.isEmpty) EmptyNote(l.noCalendarsConnected),
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
    final l = context.l10n;
    final String text;
    final IconData icon;
    final Color fg;
    if (failing.isNotEmpty) {
      text = l.syncFailing(failing.map((s) => '${s['roomName']} (${channelLabel(l, s['channel'] as String?)})').join(', '));
      icon = Icons.sync_problem;
      fg = c.bad;
    } else if (sync.isNotEmpty) {
      final times = sync.map((s) => s['lastSuccessAt'] as String?).whereType<String>().map(DateTime.parse).toList()..sort();
      text = times.isEmpty ? l.syncPending : l.syncOk(ago(l, times.first));
      icon = Icons.sync;
      fg = c.ok;
    } else {
      text = l.syncNone;
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
    final l = context.l10n;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(child: _GlanceTile(value: '$arriving', label: l.glanceArriving)),
        const SizedBox(width: 8),
        Expanded(child: _GlanceTile(value: '$leaving', label: l.glanceLeaving)),
        const SizedBox(width: 8),
        Expanded(
          child: _GlanceTile(
            value: unpaid == 0 ? l.glanceAllPaid : '$unpaid',
            label: unpaid == 0 ? l.glanceBalances : l.glanceUnpaid,
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
    final l = context.l10n;
    final lang = context.localeTag;
    return Card(
      child: ListTile(
        title: Text('${b['guestName'] ?? l.guestFallback} · ${b['roomName']}'),
        subtitle: Text(
            '${shortDate(b['from'] as String?, lang)} → ${shortDate(b['to'] as String?, lang)} · ${l.guestsCount((b['guests'] as num? ?? 0).toInt())} · ${b['reference']}'),
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

/// Time-of-day greeting in Colombo time, with the owner's first name.
class _Greeting extends StatelessWidget {
  const _Greeting({required this.name});
  final String? name;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final hour = colomboNow().hour;
    final greeting = hour >= 4 && hour < 12
        ? l.greetingMorning
        : hour >= 12 && hour < 17
            ? l.greetingAfternoon
            : l.greetingEvening;
    final first = (name ?? '').trim().split(RegExp(r'\s+')).first;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Text(first.isEmpty ? greeting : l.greetingWithName(greeting, first), style: Theme.of(context).textTheme.headlineSmall),
    );
  }
}

enum HolidayKind { poyaToday, holidayToday, poyaTomorrow }

/// What Today should say about Sri Lankan holidays, if anything.
class HolidayNotice {
  const HolidayNotice(this.kind, this.nameEn, this.nameSi);
  final HolidayKind kind;
  final String nameEn;
  final String nameSi;
}

/// A Poya day today matters most (no alcohol may be sold or served), then any public holiday today,
/// then a Poya day tomorrow, so the owner can stock up and tell guests. [holidays] is the
/// /holidays response: [{date, nameEn, nameSi, isPoya, types}].
HolidayNotice? holidayNotice(List<dynamic> holidays, String today, String tomorrow) {
  final list = holidays.whereType<Map>().map((h) => h.cast<String, dynamic>()).toList();
  HolidayNotice make(HolidayKind k, Map<String, dynamic> h) => HolidayNotice(k, h['nameEn'] as String? ?? '', h['nameSi'] as String? ?? '');
  for (final h in list) {
    if (h['date'] == today && h['isPoya'] == true) return make(HolidayKind.poyaToday, h);
  }
  for (final h in list) {
    if (h['date'] == today) return make(HolidayKind.holidayToday, h);
  }
  for (final h in list) {
    if (h['date'] == tomorrow && h['isPoya'] == true) return make(HolidayKind.poyaTomorrow, h);
  }
  return null;
}

class HolidayBanner extends StatelessWidget {
  const HolidayBanner({super.key, required this.notice});
  final HolidayNotice notice;

  @override
  Widget build(BuildContext context) {
    final AppLocalizations l = context.l10n;
    final scheme = Theme.of(context).colorScheme;
    final name = context.localeTag == 'si' && notice.nameSi.isNotEmpty ? notice.nameSi : notice.nameEn;
    final (title, body) = switch (notice.kind) {
      HolidayKind.poyaToday => (name, l.poyaToday),
      HolidayKind.holidayToday => (l.holidayToday(name), null),
      HolidayKind.poyaTomorrow => (l.poyaTomorrow(name), null),
    };
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: scheme.secondaryContainer,
        borderRadius: BorderRadius.circular(12),
        border: Border(left: BorderSide(color: scheme.secondary, width: 4)),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(notice.kind == HolidayKind.holidayToday ? Icons.event : Icons.brightness_2_outlined, color: scheme.onSecondaryContainer),
        const SizedBox(width: 10),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: TextStyle(color: scheme.onSecondaryContainer, fontWeight: FontWeight.w600)),
            if (body != null) ...[
              const SizedBox(height: 2),
              Text(body, style: TextStyle(color: scheme.onSecondaryContainer)),
            ],
          ]),
        ),
      ]),
    );
  }
}

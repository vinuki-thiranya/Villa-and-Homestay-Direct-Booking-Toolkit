import 'package:flutter/material.dart';

import 'api.dart';
import 'format.dart';
import 'l10n/app_localizations.dart';
import 'store.dart';

/// Shorthand for the app's strings: `context.l10n.paid`.
extension L10nContext on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this);

  /// 'en' or 'si', for intl date formatting.
  String get localeTag => Localizations.localeOf(this).languageCode;
}

/// Load-with-cache scaffold shared by the tabs: pull to refresh, offline banner, error state.
class CachedView extends StatefulWidget {
  const CachedView({
    super.key,
    required this.cacheKey,
    required this.store,
    required this.fetch,
    required this.builder,
    required this.onUnauthorized,
  });

  final String cacheKey;
  final Store store;
  final Future<dynamic> Function() fetch;
  final Widget Function(BuildContext context, dynamic data, bool offline, Future<void> Function() reload) builder;
  final Future<void> Function() onUnauthorized;

  @override
  State<CachedView> createState() => _CachedViewState();
}

class _CachedViewState extends State<CachedView> {
  Cached<dynamic>? _data;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = _data == null);
    try {
      final d = await widget.store.read(widget.cacheKey, widget.fetch);
      if (mounted) {
        setState(() {
          _data = d;
          _error = null;
        });
      }
    } on ApiException catch (e) {
      if (e.isUnauthorized) {
        await widget.onUnauthorized();
        return;
      }
      if (mounted) setState(() => _error = e.status == 0 ? context.l10n.errorNoConnectionNothingSaved : e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading && _data == null) return const Center(child: CircularProgressIndicator());
    if (_data == null) {
      return RefreshIndicator(
        onRefresh: _load,
        child: ListView(children: [
          const SizedBox(height: 120),
          Icon(Icons.cloud_off, size: 48, color: Theme.of(context).colorScheme.outline),
          Padding(padding: const EdgeInsets.all(24), child: Text(_error ?? context.l10n.errorGeneric, textAlign: TextAlign.center)),
        ]),
      );
    }
    final d = _data!;
    return RefreshIndicator(
      onRefresh: _load,
      child: Column(
        children: [
          if (d.offline) OfflineBanner(savedAt: d.fetchedAt),
          Expanded(child: widget.builder(context, d.data, d.offline, _load)),
        ],
      ),
    );
  }
}

class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key, required this.savedAt});
  final DateTime savedAt;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: scheme.tertiaryContainer,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(children: [
          Icon(Icons.cloud_off, size: 18, color: scheme.onTertiaryContainer),
          const SizedBox(width: 8),
          Expanded(
            child: Text(context.l10n.offlineSavedAgo(ago(context.l10n, savedAt)), style: TextStyle(color: scheme.onTertiaryContainer)),
          ),
        ]),
      ),
    );
  }
}

/// Green when paid in full, red when money is still owed (owner app design brief).
/// Paid (green) and owing (red), the same everywhere in the app, tuned per light/dark theme.
@immutable
class StatusColors extends ThemeExtension<StatusColors> {
  const StatusColors({required this.ok, required this.onOk, required this.bad, required this.onBad});
  final Color ok;
  final Color onOk;
  final Color bad;
  final Color onBad;

  static const light = StatusColors(ok: Color(0xFF1B7F3B), onOk: Colors.white, bad: Color(0xFFB3261E), onBad: Colors.white);
  // Dark: lighter fills with dark text keep 4.5:1 without glowing on a black screen.
  static const dark = StatusColors(ok: Color(0xFF6FD08C), onOk: Color(0xFF00210B), bad: Color(0xFFFF8A80), onBad: Color(0xFF410002));

  static StatusColors of(BuildContext context) =>
      Theme.of(context).extension<StatusColors>() ?? (Theme.of(context).brightness == Brightness.dark ? dark : light);

  @override
  StatusColors copyWith({Color? ok, Color? onOk, Color? bad, Color? onBad}) =>
      StatusColors(ok: ok ?? this.ok, onOk: onOk ?? this.onOk, bad: bad ?? this.bad, onBad: onBad ?? this.onBad);

  @override
  StatusColors lerp(StatusColors? other, double t) => other == null
      ? this
      : StatusColors(
          ok: Color.lerp(ok, other.ok, t)!,
          onOk: Color.lerp(onOk, other.onOk, t)!,
          bad: Color.lerp(bad, other.bad, t)!,
          onBad: Color.lerp(onBad, other.onBad, t)!,
        );
}

class PaidChip extends StatelessWidget {
  const PaidChip({super.key, required this.balance, required this.currency});
  final num balance;
  final String currency;

  @override
  Widget build(BuildContext context) {
    final paid = balance <= 0;
    final c = StatusColors.of(context);
    final l = context.l10n;
    return Semantics(
      label: paid ? l.paidInFull : l.balanceDue(money(balance, currency)),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: paid ? c.ok : c.bad, borderRadius: BorderRadius.circular(999)),
        child: Text(paid ? l.paid : l.dueAmount(money(balance, currency)),
            style: TextStyle(color: paid ? c.onOk : c.onBad, fontWeight: FontWeight.w600, fontSize: 12)),
      ),
    );
  }
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.text, {super.key, this.count});
  final String text;
  final int? count;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 6),
      child: Text(count == null ? text : '$text ($count)', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
    );
  }
}

class EmptyNote extends StatelessWidget {
  const EmptyNote(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Text(text, style: TextStyle(color: Theme.of(context).colorScheme.outline)),
    );
  }
}

void showSnack(BuildContext context, String text) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
}

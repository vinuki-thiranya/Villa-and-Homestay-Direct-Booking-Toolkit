import 'package:flutter/material.dart';

import '../api.dart';
import '../main.dart';
import '../property_scope.dart';
import '../sinhala.dart';
import '../widgets.dart';
import 'inbox_screen.dart';
import 'portfolio_screen.dart';
import 'tasks_screen.dart';
import 'today_screen.dart';

/// One-thumb navigation: Today, Tasks, Inbox along the bottom; the property switcher in the app bar.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key, required this.services, required this.onSignOut});
  final AppServices services;
  final Future<void> Function() onSignOut;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _tab = 0;
  late final PropertyScope _scope = PropertyScope(widget.services.store);

  @override
  void initState() {
    super.initState();
    _loadProperties();
    // Adopt the language saved on the account (set on the web, say), or send a change made offline.
    widget.services.locale.syncWithServer(widget.services.api);
  }

  @override
  void dispose() {
    _scope.dispose();
    super.dispose();
  }

  Future<void> _loadProperties() async {
    try {
      // RLS already limits a manager to the properties they may see.
      final r = await widget.services.store.read('properties', () => widget.services.api.get('/properties'));
      final list = (r.data as List).cast<Map<String, dynamic>>().map((p) => PropertyRef(p['id'] as String, p['name'] as String)).toList();
      _scope.setProperties(list);
    } on ApiException catch (e) {
      if (e.isUnauthorized) await widget.onSignOut();
    }
  }

  Future<void> _pickProperty() async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            if (_scope.isMulti)
              ListTile(
                minTileHeight: 56,
                leading: const Icon(Icons.dashboard_outlined),
                title: Text(context.l10n.allProperties),
                selected: _scope.showAll,
                onTap: () {
                  _scope.selectAll();
                  setState(() => _tab = 0); // the all-properties view lives on Today
                  Navigator.pop(context);
                },
              ),
            for (final p in _scope.properties)
              ListTile(
                minTileHeight: 56,
                leading: const Icon(Icons.villa_outlined),
                title: Text(p.name),
                selected: !_scope.showAll && p.id == _scope.currentId,
                onTap: () {
                  _scope.select(p.id);
                  Navigator.pop(context);
                },
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PropertyScopeProvider(
      scope: _scope,
      child: ListenableBuilder(
        listenable: _scope,
        builder: (context, _) {
          final l = context.l10n;
          _scope.allLabel = l.allProperties;
          final pid = _scope.currentId;
          final locale = widget.services.locale;
          final pages = [
            _scope.showAll
                ? PortfolioScreen(services: widget.services, onUnauthorized: widget.onSignOut)
                : TodayScreen(key: ValueKey('today:$pid'), services: widget.services, propertyId: pid, onUnauthorized: widget.onSignOut),
            TasksScreen(key: ValueKey('tasks:$pid'), services: widget.services, propertyId: pid, onUnauthorized: widget.onSignOut),
            InboxScreen(key: ValueKey('inbox:$pid'), services: widget.services, propertyId: pid, onUnauthorized: widget.onSignOut),
          ];
          return Scaffold(
            appBar: AppBar(
              titleSpacing: 8,
              title: _scope.isMulti
                  ? Semantics(
                      button: true,
                      label: l.switchPropertyCurrent(_scope.currentName),
                      child: TextButton.icon(
                        style: TextButton.styleFrom(minimumSize: const Size(48, 48), alignment: Alignment.centerLeft),
                        onPressed: _pickProperty,
                        iconAlignment: IconAlignment.end,
                        icon: const Icon(Icons.expand_more),
                        label: Text(_scope.currentName, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.titleLarge),
                      ),
                    )
                  : Text(_scope.currentName),
              // The vine-scroll band under the app bar, in Sinhala only.
              bottom: locale.isSinhala ? const LiyawelaBand() : null,
              actions: [
                PopupMenuButton<String>(
                  tooltip: l.account,
                  onSelected: (v) {
                    if (v == 'out') widget.onSignOut();
                    if (v == 'lang') locale.setLanguage(locale.isSinhala ? 'en' : 'si', api: widget.services.api);
                  },
                  itemBuilder: (_) => [
                    PopupMenuItem(enabled: false, child: Text(widget.services.store.ownerName ?? '')),
                    // Named in the language it switches to, so either reader finds it.
                    PopupMenuItem(
                      value: 'lang',
                      child: ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(Icons.translate),
                        title: Text(locale.isSinhala ? l.languageEnglish : l.languageSinhala),
                        subtitle: Text(l.language),
                      ),
                    ),
                    PopupMenuItem(value: 'out', child: Text(l.signOut)),
                  ],
                ),
              ],
            ),
            body: IndexedStack(index: _tab, children: pages),
            bottomNavigationBar: NavigationBar(
              selectedIndex: _tab,
              onDestinationSelected: (i) => setState(() => _tab = i),
              destinations: [
                NavigationDestination(icon: const Icon(Icons.today_outlined), selectedIcon: const Icon(Icons.today), label: l.navToday),
                NavigationDestination(icon: const Icon(Icons.checklist_outlined), selectedIcon: const Icon(Icons.checklist), label: l.navTasks),
                NavigationDestination(icon: const Icon(Icons.chat_bubble_outline), selectedIcon: const Icon(Icons.chat_bubble), label: l.navInbox),
              ],
            ),
          );
        },
      ),
    );
  }
}

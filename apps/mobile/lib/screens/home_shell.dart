import 'package:flutter/material.dart';

import '../main.dart';
import 'inbox_screen.dart';
import 'tasks_screen.dart';
import 'today_screen.dart';

/// One-thumb navigation: Today, Tasks, Inbox along the bottom.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key, required this.services, required this.onSignOut});
  final AppServices services;
  final Future<void> Function() onSignOut;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      TodayScreen(services: widget.services, onUnauthorized: widget.onSignOut),
      TasksScreen(services: widget.services, onUnauthorized: widget.onSignOut),
      InboxScreen(services: widget.services, onUnauthorized: widget.onSignOut),
    ];
    return Scaffold(
      appBar: AppBar(
        title: Text(const ['Today', 'Tasks', 'Inbox'][_tab]),
        actions: [
          PopupMenuButton<String>(
            onSelected: (v) {
              if (v == 'out') widget.onSignOut();
            },
            itemBuilder: (_) => [
              PopupMenuItem(enabled: false, child: Text(widget.services.store.ownerName ?? '')),
              const PopupMenuItem(value: 'out', child: Text('Sign out')),
            ],
          ),
        ],
      ),
      body: IndexedStack(index: _tab, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.today_outlined), selectedIcon: Icon(Icons.today), label: 'Today'),
          NavigationDestination(icon: Icon(Icons.checklist_outlined), selectedIcon: Icon(Icons.checklist), label: 'Tasks'),
          NavigationDestination(icon: Icon(Icons.chat_bubble_outline), selectedIcon: Icon(Icons.chat_bubble), label: 'Inbox'),
        ],
      ),
    );
  }
}

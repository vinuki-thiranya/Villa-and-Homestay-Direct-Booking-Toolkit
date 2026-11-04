import 'package:flutter/material.dart';

import '../format.dart';
import '../main.dart';
import '../widgets.dart';
import 'thread_screen.dart';

/// WhatsApp inbox (spec §3.4): conversations needing a human first.
class InboxScreen extends StatelessWidget {
  const InboxScreen({super.key, required this.services, required this.propertyId, required this.onUnauthorized});
  final AppServices services;
  final String propertyId;
  final Future<void> Function() onUnauthorized;

  @override
  Widget build(BuildContext context) {
    final pid = propertyId;
    return CachedView(
      cacheKey: 'conversations:$pid',
      store: services.store,
      onUnauthorized: onUnauthorized,
      fetch: () => services.api.get('/properties/$pid/conversations'),
      builder: (context, data, offline, reload) {
        final convs = (data as List).cast<Map<String, dynamic>>();
        if (convs.isEmpty) {
          return ListView(children: [const SizedBox(height: 80), EmptyNote(context.l10n.noConversations)]);
        }
        return ListView.separated(
          itemCount: convs.length,
          separatorBuilder: (_, _) => const Divider(height: 1),
          itemBuilder: (context, i) {
            final c = convs[i];
            final needsHuman = c['status'] == 'needs_human';
            final unread = (c['unreadCount'] as num?)?.toInt() ?? 0;
            final last = c['lastMessageAt'] as String?;
            return ListTile(
              leading: CircleAvatar(child: Text(_initials(c['contactName'] as String? ?? c['contact'] as String? ?? '?'))),
              title: Row(children: [
                Expanded(child: Text((c['contactName'] as String?)?.isNotEmpty == true ? c['contactName'] as String : c['contact'] as String)),
                if (last != null) Text(ago(context.l10n, DateTime.parse(last)), style: Theme.of(context).textTheme.labelSmall),
              ]),
              subtitle: Text(
                needsHuman ? context.l10n.needsYou('${c['escalationSummary'] ?? ''}') : (c['lastMessage'] as String? ?? ''),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: needsHuman ? TextStyle(color: Theme.of(context).colorScheme.error, fontWeight: FontWeight.w600) : null,
              ),
              trailing: unread > 0 ? Badge(label: Text('$unread')) : null,
              onTap: () async {
                await Navigator.of(context).push(MaterialPageRoute<void>(
                  builder: (_) => ThreadScreen(services: services, conversationId: c['id'] as String, onUnauthorized: onUnauthorized),
                ));
                await reload();
              },
            );
          },
        );
      },
    );
  }
}

String _initials(String name) {
  final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
  if (parts.isEmpty) return '?';
  return (parts.first[0] + (parts.length > 1 ? parts.last[0] : '')).toUpperCase();
}

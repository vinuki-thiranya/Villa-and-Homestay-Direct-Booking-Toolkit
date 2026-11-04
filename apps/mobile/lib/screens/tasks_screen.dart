import 'package:flutter/material.dart';

import '../api.dart';
import '../format.dart';
import '../main.dart';
import '../widgets.dart';

const _typeIcons = {
  'clean': Icons.cleaning_services_outlined,
  'prepare': Icons.bed_outlined,
  'maintenance': Icons.build_outlined,
  'shopping': Icons.shopping_basket_outlined,
};

/// Today's task board (spec §3.6). Tick a task to mark it done; offline the list is read-only.
class TasksScreen extends StatelessWidget {
  const TasksScreen({super.key, required this.services, required this.propertyId, required this.onUnauthorized});
  final AppServices services;
  final String propertyId;
  final Future<void> Function() onUnauthorized;

  @override
  Widget build(BuildContext context) {
    final pid = propertyId;
    final today = isoDate(DateTime.now());
    return CachedView(
      cacheKey: 'tasks:$pid:$today',
      store: services.store,
      onUnauthorized: onUnauthorized,
      fetch: () => services.api.get('/properties/$pid/tasks?from=$today&to=$today'),
      builder: (context, data, offline, reload) {
        final tasks = (data as List).cast<Map<String, dynamic>>();
        final open = tasks.where((t) => t['status'] != 'done' && t['status'] != 'skipped').toList();
        final done = tasks.where((t) => t['status'] == 'done' || t['status'] == 'skipped').toList();
        return ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            SectionTitle('To do', count: open.length),
            if (open.isEmpty) const EmptyNote('All done for today.'),
            ...open.map((t) => _TaskTile(task: t, enabled: !offline, services: services, onChanged: reload)),
            if (done.isNotEmpty) ...[
              SectionTitle('Done', count: done.length),
              ...done.map((t) => _TaskTile(task: t, enabled: !offline, services: services, onChanged: reload)),
            ],
          ],
        );
      },
    );
  }
}

class _TaskTile extends StatefulWidget {
  const _TaskTile({required this.task, required this.enabled, required this.services, required this.onChanged});
  final Map<String, dynamic> task;
  final bool enabled;
  final AppServices services;
  final Future<void> Function() onChanged;

  @override
  State<_TaskTile> createState() => _TaskTileState();
}

class _TaskTileState extends State<_TaskTile> {
  bool _busy = false;

  Future<void> _toggle(bool done) async {
    setState(() => _busy = true);
    try {
      await widget.services.api.patch('/tasks/${widget.task['id']}', {'status': done ? 'done' : 'todo'});
      await widget.onChanged();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.status == 0 ? 'No connection — try again when online.' : e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.task;
    final done = t['status'] == 'done';
    final photos = (t['photos'] as List?)?.length ?? 0;
    return Card(
      child: CheckboxListTile(
        value: done,
        onChanged: widget.enabled && !_busy ? (v) => _toggle(v ?? false) : null,
        secondary: Icon(_typeIcons[t['type']] ?? Icons.task_alt),
        title: Text(t['title'] as String? ?? '', style: done ? const TextStyle(decoration: TextDecoration.lineThrough) : null),
        subtitle: Text([
          if (t['assigneeName'] != null) t['assigneeName'],
          if ((t['notes'] as String? ?? '').isNotEmpty) t['notes'],
          if (photos > 0) '$photos photo${photos == 1 ? '' : 's'}',
          if (t['cost'] != null) 'cost ${t['cost']}',
        ].join(' · ')),
      ),
    );
  }
}

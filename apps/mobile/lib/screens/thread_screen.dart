import 'package:flutter/material.dart';

import '../api.dart';
import '../format.dart';
import '../main.dart';
import '../widgets.dart';

/// One WhatsApp conversation: messages, quick replies in the guest's language, AI pause, resolve.
class ThreadScreen extends StatefulWidget {
  const ThreadScreen({super.key, required this.services, required this.conversationId, required this.onUnauthorized});
  final AppServices services;
  final String conversationId;
  final Future<void> Function() onUnauthorized;

  @override
  State<ThreadScreen> createState() => _ThreadScreenState();
}

class _ThreadScreenState extends State<ThreadScreen> {
  final _text = TextEditingController();
  Map<String, dynamic>? _conv;
  List<Map<String, dynamic>> _messages = const [];
  bool _offline = false;
  DateTime? _savedAt;
  bool _sending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final r = await widget.services.store.read('thread:${widget.conversationId}', () => widget.services.api.get('/conversations/${widget.conversationId}'));
      final d = r.data as Map<String, dynamic>;
      setState(() {
        _conv = d['conversation'] as Map<String, dynamic>;
        _messages = (d['messages'] as List).cast<Map<String, dynamic>>();
        _offline = r.offline;
        _savedAt = r.fetchedAt;
        _error = null;
      });
    } on ApiException catch (e) {
      if (e.isUnauthorized) return widget.onUnauthorized();
      setState(() => _error = e.message);
    }
  }

  Future<void> _send() async {
    final body = _text.text.trim();
    if (body.isEmpty) return;
    setState(() => _sending = true);
    try {
      await widget.services.api.post('/conversations/${widget.conversationId}/messages', {'body': body});
      _text.clear();
      await _load();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.status == 0 ? 'No connection — message not sent.' : e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _update(Map<String, Object> patch, String done) async {
    try {
      await widget.services.api.patch('/conversations/${widget.conversationId}', patch);
      await _load();
      if (mounted) showSnack(context, done);
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
    }
  }

  Future<void> _pickQuickReply() async {
    final pid = widget.services.store.propertyId!;
    final lang = _conv?['language'] as String? ?? 'en';
    List<Map<String, dynamic>> replies;
    try {
      final r = await widget.services.store.read('quick:$pid:$lang', () => widget.services.api.get('/properties/$pid/quick-replies?language=$lang'));
      replies = (r.data as List).cast<Map<String, dynamic>>();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
      return;
    }
    if (!mounted) return;
    final picked = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.6,
        builder: (context, controller) => replies.isEmpty
            ? const Center(child: Text('No quick replies yet — load the defaults on the web.'))
            : ListView.builder(
                controller: controller,
                itemCount: replies.length,
                itemBuilder: (context, i) => ListTile(
                  title: Text(replies[i]['title'] as String),
                  subtitle: Text(replies[i]['body'] as String, maxLines: 2, overflow: TextOverflow.ellipsis),
                  onTap: () => Navigator.pop(context, replies[i]['body'] as String),
                ),
              ),
      ),
    );
    if (picked != null) _text.text = picked;
  }

  @override
  Widget build(BuildContext context) {
    final c = _conv;
    final windowOpen = c?['windowOpen'] == true;
    final aiPaused = c?['aiPaused'] == true;
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: Text(c == null ? '' : ((c['contactName'] as String?)?.isNotEmpty == true ? c['contactName'] as String : c['contact'] as String)),
        actions: [
          if (c != null && !_offline)
            PopupMenuButton<String>(
              onSelected: (v) {
                if (v == 'ai') _update({'aiPaused': !aiPaused}, aiPaused ? 'AI concierge resumed' : 'AI concierge paused');
                if (v == 'resolve') _update({'status': 'closed'}, 'Conversation closed');
                if (v == 'reopen') _update({'status': 'open', 'aiPaused': false}, 'Handed back to the concierge');
              },
              itemBuilder: (_) => [
                PopupMenuItem(value: 'ai', child: Text(aiPaused ? 'Resume AI concierge' : 'Pause AI concierge')),
                if (c['status'] == 'needs_human') const PopupMenuItem(value: 'reopen', child: Text('Done — hand back to AI')),
                const PopupMenuItem(value: 'resolve', child: Text('Close conversation')),
              ],
            ),
        ],
      ),
      body: Column(
        children: [
          if (_offline && _savedAt != null) OfflineBanner(savedAt: _savedAt!),
          if (c?['status'] == 'needs_human')
            Material(
              color: scheme.errorContainer,
              child: ListTile(
                leading: Icon(Icons.support_agent, color: scheme.onErrorContainer),
                title: Text(c?['escalationSummary'] as String? ?? 'The guest needs you.', style: TextStyle(color: scheme.onErrorContainer)),
              ),
            ),
          if (_error != null) Padding(padding: const EdgeInsets.all(16), child: Text(_error!)),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _load,
              child: ListView.builder(
                reverse: true,
                padding: const EdgeInsets.all(12),
                itemCount: _messages.length,
                itemBuilder: (context, i) => _Bubble(m: _messages[_messages.length - 1 - i]),
              ),
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(8, 4, 8, 8),
              child: windowOpen && !_offline
                  ? Row(children: [
                      IconButton(tooltip: 'Quick replies', icon: const Icon(Icons.bolt), onPressed: _pickQuickReply),
                      Expanded(
                        child: TextField(
                          controller: _text,
                          minLines: 1,
                          maxLines: 5,
                          textCapitalization: TextCapitalization.sentences,
                          decoration: const InputDecoration(hintText: 'Message', isDense: true),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton.filled(tooltip: 'Send', onPressed: _sending ? null : _send, icon: const Icon(Icons.send)),
                    ])
                  : Padding(
                      padding: const EdgeInsets.all(8),
                      child: Text(
                        _offline
                            ? 'You are offline. Messages can be sent when you are back online.'
                            : 'The 24-hour WhatsApp window is closed. You can reply once the guest writes again.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: scheme.outline),
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.m});
  final Map<String, dynamic> m;

  @override
  Widget build(BuildContext context) {
    final inbound = m['direction'] == 'in';
    final ai = m['aiGenerated'] == true;
    final scheme = Theme.of(context).colorScheme;
    final at = m['createdAt'] as String?;
    return Align(
      alignment: inbound ? Alignment.centerLeft : Alignment.centerRight,
      child: Container(
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: inbound ? scheme.surfaceContainerHighest : (ai ? scheme.secondaryContainer : scheme.primaryContainer),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(m['body'] as String? ?? ''),
          const SizedBox(height: 2),
          Text(
            [if (ai) 'AI concierge', if (at != null) ago(DateTime.parse(at)), if (!inbound) (m['status'] as String? ?? '')].join(' · '),
            style: Theme.of(context).textTheme.labelSmall,
          ),
        ]),
      ),
    );
  }
}

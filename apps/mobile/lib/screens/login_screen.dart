import 'package:flutter/material.dart';

import '../api.dart';
import '../main.dart';

/// Phone-OTP login (spec §5): phone number → 6-digit code by SMS.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.services, required this.onSignedIn});
  final AppServices services;
  final VoidCallback onSignedIn;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phone = TextEditingController();
  final _code = TextEditingController();
  bool _codeSent = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _phone.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
    } on ApiException catch (e) {
      setState(() => _error = e.status == 0 ? 'No connection. Check your internet and try again.' : e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _sendCode() => _run(() async {
        await widget.services.api.post('/auth/otp/request', {'phone': _phone.text.trim()});
        setState(() => _codeSent = true);
      });

  Future<void> _verify() => _run(() async {
        final api = widget.services.api;
        final res = await api.post('/auth/otp/verify', {'phone': _phone.text.trim(), 'code': _code.text.trim()}) as Map<String, dynamic>;
        api.token = res['token'] as String;
        final properties = await api.get('/properties') as List<dynamic>;
        if (properties.isEmpty) {
          api.token = null;
          throw ApiException(400, 'Set up your property on the web first, then sign in here.');
        }
        final store = widget.services.store;
        await store.saveSession(token: api.token!, name: (res['user'] as Map<String, dynamic>)['name'] as String? ?? '');
        await store.setProperty((properties.first as Map<String, dynamic>)['id'] as String);
        widget.onSignedIn();
      });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('StayDirect', style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text('Your bookings, tasks and guests — today first.', style: theme.textTheme.bodyLarge),
                  const SizedBox(height: 32),
                  TextField(
                    controller: _phone,
                    enabled: !_codeSent && !_busy,
                    keyboardType: TextInputType.phone,
                    autofillHints: const [AutofillHints.telephoneNumber],
                    decoration: const InputDecoration(labelText: 'Mobile number', hintText: '077 123 4567'),
                  ),
                  if (_codeSent) ...[
                    const SizedBox(height: 16),
                    TextField(
                      controller: _code,
                      enabled: !_busy,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      autofillHints: const [AutofillHints.oneTimeCode],
                      decoration: const InputDecoration(labelText: '6-digit code from SMS'),
                    ),
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 8),
                    Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
                  ],
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _busy ? null : (_codeSent ? _verify : _sendCode),
                    style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                    child: Text(_busy ? 'Please wait…' : (_codeSent ? 'Sign in' : 'Send code')),
                  ),
                  if (_codeSent)
                    TextButton(
                      onPressed: _busy ? null : () => setState(() => _codeSent = false),
                      child: const Text('Use a different number'),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

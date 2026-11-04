import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api.dart';

/// The owner app's language (English or Sinhala). Saved on the device so the app starts in it
/// offline, and on the user account (PATCH /auth/me) so the web app follows. A change made offline
/// (or on the login screen, before there is an account to save it to) is sent on the next sync.
class LocaleController extends ChangeNotifier {
  LocaleController(this._prefs) : _lang = _valid(_prefs.getString(_key)) ?? 'en';

  static const _key = 'lang';
  static const _pendingKey = 'langPendingSync';
  static const supported = ['en', 'si'];

  final SharedPreferences _prefs;
  String _lang;

  String get lang => _lang;
  Locale get locale => Locale(_lang);
  bool get isSinhala => _lang == 'si';

  static String? _valid(Object? v) => v is String && supported.contains(v) ? v : null;

  /// Switch now; save on the device; try the account. Never throws: offline is retried later.
  Future<void> setLanguage(String lang, {ApiClient? api}) async {
    if (_valid(lang) == null) return;
    if (lang != _lang) {
      _lang = lang;
      notifyListeners();
    }
    await _prefs.setString(_key, lang);
    await _prefs.setBool(_pendingKey, true);
    if (api?.token != null) await _push(api!);
  }

  /// After sign-in and on start: a change the account has not heard about yet wins; otherwise the
  /// account's language (set on the web, say) is adopted.
  Future<void> syncWithServer(ApiClient api) async {
    if (api.token == null) return;
    if (_prefs.getBool(_pendingKey) ?? false) {
      await _push(api);
      return;
    }
    try {
      final me = await api.get('/auth/me') as Map<String, dynamic>;
      final server = _valid((me['user'] as Map<String, dynamic>?)?['language']);
      if (server != null && server != _lang) {
        _lang = server;
        await _prefs.setString(_key, server);
        notifyListeners();
      }
    } on ApiException {
      // offline or signed out: keep the device setting
    }
  }

  Future<void> _push(ApiClient api) async {
    try {
      await api.patch('/auth/me', {'language': _lang});
      await _prefs.setBool(_pendingKey, false);
    } on ApiException {
      // stays pending; sent on the next start
    }
  }

  /// Sign-out clears the session but the device keeps its language.
  Future<void> restoreAfterClear() async {
    await _prefs.setString(_key, _lang);
  }
}

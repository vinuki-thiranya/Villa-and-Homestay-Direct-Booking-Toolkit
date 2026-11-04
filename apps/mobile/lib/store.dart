import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'api.dart';

/// Result of a cached read: the data, when it was fetched, and whether it came from the cache
/// because the network was unavailable.
class Cached<T> {
  Cached(this.data, this.fetchedAt, {this.offline = false});
  final T data;
  final DateTime fetchedAt;
  final bool offline;
}

/// Session and offline cache on the device (spec §3.12: today's arrivals and tasks viewable offline).
class Store {
  Store(this._prefs);
  final SharedPreferences _prefs;

  static Future<Store> open() async => Store(await SharedPreferences.getInstance());

  String? get token => _prefs.getString('token');
  String? get propertyId => _prefs.getString('propertyId');
  String? get ownerName => _prefs.getString('ownerName');

  Future<void> saveSession({required String token, required String name}) async {
    await _prefs.setString('token', token);
    await _prefs.setString('ownerName', name);
  }

  Future<void> setProperty(String id) => _prefs.setString('propertyId', id);

  Future<void> clear() => _prefs.clear();

  /// Fetch from the network and remember the result; on a connection failure return the last copy.
  Future<Cached<dynamic>> read(String key, Future<dynamic> Function() fetch) async {
    try {
      final data = await fetch();
      final now = DateTime.now();
      await _prefs.setString('cache:$key', jsonEncode({'at': now.toIso8601String(), 'data': data}));
      return Cached(data, now);
    } on ApiException catch (e) {
      if (e.status != 0) rethrow;
      final raw = _prefs.getString('cache:$key');
      if (raw == null) rethrow;
      final saved = jsonDecode(raw) as Map<String, dynamic>;
      return Cached(saved['data'], DateTime.parse(saved['at'] as String), offline: true);
    }
  }
}

import 'dart:convert';

import 'package:http/http.dart' as http;

/// Base URL of the StayDirect API. Override at build time:
/// flutter run --dart-define=API_URL=https://api.staydirect.lk
const String apiBaseUrl = String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:4000');

class ApiException implements Exception {
  ApiException(this.status, this.message);
  final int status;
  final String message;

  bool get isUnauthorized => status == 401;

  @override
  String toString() => message;
}

/// Thin JSON client for the owner API. Network failures surface as [ApiException] with status 0,
/// which the offline cache treats as "show what we have".
class ApiClient {
  ApiClient({this.token, http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        _base = (baseUrl ?? apiBaseUrl).replaceAll(RegExp(r'/$'), '');

  final http.Client _client;
  final String _base;
  String? token;

  Future<dynamic> get(String path) => _send('GET', path);
  Future<dynamic> post(String path, [Object? body]) => _send('POST', path, body);
  Future<dynamic> patch(String path, Object body) => _send('PATCH', path, body);

  Future<dynamic> _send(String method, String path, [Object? body]) async {
    final request = http.Request(method, Uri.parse('$_base$path'));
    request.headers['accept'] = 'application/json';
    if (token != null) request.headers['authorization'] = 'Bearer $token';
    if (body != null) {
      request.headers['content-type'] = 'application/json';
      request.body = jsonEncode(body);
    }
    http.Response res;
    try {
      res = await http.Response.fromStream(await _client.send(request).timeout(const Duration(seconds: 15)));
    } catch (_) {
      throw ApiException(0, 'No connection');
    }
    final text = res.body;
    final decoded = text.isEmpty ? null : jsonDecode(text);
    if (res.statusCode >= 400) {
      final msg = decoded is Map && decoded['message'] != null ? decoded['message'].toString() : 'Request failed (${res.statusCode})';
      throw ApiException(res.statusCode, msg);
    }
    return decoded;
  }
}

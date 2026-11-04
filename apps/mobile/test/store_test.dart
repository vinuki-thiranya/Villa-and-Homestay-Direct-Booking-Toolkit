import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:staydirect_owner/api.dart';
import 'package:staydirect_owner/store.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('serves the last saved copy when the network is down (offline viewing)', () async {
    final store = await Store.open();
    final fresh = await store.read('dashboard:p1', () async => {'arrivals': 2});
    expect(fresh.offline, isFalse);

    final offline = await store.read('dashboard:p1', () async => throw ApiException(0, 'No connection'));
    expect(offline.offline, isTrue);
    expect(offline.data, {'arrivals': 2});
  });

  test('server errors are not hidden by the cache', () async {
    final store = await Store.open();
    await store.read('k', () async => [1]);
    expect(() => store.read('k', () async => throw ApiException(401, 'Invalid token')), throwsA(isA<ApiException>()));
  });

  test('nothing saved and offline is an error', () async {
    final store = await Store.open();
    expect(() => store.read('never', () async => throw ApiException(0, 'No connection')), throwsA(isA<ApiException>()));
  });
}

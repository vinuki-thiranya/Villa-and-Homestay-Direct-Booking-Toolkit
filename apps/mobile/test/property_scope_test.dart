import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:staydirect_owner/property_scope.dart';
import 'package:staydirect_owner/store.dart';

void main() {
  test('switching properties remembers the choice; All only applies with several properties', () async {
    SharedPreferences.setMockInitialValues({'propertyId': 'gone'});
    final store = await Store.open();
    final scope = PropertyScope(store);
    scope.setProperties(const [PropertyRef('a', 'Tangalle Beach House'), PropertyRef('b', 'Weligama Surf Lodge')]);
    expect(scope.currentId, 'a'); // a stale saved id falls back to the first property
    scope.select('b');
    expect(store.propertyId, 'b');
    scope.selectAll();
    expect(scope.currentName, 'All properties');
    expect(scope.currentId, 'b'); // Tasks/Inbox keep the last property
    scope.setProperties(const [PropertyRef('b', 'Weligama Surf Lodge')]);
    expect(scope.showAll, isFalse);
    expect(scope.isMulti, isFalse);
  });
}

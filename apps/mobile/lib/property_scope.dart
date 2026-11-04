import 'package:flutter/widgets.dart';

import 'store.dart';

class PropertyRef {
  const PropertyRef(this.id, this.name);
  final String id;
  final String name;
}

/// Which property the owner is looking at, shared by every tab (multi-property owners and
/// caretaker companies, spec §3.9 R3). `showAll` switches Today to the all-properties view;
/// Tasks and Inbox always work on one property, the last one picked.
class PropertyScope extends ChangeNotifier {
  PropertyScope(this._store) : _currentId = _store.propertyId;

  final Store _store;
  List<PropertyRef> properties = const [];
  String? _currentId;
  bool showAll = false;

  String get currentId => _currentId ?? (properties.isNotEmpty ? properties.first.id : '');
  bool get isMulti => properties.length > 1;

  String get currentName {
    if (showAll) return 'All properties';
    for (final p in properties) {
      if (p.id == currentId) return p.name;
    }
    return 'StayDirect';
  }

  void setProperties(List<PropertyRef> list) {
    properties = list;
    if (list.isNotEmpty && !list.any((p) => p.id == _currentId)) {
      _currentId = list.first.id;
      _store.setProperty(_currentId!);
    }
    if (list.length < 2) showAll = false;
    notifyListeners();
  }

  void select(String id) {
    _currentId = id;
    showAll = false;
    _store.setProperty(id);
    notifyListeners();
  }

  void selectAll() {
    showAll = true;
    notifyListeners();
  }
}

class PropertyScopeProvider extends InheritedNotifier<PropertyScope> {
  const PropertyScopeProvider({super.key, required PropertyScope scope, required super.child}) : super(notifier: scope);

  static PropertyScope of(BuildContext context) {
    final p = context.dependOnInheritedWidgetOfExactType<PropertyScopeProvider>();
    assert(p != null, 'PropertyScopeProvider missing');
    return p!.notifier!;
  }
}

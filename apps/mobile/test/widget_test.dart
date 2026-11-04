import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:staydirect_owner/api.dart';
import 'package:staydirect_owner/main.dart';
import 'package:staydirect_owner/store.dart';
import 'package:staydirect_owner/widgets.dart';

void main() {
  testWidgets('signed-out users see the phone login', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final store = await Store.open();
    await tester.pumpWidget(StayDirectApp(store: store, api: ApiClient(baseUrl: 'http://localhost:1')));
    expect(find.text('Mobile number'), findsOneWidget);
    expect(find.text('Send code'), findsOneWidget);
  });

  testWidgets('paid chip is green when paid and red when money is owed', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(body: Column(children: [PaidChip(balance: 0, currency: 'USD'), PaidChip(balance: 120, currency: 'USD')])),
    ));
    expect(find.text('Paid'), findsOneWidget);
    expect(find.text('Due USD 120.00'), findsOneWidget);
  });
}

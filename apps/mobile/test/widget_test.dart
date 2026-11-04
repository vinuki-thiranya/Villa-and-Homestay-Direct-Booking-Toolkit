import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:staydirect_owner/api.dart';
import 'package:staydirect_owner/main.dart';
import 'package:staydirect_owner/screens/today_screen.dart';
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

  testWidgets('dark theme keeps paid/owing chips readable', (tester) async {
    await tester.pumpWidget(MaterialApp(
      theme: ThemeData(brightness: Brightness.dark, extensions: const [StatusColors.dark]),
      home: const Scaffold(body: PaidChip(balance: 50, currency: 'USD')),
    ));
    final text = tester.widget<Text>(find.text('Due USD 50.00'));
    expect(text.style?.color, StatusColors.dark.onBad);
  });

  testWidgets('sync banner names failing calendars and reports healthy ones', (tester) async {
    Future<void> pump(List<Map<String, dynamic>> sync) => tester.pumpWidget(MaterialApp(
          home: Scaffold(body: SyncBanner(sync: sync, failing: sync.where((s) => s['consecutiveFailures'] as int > 0).toList())),
        ));
    await pump([
      {'roomName': 'Garden Room', 'channel': 'airbnb', 'consecutiveFailures': 2, 'lastSuccessAt': null},
    ]);
    expect(find.text('Calendar sync failing: Garden Room (Airbnb)'), findsOneWidget);
    await pump([]);
    expect(find.text('No Airbnb or Booking.com calendars connected'), findsOneWidget);
    await pump([
      {'roomName': 'Garden Room', 'channel': 'airbnb', 'consecutiveFailures': 0, 'lastSuccessAt': DateTime.now().subtract(const Duration(minutes: 5)).toIso8601String()},
    ]);
    expect(find.textContaining('Calendars in sync'), findsOneWidget);
  });
}

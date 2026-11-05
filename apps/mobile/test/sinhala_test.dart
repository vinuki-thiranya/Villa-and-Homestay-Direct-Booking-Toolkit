import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:staydirect_owner/api.dart';
import 'package:staydirect_owner/format.dart';
import 'package:staydirect_owner/l10n/app_localizations.dart';
import 'package:staydirect_owner/locale.dart';
import 'package:staydirect_owner/main.dart';
import 'package:staydirect_owner/screens/today_screen.dart';
import 'package:staydirect_owner/store.dart';

Map<String, dynamic> _dashboard() => {
      'currency': 'USD',
      'arrivalsToday': [
        {'guestName': 'Anna Schmidt', 'roomName': 'Ocean Suite', 'from': '2026-11-24', 'to': '2026-11-27', 'guests': 2, 'reference': 'SD-DEMO1', 'balance': 0},
      ],
      'departuresToday': [],
      'unpaidBalances': [
        {'guestName': 'Rahul Mehta', 'roomName': 'Garden Double', 'from': '2026-11-22', 'to': '2026-11-26', 'guests': 2, 'reference': 'SD-DEMO2', 'balance': 120},
      ],
      'upcomingArrivals': [],
      'pendingApproval': [],
      'syncHealth': [],
      'openConflicts': [],
      'month': {'occupancyPct': 64, 'directRevenue': 4200, 'commissionSaved': 630},
    };

void main() {
  testWidgets('Today in Sinhala at 375 px: Sinhala text, Poya notice, nothing overflows', (tester) async {
    tester.view.physicalSize = const Size(375 * 3, 812 * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    SharedPreferences.setMockInitialValues({'ownerName': 'Nimali Perera'});
    final store = await Store.open();
    final today = colomboToday();
    final client = MockClient((req) async {
      if (req.url.path.endsWith('/dashboard')) return http.Response(jsonEncode(_dashboard()), 200);
      if (req.url.path == '/holidays') {
        return http.Response(
            jsonEncode([
              {'date': today, 'nameEn': 'Il Full Moon Poya Day', 'nameSi': 'ඉල් පුර පසළොස්වක පොහොය දිනය', 'isPoya': true, 'types': ['public', 'bank']},
            ]),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'});
      }
      return http.Response('{}', 404);
    });
    final services = AppServices(ApiClient(token: 't', client: client, baseUrl: 'http://api'), store, LocaleController(await SharedPreferences.getInstance()));
    await tester.pumpWidget(MaterialApp(
      locale: const Locale('si'),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      theme: appTheme(Brightness.light, sinhala: true),
      home: Scaffold(body: TodayScreen(services: services, propertyId: 'p1', onUnauthorized: () async {})),
    ));
    await tester.pumpAndSettle();

    expect(find.textContaining('Nimali'), findsOneWidget); // greeting with the first name
    expect(find.textContaining('අද පැමිණෙන අය'), findsOneWidget);
    expect(find.text('ඉල් පුර පසළොස්වක පොහොය දිනය'), findsOneWidget);
    expect(find.textContaining('මත්පැන් අලෙවිය'), findsOneWidget);
    await tester.scrollUntilVisible(find.textContaining('ගෙවිය යුතු'), 300, scrollable: find.byType(Scrollable).first);
    expect(find.textContaining('ගෙවිය යුතු'), findsOneWidget); // unpaid chip, still red
    expect(tester.takeException(), isNull); // no RenderFlex overflow at 375 px
  });

  test('holiday notice: Poya today first, then a holiday today, then Poya tomorrow', () {
    final may1 = [
      {'date': '2026-05-01', 'nameEn': 'May Day', 'nameSi': 'ලෝක කම්කරු දිනය', 'isPoya': false},
      {'date': '2026-05-01', 'nameEn': 'Vesak Full Moon Poya Day', 'nameSi': 'වෙසක් පුර පසළොස්වක පොහොය දිනය', 'isPoya': true},
    ];
    expect(holidayNotice(may1, '2026-05-01', '2026-05-02')!.kind, HolidayKind.poyaToday);
    expect(holidayNotice(may1, '2026-05-01', '2026-05-02')!.nameEn, 'Vesak Full Moon Poya Day');
    expect(holidayNotice(may1.sublist(0, 1), '2026-05-01', '2026-05-02')!.kind, HolidayKind.holidayToday);
    expect(holidayNotice(may1, '2026-04-30', '2026-05-01')!.kind, HolidayKind.poyaTomorrow);
    expect(holidayNotice(may1.sublist(0, 1), '2026-04-30', '2026-05-01'), isNull); // only Poya days are announced a day ahead
    expect(holidayNotice(const [], '2026-04-30', '2026-05-01'), isNull);
  });

  testWidgets('the login screen switches to Sinhala and remembers it', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final store = await Store.open();
    final locale = LocaleController(prefs);
    await tester.pumpWidget(StayDirectApp(store: store, api: ApiClient(baseUrl: 'http://localhost:1'), locale: locale));
    await tester.pumpAndSettle();
    expect(find.text('Mobile number'), findsOneWidget);

    await tester.tap(find.text('සිංහල'));
    await tester.pumpAndSettle();
    expect(find.text('ජංගම දුරකථන අංකය'), findsOneWidget);
    expect(find.text('කේතය යවන්න'), findsOneWidget);
    expect(prefs.getString('lang'), 'si');
    expect(tester.takeException(), isNull);
  });

  group('language sync with the account', () {
    test('a change is saved on the account; offline it waits for the next sync', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final sent = <String>[];
      var online = false;
      final api = ApiClient(
        token: 't',
        baseUrl: 'http://api',
        client: MockClient((req) async {
          if (!online) throw http.ClientException('offline');
          sent.add('${req.method} ${req.url.path} ${req.body}');
          return http.Response('{}', 200);
        }),
      );
      final c = LocaleController(prefs);
      await c.setLanguage('si', api: api);
      expect(c.lang, 'si'); // switched at once, even offline
      expect(prefs.getBool('langPendingSync'), isTrue);

      online = true;
      await c.syncWithServer(api);
      expect(sent, ['PATCH /auth/me {"language":"si"}']);
      expect(prefs.getBool('langPendingSync'), isFalse);
    });

    test("with nothing pending, the account's language is adopted (set on the web)", () async {
      SharedPreferences.setMockInitialValues({'lang': 'en'});
      final c = LocaleController(await SharedPreferences.getInstance());
      final api = ApiClient(
        token: 't',
        baseUrl: 'http://api',
        client: MockClient((req) async => http.Response(jsonEncode({'user': {'language': 'si'}}), 200)),
      );
      await c.syncWithServer(api);
      expect(c.lang, 'si');
    });
  });

  test('Sinhala keeps the English colours in light and dark; only the type changes', () {
    for (final b in Brightness.values) {
      final en = appTheme(b);
      final si = appTheme(b, sinhala: true);
      expect(si.colorScheme, en.colorScheme);
      expect(si.extensions.values.length, en.extensions.values.length); // status colours only, no ornament palette
      expect(si.textTheme.titleLarge?.fontFamily, 'AbhayaLibre');
      expect(si.textTheme.bodyMedium?.fontFamily, 'NotoSansSinhala');
      expect(si.textTheme.titleLarge?.color, en.textTheme.titleLarge?.color);
    }
  });
}

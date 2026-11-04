import 'package:flutter/material.dart';

import 'api.dart';
import 'screens/home_shell.dart';
import 'screens/login_screen.dart';
import 'store.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final store = await Store.open();
  runApp(StayDirectApp(store: store, api: ApiClient(token: store.token)));
}

/// Everything screens need: the API client and the on-device store.
class AppServices {
  AppServices(this.api, this.store);
  final ApiClient api;
  final Store store;
}

class StayDirectApp extends StatefulWidget {
  const StayDirectApp({super.key, required this.store, required this.api});
  final Store store;
  final ApiClient api;

  @override
  State<StayDirectApp> createState() => _StayDirectAppState();
}

class _StayDirectAppState extends State<StayDirectApp> {
  late final AppServices services = AppServices(widget.api, widget.store);
  late bool signedIn = widget.store.token != null && widget.store.propertyId != null;

  Future<void> _signOut() async {
    await widget.store.clear();
    widget.api.token = null;
    setState(() => signedIn = false);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'StayDirect',
      debugShowCheckedModeBanner: false,
      theme: _theme(Brightness.light),
      darkTheme: _theme(Brightness.dark),
      themeMode: ThemeMode.system,
      home: signedIn
          ? HomeShell(services: services, onSignOut: _signOut)
          : LoginScreen(services: services, onSignedIn: () => setState(() => signedIn = true)),
    );
  }
}

ThemeData _theme(Brightness brightness) {
  final scheme = ColorScheme.fromSeed(seedColor: const Color(0xFF0E7C86), brightness: brightness);
  return ThemeData(
    colorScheme: scheme,
    useMaterial3: true,
    visualDensity: VisualDensity.standard,
    inputDecorationTheme: const InputDecorationTheme(border: OutlineInputBorder()),
    cardTheme: const CardThemeData(margin: EdgeInsets.symmetric(horizontal: 16, vertical: 6)),
  );
}

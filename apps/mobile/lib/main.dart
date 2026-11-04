import 'package:flutter/material.dart';

import 'api.dart';
import 'screens/home_shell.dart';
import 'screens/login_screen.dart';
import 'store.dart';
import 'widgets.dart';

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

/// Light by day, dark at night (system setting). The dark scheme keeps surfaces near-black teal so
/// the phone stays readable in a dim room without glaring, and status colours stay distinguishable.
ThemeData _theme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  var scheme = ColorScheme.fromSeed(seedColor: const Color(0xFF0E7C86), brightness: brightness);
  if (dark) {
    scheme = scheme.copyWith(
      surface: const Color(0xFF0F1716),
      surfaceContainerLowest: const Color(0xFF0B1211),
      surfaceContainerLow: const Color(0xFF141E1D),
      surfaceContainer: const Color(0xFF172322),
      surfaceContainerHigh: const Color(0xFF1C2A28),
      surfaceContainerHighest: const Color(0xFF22322F),
      onSurface: const Color(0xFFE6EFED),
      onSurfaceVariant: const Color(0xFFA7B8B5),
      outlineVariant: const Color(0xFF2C3D3A),
    );
  }
  return ThemeData(
    colorScheme: scheme,
    useMaterial3: true,
    visualDensity: VisualDensity.standard,
    materialTapTargetSize: MaterialTapTargetSize.padded,
    scaffoldBackgroundColor: scheme.surface,
    extensions: [dark ? StatusColors.dark : StatusColors.light],
    inputDecorationTheme: const InputDecorationTheme(border: OutlineInputBorder()),
    cardTheme: CardThemeData(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      color: dark ? scheme.surfaceContainerLow : null,
    ),
    listTileTheme: const ListTileThemeData(minTileHeight: 56),
    navigationBarTheme: NavigationBarThemeData(height: 72, backgroundColor: dark ? scheme.surfaceContainer : null),
  );
}

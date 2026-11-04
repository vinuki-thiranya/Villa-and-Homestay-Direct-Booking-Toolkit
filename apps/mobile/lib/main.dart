import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api.dart';
import 'l10n/app_localizations.dart';
import 'locale.dart';
import 'screens/home_shell.dart';
import 'screens/login_screen.dart';
import 'sinhala.dart';
import 'store.dart';
import 'widgets.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final store = await Store.open();
  final locale = LocaleController(await SharedPreferences.getInstance());
  runApp(StayDirectApp(store: store, api: ApiClient(token: store.token), locale: locale));
}

/// Everything screens need: the API client, the on-device store and the app language.
class AppServices {
  AppServices(this.api, this.store, this.locale);
  final ApiClient api;
  final Store store;
  final LocaleController locale;
}

class StayDirectApp extends StatefulWidget {
  const StayDirectApp({super.key, required this.store, required this.api, required this.locale});
  final Store store;
  final ApiClient api;
  final LocaleController locale;

  @override
  State<StayDirectApp> createState() => _StayDirectAppState();
}

class _StayDirectAppState extends State<StayDirectApp> {
  late final AppServices services = AppServices(widget.api, widget.store, widget.locale);
  late bool signedIn = widget.store.token != null && widget.store.propertyId != null;

  Future<void> _signOut() async {
    await widget.store.clear();
    await widget.locale.restoreAfterClear(); // the device keeps its language after sign-out
    widget.api.token = null;
    setState(() => signedIn = false);
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.locale,
      builder: (context, _) {
        final si = widget.locale.isSinhala;
        return MaterialApp(
          title: 'StayDirect',
          debugShowCheckedModeBanner: false,
          locale: widget.locale.locale,
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          theme: appTheme(Brightness.light, sinhala: si),
          darkTheme: appTheme(Brightness.dark, sinhala: si),
          themeMode: ThemeMode.system,
          home: signedIn
              ? HomeShell(services: services, onSignOut: _signOut)
              : LoginScreen(services: services, onSignedIn: () => setState(() => signedIn = true)),
        );
      },
    );
  }
}

/// Light by day, dark at night (system setting). The dark scheme keeps surfaces near-black teal so
/// the phone stays readable in a dim room without glaring, and status colours stay distinguishable.
/// In Sinhala the palette, headings and text size follow sinhala.dart; English is unchanged.
ThemeData appTheme(Brightness brightness, {bool sinhala = false}) {
  final dark = brightness == Brightness.dark;
  var scheme = ColorScheme.fromSeed(seedColor: const Color(0xFF0E7C86), brightness: brightness);
  if (sinhala) {
    scheme = sinhalaScheme(brightness);
  } else if (dark) {
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
  final ornament = dark ? SinhalaColors.dark : SinhalaColors.light;
  final base = ThemeData(colorScheme: scheme, useMaterial3: true, fontFamilyFallback: sinhalaFallback).textTheme;
  return ThemeData(
    colorScheme: scheme,
    useMaterial3: true,
    fontFamilyFallback: sinhalaFallback,
    textTheme: sinhala ? sinhalaTextTheme(base, ornament) : null,
    visualDensity: VisualDensity.standard,
    materialTapTargetSize: MaterialTapTargetSize.padded,
    scaffoldBackgroundColor: scheme.surface,
    extensions: [dark ? StatusColors.dark : StatusColors.light, ornament],
    inputDecorationTheme: const InputDecorationTheme(border: OutlineInputBorder()),
    cardTheme: CardThemeData(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      color: dark ? scheme.surfaceContainerLow : null,
    ),
    listTileTheme: const ListTileThemeData(minTileHeight: 56),
    navigationBarTheme: NavigationBarThemeData(height: 72, backgroundColor: dark ? scheme.surfaceContainer : null),
  );
}

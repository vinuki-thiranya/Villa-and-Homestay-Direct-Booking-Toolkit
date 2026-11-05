import 'package:flutter/material.dart';

/*
 * The owner app in Sinhala (design-system/staydirect-owner/pages/sinhala.md): the same colours and
 * layout as English; only the text and the fonts change. Abhaya Libre for headings, Noto Sans Sinhala
 * for text, a step larger with room for the vowel signs above and below the letters.
 */

/// Fallback for every theme, so Sinhala text renders the same on Android, iOS and the web.
const sinhalaFallback = ['NotoSansSinhala'];

/// Sinhala type on top of the normal text theme: headings in Abhaya Libre, text one step larger.
TextTheme sinhalaTextTheme(TextTheme base) {
  TextStyle? heading(TextStyle? s) =>
      s?.copyWith(fontFamily: 'AbhayaLibre', fontFamilyFallback: sinhalaFallback, fontWeight: FontWeight.w700, height: 1.3);
  TextStyle? body(TextStyle? s) =>
      s?.copyWith(fontFamily: 'NotoSansSinhala', fontSize: (s.fontSize ?? 14) + 1, height: 1.5);
  return base.copyWith(
    displaySmall: heading(base.displaySmall),
    headlineLarge: heading(base.headlineLarge),
    headlineMedium: heading(base.headlineMedium),
    headlineSmall: heading(base.headlineSmall),
    titleLarge: heading(base.titleLarge),
    titleMedium: heading(base.titleMedium),
    titleSmall: body(base.titleSmall),
    bodyLarge: body(base.bodyLarge),
    bodyMedium: body(base.bodyMedium),
    bodySmall: body(base.bodySmall),
    labelLarge: body(base.labelLarge),
    labelMedium: body(base.labelMedium),
    labelSmall: body(base.labelSmall),
  );
}

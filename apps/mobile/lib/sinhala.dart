import 'dart:math' as math;

import 'package:flutter/material.dart';

/*
 * The owner app in Sinhala (design-system/staydirect-owner/pages/sinhala.md): Abhaya Libre headings,
 * Noto Sans Sinhala text, the Kandyan temple-mural palette, and three traditional ornaments drawn as
 * paint (no images): liyawela (vine scroll), pala pethi (lotus petals), sandakada pahana (moonstone).
 * English mode is unchanged. Paid/unpaid keep their green/red (StatusColors).
 */

/// Fallback for every theme, so Sinhala text renders the same on Android, iOS and the web.
const sinhalaFallback = ['NotoSansSinhala'];

/// Ornament colours, light and dark.
@immutable
class SinhalaColors extends ThemeExtension<SinhalaColors> {
  const SinhalaColors({required this.vermilion, required this.ochre});

  /// Kumkuma vermilion: headings.
  final Color vermilion;

  /// Kaha (turmeric ochre): ornament strokes.
  final Color ochre;

  static const light = SinhalaColors(vermilion: Color(0xFF9E2A1E), ochre: Color(0xFFC98A24));
  static const dark = SinhalaColors(vermilion: Color(0xFFF08F72), ochre: Color(0xFFE5A640));

  static SinhalaColors of(BuildContext context) =>
      Theme.of(context).extension<SinhalaColors>() ?? (Theme.of(context).brightness == Brightness.dark ? dark : light);

  @override
  SinhalaColors copyWith({Color? vermilion, Color? ochre}) => SinhalaColors(vermilion: vermilion ?? this.vermilion, ochre: ochre ?? this.ochre);

  @override
  SinhalaColors lerp(SinhalaColors? other, double t) =>
      other == null ? this : SinhalaColors(vermilion: Color.lerp(vermilion, other.vermilion, t)!, ochre: Color.lerp(ochre, other.ochre, t)!);
}

/// True when the app is showing Sinhala.
bool isSinhala(BuildContext context) => Localizations.maybeLocaleOf(context)?.languageCode == 'si';

/// Lacquer for actions (not red: red means "unpaid"), warm surfaces in the dark.
ColorScheme sinhalaScheme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final base = ColorScheme.fromSeed(seedColor: const Color(0xFF9E2A1E), brightness: brightness);
  if (!dark) {
    return base.copyWith(
      primary: const Color(0xFF3B2A1E),
      onPrimary: Colors.white,
      onSurface: const Color(0xFF2B1D14),
    );
  }
  return base.copyWith(
    primary: const Color(0xFFE5A640),
    onPrimary: const Color(0xFF2B1D14),
    surface: const Color(0xFF15100C),
    surfaceContainerLowest: const Color(0xFF100C09),
    surfaceContainerLow: const Color(0xFF1C1611),
    surfaceContainer: const Color(0xFF211A14),
    surfaceContainerHigh: const Color(0xFF2A2119),
    surfaceContainerHighest: const Color(0xFF33281F),
    onSurface: const Color(0xFFF1E9DF),
    onSurfaceVariant: const Color(0xFFC9B8A6),
    outlineVariant: const Color(0xFF3F3227),
  );
}

/// Sinhala type: Abhaya Libre for headings in vermilion; text a step larger with room for vowel signs.
TextTheme sinhalaTextTheme(TextTheme base, SinhalaColors c) {
  TextStyle? heading(TextStyle? s) =>
      s?.copyWith(fontFamily: 'AbhayaLibre', fontFamilyFallback: sinhalaFallback, fontWeight: FontWeight.w700, color: c.vermilion, height: 1.3);
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

// ---------------------------------------------------------------- ornaments

/// Liyawela: a running vine scroll, one band under the app bar.
class LiyawelaBand extends StatelessWidget implements PreferredSizeWidget {
  const LiyawelaBand({super.key});

  @override
  Size get preferredSize => const Size.fromHeight(14);

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: SizedBox(height: 14, width: double.infinity, child: CustomPaint(painter: _LiyawelaPainter(SinhalaColors.of(context).ochre))),
    );
  }
}

class _LiyawelaPainter extends CustomPainter {
  _LiyawelaPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final stroke = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;
    final fill = Paint()..color = color;
    const tile = 48.0;
    final mid = size.height / 2;
    for (var x = 0.0; x < size.width; x += tile) {
      // the vine: one S-curve per tile
      final vine = Path()
        ..moveTo(x, mid)
        ..cubicTo(x + 8, mid - 6.5, x + 16, mid - 6.5, x + 24, mid)
        ..cubicTo(x + 32, mid + 6.5, x + 40, mid + 6.5, x + 48, mid);
      canvas.drawPath(vine, stroke);
      // a curl at the crest and the trough
      canvas.drawArc(Rect.fromCircle(center: Offset(x + 13.5, mid - 3), radius: 2.2), math.pi, math.pi * 1.5, false, stroke..strokeWidth = 1);
      canvas.drawArc(Rect.fromCircle(center: Offset(x + 34.5, mid + 3), radius: 2.2), 0, math.pi * 1.5, false, stroke);
      stroke.strokeWidth = 1.2;
      // two leaves
      final leaf = Path()
        ..moveTo(x + 22, mid - 1)
        ..quadraticBezierTo(x + 25, mid - 5.5, x + 29, mid - 5)
        ..quadraticBezierTo(x + 27, mid - 1, x + 22, mid - 1)
        ..close();
      canvas.drawPath(leaf, fill);
      final leaf2 = Path()
        ..moveTo(x + 26, mid + 1)
        ..quadraticBezierTo(x + 23, mid + 5.5, x + 19, mid + 5)
        ..quadraticBezierTo(x + 21, mid + 1, x + 26, mid + 1)
        ..close();
      canvas.drawPath(leaf2, fill..color = color.withValues(alpha: 0.75));
      fill.color = color;
    }
  }

  @override
  bool shouldRepaint(_LiyawelaPainter old) => old.color != color;
}

/// Pala pethi: a row of lotus petals between the sections of Today. Nothing in English.
class PalaPethiDivider extends StatelessWidget {
  const PalaPethiDivider({super.key});

  @override
  Widget build(BuildContext context) {
    if (!isSinhala(context)) return const SizedBox.shrink();
    final c = SinhalaColors.of(context);
    return ExcludeSemantics(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
        child: SizedBox(height: 12, width: double.infinity, child: CustomPaint(painter: _PetalPainter(c.ochre, Theme.of(context).colorScheme.surface))),
      ),
    );
  }
}

class _PetalPainter extends CustomPainter {
  _PetalPainter(this.color, this.hole);
  final Color color;
  final Color hole;

  @override
  void paint(Canvas canvas, Size size) {
    final petal = Paint()..color = color.withValues(alpha: 0.85);
    final inner = Paint()..color = hole;
    const w = 16.0;
    for (var x = 0.0; x + w <= size.width + 0.1; x += w) {
      final cx = x + w / 2;
      final outer = Path()
        ..moveTo(cx, 1)
        ..cubicTo(cx + 4.5, 4.5, cx + 5.5, 9, cx, 11.5)
        ..cubicTo(cx - 5.5, 9, cx - 4.5, 4.5, cx, 1)
        ..close();
      canvas.drawPath(outer, petal);
      final core = Path()
        ..moveTo(cx, 4)
        ..cubicTo(cx + 1.8, 6, cx + 2, 8.4, cx, 10)
        ..cubicTo(cx - 2, 8.4, cx - 1.8, 6, cx, 4)
        ..close();
      canvas.drawPath(core, inner);
    }
  }

  @override
  bool shouldRepaint(_PetalPainter old) => old.color != color || old.hole != hole;
}

/// Sandakada pahana: the half-moonstone at a temple threshold, above the login form.
class SandakadaPahana extends StatelessWidget {
  const SandakadaPahana({super.key, this.width = 160});
  final double width;

  @override
  Widget build(BuildContext context) {
    if (!isSinhala(context)) return const SizedBox.shrink();
    final c = SinhalaColors.of(context);
    return ExcludeSemantics(
      child: SizedBox(width: width, height: width * 82 / 160, child: CustomPaint(painter: _MoonstonePainter(c))),
    );
  }
}

class _MoonstonePainter extends CustomPainter {
  _MoonstonePainter(this.c);
  final SinhalaColors c;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 160;
    canvas.scale(s);
    const cx = 80.0;
    const cy = 80.0;
    final ring = Paint()
      ..color = c.ochre
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.3;
    final flame = Paint()
      ..color = c.vermilion.withValues(alpha: 0.7)
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;
    // flame tongues on the outer ring
    for (var i = 0; i < 21; i++) {
      final a = math.pi - (i + 0.5) * (math.pi / 21);
      canvas.drawLine(Offset(cx + math.cos(a) * 66, cy - math.sin(a) * 66), Offset(cx + math.cos(a) * 75, cy - math.sin(a) * 75), flame);
    }
    for (final r in [62.0, 44.0, 30.0]) {
      canvas.drawArc(Rect.fromCircle(center: const Offset(cx, cy), radius: r), math.pi, math.pi, false, ring);
    }
    // a ring of petals
    final petal = Paint()..color = c.ochre.withValues(alpha: 0.8);
    for (var i = 0; i < 15; i++) {
      final a = math.pi - (i + 0.5) * (math.pi / 15);
      final p = Offset(cx + math.cos(a) * 52, cy - math.sin(a) * 52);
      canvas.save();
      canvas.translate(p.dx, p.dy);
      canvas.rotate(math.pi / 2 - a);
      canvas.drawOval(Rect.fromCenter(center: Offset.zero, width: 6.4, height: 12), petal);
      canvas.restore();
    }
    // the lotus at the centre
    final lotus = Paint()..color = c.vermilion.withValues(alpha: 0.8);
    for (final d in [-50.0, -25.0, 0.0, 25.0, 50.0]) {
      canvas.save();
      canvas.translate(cx, cy);
      canvas.rotate(d * math.pi / 180);
      canvas.drawOval(Rect.fromCenter(center: const Offset(0, -12), width: 9, height: 24), lotus);
      canvas.restore();
    }
    canvas.drawLine(const Offset(0, cy), const Offset(160, cy), ring);
  }

  @override
  bool shouldRepaint(_MoonstonePainter old) => old.c != c;
}

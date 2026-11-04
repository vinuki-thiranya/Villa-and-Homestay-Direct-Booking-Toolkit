# apps/mobile — StayDirect owner app (Flutter)

The owner's phone app (spec §5, Release 2): **Today** (arrivals, departures, unpaid balances in green/red, sync
health, month stats), **Tasks** (today's board, tick to mark done) and **Inbox** (WhatsApp conversations, quick replies
in the guest's language, pause the AI concierge, hand back). Every screen is cached on the device, so today's arrivals,
tasks and messages stay readable offline (spec §3.12); actions are disabled until the connection is back. Dark mode
follows the phone.

It uses the same owner API as `apps/web` (phone-OTP login, then bearer token).

## Run

Flutter 3.47+.

```bash
flutter pub get
flutter run --dart-define=API_URL=http://10.0.2.2:4000      # Android emulator → API on your machine
flutter run -d chrome --dart-define=API_URL=http://localhost:4000
```

Demo login (dev API with the seed): `0770000000`, code `123456`.

## Check

```bash
flutter analyze
flutter test
flutter build appbundle --dart-define=API_URL=https://api.staydirect.lk   # needs the Android SDK
```

## Layout

- `lib/api.dart` — JSON client; network failures surface as status 0.
- `lib/store.dart` — session + offline cache (`shared_preferences`): fetch, save, fall back to the last copy offline.
- `lib/widgets.dart` — `CachedView` (pull to refresh, offline banner), `PaidChip`, section helpers.
- `lib/screens/` — login, home shell (bottom navigation), today, tasks, inbox, thread.

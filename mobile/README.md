# Flashcards mobile app

A Flutter app that wraps the React frontend (`../frontend`) in a full-screen
WebView (`webview_flutter`), so the same pages run as an Android/iOS app.

## Running

Start an Android emulator or iOS simulator, then:

```
cd mobile
flutter run
```

By default the app loads the deployed site, https://mern.sigfoid.com/.

## Running against the local dev server

Start the frontend (`cd frontend && npm run dev`, port 3000), then:

```
flutter run --dart-define=WEB_URL=local
```

This loads `http://10.0.2.2:3000` on the Android emulator and
`http://localhost:3000` on the iOS simulator; both reach the dev server on
your computer.

**Physical phone:** run Vite with `npm run dev -- --host` and point the app at
your computer's LAN address:

```
flutter run --dart-define=WEB_URL=http://192.168.1.50:3000
```

## Troubleshooting

If `flutter run` says "No supported devices connected" while the emulator is
open, `adb` likely sees it as offline. Cold boot it:
`flutter emulators --launch Pixel_9a --cold`.

Plain `http://` is allowed for development (Android `usesCleartextTraffic`,
iOS `NSAllowsLocalNetworking`).

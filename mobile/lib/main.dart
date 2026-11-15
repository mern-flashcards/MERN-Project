import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// Where the React frontend is served. Defaults to the deployed site.
///
/// Override at build/run time, e.g. for the local Vite dev server:
///   flutter run --dart-define=WEB_URL=local
/// or any other address:
///   flutter run --dart-define=WEB_URL=http://192.168.1.50:3000
const String _webUrlOverride = String.fromEnvironment('WEB_URL');
const String _deployedUrl = 'https://mern.sigfoid.com/';

String get webUrl {
  if (_webUrlOverride == 'local') {
    // Android emulator reaches the host machine through 10.0.2.2;
    // the iOS simulator shares the host's localhost.
    return Platform.isAndroid ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
  }
  if (_webUrlOverride.isNotEmpty) return _webUrlOverride;
  return _deployedUrl;
}

void main() {
  runApp(const FlashcardsApp());
}

class FlashcardsApp extends StatelessWidget {
  const FlashcardsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flashcards',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(colorSchemeSeed: Colors.indigo, useMaterial3: true),
      home: const WebShell(),
    );
  }
}

class WebShell extends StatefulWidget {
  const WebShell({super.key});

  @override
  State<WebShell> createState() => _WebShellState();
}

class _WebShellState extends State<WebShell> {
  late final WebViewController _controller;
  int _progress = 0;
  String? _error;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      // The React app needs JavaScript; localStorage is on by default.
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (p) => setState(() => _progress = p),
          onPageStarted: (_) => setState(() => _error = null),
          onWebResourceError: (err) {
            // Only show the error screen when the page itself fails,
            // not for a single image or script.
            if (err.isForMainFrame ?? true) {
              setState(() => _error = err.description);
            }
          },
        ),
      )
      ..loadRequest(Uri.parse(webUrl));
  }

  Future<void> _retry() async {
    setState(() => _error = null);
    final current = await _controller.currentUrl();
    await _controller.loadRequest(Uri.parse(current ?? webUrl));
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      // Android back button walks back through web history first,
      // and only closes the app when there is nothing left to go back to.
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (await _controller.canGoBack()) {
          await _controller.goBack();
        } else if (context.mounted) {
          Navigator.of(context).maybePop();
        }
      },
      child: Scaffold(
        body: SafeArea(
          child: Stack(
            children: [
              WebViewWidget(controller: _controller),
              if (_progress < 100 && _error == null)
                LinearProgressIndicator(value: _progress / 100),
              if (_error != null) _ErrorView(message: _error!, onRetry: _retry),
            ],
          ),
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      padding: const EdgeInsets.all(24),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wifi_off, size: 48),
            const SizedBox(height: 16),
            Text(
              "Couldn't reach Flashcards",
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 4),
            Text(webUrl, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 24),
            FilledButton(onPressed: onRetry, child: const Text('Try again')),
          ],
        ),
      ),
    );
  }
}

/// App-store billing via RevenueCat (company standard, see ~/.claude/IN_APP_PURCHASE.md).
///
/// RevenueCat app user id = this device's install id, so the purchase webhook credits the same
/// wallet the app reads (server: snowvill_wallet / snowvill_upgrade_village). Public SDK keys come
/// from dart-define (REVENUECAT_IOS_KEY / REVENUECAT_ANDROID_KEY); without them purchasing is off.
library;

import 'dart:io' show Platform;

import 'package:flutter/services.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

import 'models.dart';

enum PurchaseOutcome { purchased, cancelled, failed, unavailable }

class PurchaseService {
  PurchaseService();

  static const _iosKey = String.fromEnvironment('REVENUECAT_IOS_KEY');
  static const _androidKey = String.fromEnvironment('REVENUECAT_ANDROID_KEY');

  bool _configured = false;

  String? get _key {
    final k = Platform.isIOS ? _iosKey : _androidKey;
    return k.isEmpty ? null : k;
  }

  bool get available => _key != null;

  Future<bool> _ensure(String installId) async {
    final key = _key;
    if (key == null) return false;
    if (!_configured) {
      await Purchases.configure(PurchasesConfiguration(key)..appUserID = installId);
      _configured = true;
    }
    return true;
  }

  /// The big-village package from the current offering (package lookup key = product id).
  Future<Package?> bigVillagePackage(String installId) async {
    if (!await _ensure(installId)) return null;
    try {
      final offerings = await Purchases.getOfferings();
      final current = offerings.current;
      if (current == null) return null;
      return current.getPackage(bigVillageProductId) ??
          current.availablePackages.where((p) => p.storeProduct.identifier.startsWith(bigVillageProductId)).firstOrNull;
    } on PlatformException {
      return null;
    }
  }

  Future<PurchaseOutcome> buy(String installId, Package package) async {
    if (!await _ensure(installId)) return PurchaseOutcome.unavailable;
    try {
      await Purchases.purchase(PurchaseParams.package(package));
      return PurchaseOutcome.purchased;
    } on PlatformException catch (e) {
      return PurchasesErrorHelper.getErrorCode(e) == PurchasesErrorCode.purchaseCancelledError
          ? PurchaseOutcome.cancelled
          : PurchaseOutcome.failed;
    }
  }

  /// Re-syncs store purchases with RevenueCat (moves unspent credits back via the TRANSFER webhook).
  Future<bool> restore(String installId) async {
    if (!await _ensure(installId)) return false;
    try {
      await Purchases.restorePurchases();
      return true;
    } on PlatformException {
      return false;
    }
  }
}

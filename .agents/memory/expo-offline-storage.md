---
name: Expo offline storage
description: Offline-first Expo builds should use an Expo Go-compatible local persistence layer.
---

Expo/React Native replacements for Flutter-specific persistence must stay JavaScript/native-compatible with Expo Go; the app can preserve the same domain collections and engine while using local device storage instead of Isar.

**Why:** Isar is a Flutter/Dart database and is not available in the Expo runtime used for direct mobile previews.

**How to apply:** When a Flutter request is intentionally converted to Expo, preserve the requested data model boundaries and offline behavior, but implement persistence with an Expo-compatible local store and state context.
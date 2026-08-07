---
name: Expo build port
description: Workspace-specific Metro port isolation for static Expo builds.
---

Static Expo production bundling must use a dedicated Metro port instead of assuming 8081.

**Why:** The workspace mockup preview commonly owns port 8081; Expo's non-interactive build process otherwise prompts to switch ports and times out.

**How to apply:** Keep the build script's Metro health checks, bundle URLs, manifest requests, and asset URL parsing on the same configurable dedicated port.
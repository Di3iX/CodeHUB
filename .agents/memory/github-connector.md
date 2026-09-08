---
name: GitHub connector behavior
description: Replit GitHub connector SDK versions and snapshot loading constraints.
---

Use the currently published `@replit/connectors-sdk` version from the workspace registry rather than trusting stale connection metadata. Repository snapshots should throttle GitHub blob reads; unrestricted parallel requests can trigger secondary rate limits.

**Why:** Connection metadata can advertise a version that is unavailable in the current package registry, and GitHub rate limits parallel content reads.

**How to apply:** Verify the package version before installation and keep repository tree/blob hydration bounded and rate-limit-safe.
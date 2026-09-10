# pstack playbook demo — iOS

Native SwiftUI port of the web playbook router. Demo only — no real plugin install.

This is an Xcode app, not a Bun package. `AGENTS.md`'s `bun install && bun run dev` contract does not apply here.

## Open in Xcode and run the Simulator

From this folder:

```bash
open PstackPlaybookDemo.xcodeproj
```

In Xcode 26, choose an iPhone simulator (iPhone 17 is fine) and press ⌘R.

The app launches already routed to **Bug Fix** from the first sample goal ("Scroll drift bug").

If you add Swift files, regenerate the project with [XcodeGen](https://github.com/yonaskolb/XcodeGen):

```bash
xcodegen generate
```

## Headless build and test

```bash
xcodebuild test -scheme PstackPlaybookDemo \
  -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.5'

xcodebuild build -scheme PstackPlaybookDemo \
  -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.5'
```

Xcode 26.6 needs the iOS 26.5 simulator runtime (`xcodebuild -downloadPlatform iOS` if destinations are missing). Pin `OS=26.5` when more than one iPhone 17 runtime is installed.

No package manager, no dependencies. Unit tests cover router parity with the TypeScript source, screen trim/untrim transitions, and catalog invariants.

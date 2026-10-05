---
id: swift-sec-biometric-gate
lang: swift
prefix: sec
title: Gate sensitive operations behind LocalAuthentication
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [biometrics, faceid, touchid, authentication, passcode]
  files: ["**/*.swift"]
  symbols: [LAContext, evaluatePolicy]
related: [swift-sec-keychain-accessibility, swift-sec-secure-enclave]
sources:
  - title: Local Authentication
    url: https://developer.apple.com/documentation/localauthentication
---
> Require biometric or device-owner authentication before exposing protected actions.

## Why

Apple's overview describes LocalAuthentication as the framework that coordinates with the Secure Enclave so the app receives only a Boolean result and never touches the underlying authentication data, and recommends it for extending an app's authentication procedures. A sensitive screen or secret that opens without that check is protected only by the lock screen. Evaluating a policy before the action puts the device owner between the data and anyone holding an unlocked device.

## Bad

```swift
func unlockVault() {
    showVault()
}

func showVault() {}
```

## Good

```swift
import LocalAuthentication

enum VaultError: Error {
    case authenticationUnavailable
}

func unlockVault() async throws {
    let context = LAContext()
    var error: NSError?
    guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
        throw VaultError.authenticationUnavailable
    }
    try await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Unlock the vault")
    showVault()
}

func showVault() {}
```

## See Also

- [swift-sec-keychain-accessibility](sec-keychain-accessibility.md) - binding the secret itself to device state
- [swift-sec-secure-enclave](sec-secure-enclave.md) - hardware-bound keys behind the same mechanism

# Xcode Cloud for VS Code

A Visual Studio Code extension that integrates with Apple's Xcode Cloud CI/CD service via the App Store Connect API.

## Features

- View Xcode Cloud products, workflows, and build runs in a sidebar tree view
- Trigger and cancel builds directly from VS Code
- View build logs with syntax highlighting
- Live build status notifications
- Status bar indicator for active builds

## Requirements

- An [App Store Connect API key](https://developer.apple.com/documentation/appstoreconnectapi/creating_api_keys_for_app_store_connect_api) with access to Xcode Cloud
- API Key ID, Issuer ID, and the `.p8` private key file

## Getting Started

1. Install the extension
2. Run **Xcode Cloud: Sign In** from the Command Palette
3. Enter your API Key ID, Issuer ID, and provide your `.p8` private key
4. The Xcode Cloud sidebar will populate with your products and workflows

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `xcodeCloud.pollingIntervalSeconds` | `30` | Interval between automatic refreshes |
| `xcodeCloud.showStatusBarItem` | `true` | Show the status bar item |
| `xcodeCloud.notifyOnBuildComplete` | `true` | Show notifications when builds complete |

## License

MIT

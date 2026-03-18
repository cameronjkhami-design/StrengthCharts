# StrengthCharts — iOS App Store Setup Guide

## Prerequisites

1. **Xcode** — Install from the Mac App Store (requires macOS 13+)
2. **CocoaPods** — Install via Homebrew:
   ```bash
   brew install cocoapods
   ```
3. **Apple Developer Account** — $99/year at https://developer.apple.com

## Quick Setup (One Command)

```bash
./scripts/setup-ios.sh
```

This script will:
- Build the web assets
- Add the iOS platform via Capacitor
- Install app icons
- Configure Info.plist (AdMob, orientation, tracking)
- Set dark launch screen
- Run final sync

## Manual Setup

If you prefer to do it step by step:

```bash
cd client

# 1. Build the web app
npm run build

# 2. Add iOS platform
npx cap add ios

# 3. Sync web assets to iOS
npx cap sync ios

# 4. Copy app icons
cp -r ../ios-assets/AppIcon.appiconset ios/App/App/Assets.xcassets/AppIcon.appiconset/

# 5. Open in Xcode
npx cap open ios
```

## Xcode Configuration

1. Open the project: `npx cap open ios` (from the `client/` directory)
2. Select the **App** target
3. Under **Signing & Capabilities**:
   - Select your Development Team
   - Bundle Identifier: `com.strengthcharts.app`
4. Under **General**:
   - Display Name: `StrengthCharts`
   - Minimum Deployment Target: iOS 14.0
   - Device Orientation: Portrait only

## AdMob Setup

1. Create an AdMob account at https://admob.google.com
2. Create an iOS app and get your **App ID** (format: `ca-app-pub-XXXX~YYYY`)
3. Create a **Rewarded Ad Unit** and get the **Ad Unit ID** (format: `ca-app-pub-XXXX/YYYY`)
4. Replace test IDs:
   - `client/src/hooks/useAds.js` — replace `ca-app-pub-3940256099942544/1712485313` with your real Ad Unit ID
   - `ios/App/App/Info.plist` — replace `ca-app-pub-3940256099942544~1458002511` in `GADApplicationIdentifier` with your real App ID

## RevenueCat / In-App Purchase Setup

1. Create a RevenueCat account at https://www.revenuecat.com
2. Create a new project and add your iOS app
3. In App Store Connect:
   - Create an IAP product: **Non-Consumable**, Product ID: `com.strengthcharts.pro`
   - Price: your choosing (e.g., $4.99)
4. In RevenueCat dashboard:
   - Add the IAP product to an **Entitlement** called `pro`
   - Add it to an **Offering** called `default`
   - Get your **Public API Key**
5. Replace the test key in `client/src/hooks/usePurchases.js`:
   - Replace `'appl_YOUR_REVENUECAT_API_KEY'` with your real key

## Backend Deployment

The Express backend needs to be hosted somewhere accessible. Options:
- **Railway** (recommended): `railway up` from `server/` directory
- **Render**: Connect GitHub repo, set build command
- **DigitalOcean App Platform**
- **Fly.io**: `fly launch` from `server/` directory

After deploying, update the production API URL in:
```
client/src/utils/api.js
```
Change the native URL from `http://localhost:3001` to your deployed URL:
```javascript
const API_BASE = isNative
  ? 'https://your-deployed-api.com'  // <-- Your production URL
  : '';
```

Then rebuild and sync:
```bash
cd client
npm run build
npx cap sync ios
```

## Building for App Store

1. In Xcode, select **Product > Archive**
2. In the Organizer, click **Distribute App**
3. Choose **App Store Connect**
4. Upload to App Store Connect
5. In App Store Connect (https://appstoreconnect.apple.com):
   - Fill in app metadata (description, keywords, screenshots)
   - Set pricing
   - Submit for review

## App Store Metadata Suggestions

**App Name:** StrengthCharts — PR Tracker
**Subtitle:** Track PRs. Rank Your Strength.
**Category:** Health & Fitness
**Keywords:** strength, workout, gym, personal record, PR, 1RM, powerlifting, bench press, squat, deadlift

**Description:**
Track your personal records, see where you rank among your friends, and watch your strength grow over time.

- Log PRs for Squat, Bench Press, Deadlift, OHP, Pull-ups, and Barbell Row
- Automatic estimated 1RM calculation using the Epley formula
- Strength tier rankings from Untrained to World Class
- Compare against friends with the group leaderboard
- Track bodyweight and see your strength-to-bodyweight ratios
- Beautiful charts showing your progress over time

**Privacy Policy URL:** (required — create one at https://app-privacy-policy-generator.firebaseapp.com)

## Testing on Device

```bash
cd client

# Dev mode with live reload (edit capacitor.config.ts first)
# 1. Find your Mac's local IP: ifconfig | grep "inet "
# 2. Uncomment the server.url line in capacitor.config.ts
# 3. Set it to http://YOUR_IP:5173

npx cap sync ios
npx cap open ios
# Then hit Run (Cmd+R) in Xcode with your iPhone connected
```

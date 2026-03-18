#!/bin/bash
# ============================================================
# StrengthCharts iOS Setup Script
# Run this once to scaffold the entire iOS project
# Prerequisites: Xcode, CocoaPods (brew install cocoapods)
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT/client"

echo "🏗️  StrengthCharts iOS Setup"
echo "==========================="
echo ""

# Step 1: Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Xcode is not installed. Install from the Mac App Store."
    exit 1
fi
echo "  ✓ Xcode found"

if ! command -v pod &> /dev/null; then
    echo "❌ CocoaPods is not installed."
    echo "  Install it with: brew install cocoapods"
    echo "  Or: sudo gem install cocoapods"
    exit 1
fi
echo "  ✓ CocoaPods found"

# Step 2: Build web assets
echo ""
echo "📦 Building web assets..."
npm run build
echo "  ✓ Web build complete"

# Step 3: Add iOS platform
echo ""
echo "📱 Adding iOS platform..."
if [ -d "ios" ]; then
    echo "  ⚠️  iOS directory already exists. Syncing instead..."
    npx cap sync ios
else
    npx cap add ios
fi
echo "  ✓ iOS platform ready"

# Step 4: Copy app icons
echo ""
echo "🎨 Installing app icons..."
ICON_SOURCE="$PROJECT_ROOT/ios-assets/AppIcon.appiconset"
ICON_DEST="ios/App/App/Assets.xcassets/AppIcon.appiconset"

if [ -d "$ICON_SOURCE" ]; then
    rm -rf "$ICON_DEST"
    cp -r "$ICON_SOURCE" "$ICON_DEST"
    echo "  ✓ App icons installed"
else
    echo "  ⚠️  No ios-assets/AppIcon.appiconset found. Run: node scripts/generate-icons.js"
fi

# Step 5: Merge Info.plist customizations
echo ""
echo "⚙️  Applying Info.plist customizations..."
PLIST_SOURCE="$PROJECT_ROOT/ios-assets/Info.plist"
PLIST_DEST="ios/App/App/Info.plist"

if [ -f "$PLIST_SOURCE" ] && [ -f "$PLIST_DEST" ]; then
    # Use PlistBuddy to merge key entries
    # AdMob App ID
    /usr/libexec/PlistBuddy -c "Add :GADApplicationIdentifier string ca-app-pub-3940256099942544~1458002511" "$PLIST_DEST" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Set :GADApplicationIdentifier ca-app-pub-3940256099942544~1458002511" "$PLIST_DEST"

    # User Tracking description
    /usr/libexec/PlistBuddy -c "Add :NSUserTrackingUsageDescription string 'This identifier will be used to deliver personalized ads to you.'" "$PLIST_DEST" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Set :NSUserTrackingUsageDescription 'This identifier will be used to deliver personalized ads to you.'" "$PLIST_DEST"

    # Portrait only
    /usr/libexec/PlistBuddy -c "Delete :UISupportedInterfaceOrientations" "$PLIST_DEST" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Add :UISupportedInterfaceOrientations array" "$PLIST_DEST"
    /usr/libexec/PlistBuddy -c "Add :UISupportedInterfaceOrientations:0 string UIInterfaceOrientationPortrait" "$PLIST_DEST"

    # Full screen
    /usr/libexec/PlistBuddy -c "Add :UIRequiresFullScreen bool true" "$PLIST_DEST" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Set :UIRequiresFullScreen true" "$PLIST_DEST"

    echo "  ✓ Info.plist updated with AdMob, tracking, orientation settings"
else
    echo "  ⚠️  Could not find Info.plist files. Manual merge needed."
fi

# Step 6: Set launch screen background to dark
echo ""
echo "🎬 Configuring launch screen..."
LAUNCH_SB="ios/App/App/Base.lproj/LaunchScreen.storyboard"
if [ -f "$LAUNCH_SB" ]; then
    # Replace the default white background with dark
    sed -i '' 's/red="1" green="1" blue="1"/red="0.039" green="0.039" blue="0.039"/g' "$LAUNCH_SB" 2>/dev/null || true
    echo "  ✓ Launch screen set to dark background"
fi

# Step 7: Final sync
echo ""
echo "🔄 Running final cap sync..."
npx cap sync ios
echo "  ✓ Sync complete"

echo ""
echo "============================================"
echo "✅ iOS project setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Open in Xcode:   npx cap open ios"
echo "  2. Select your development team in Xcode"
echo "  3. Set the bundle ID to: com.strengthcharts.app"
echo "  4. Connect your iPhone and hit Run (⌘R)"
echo ""
echo "Before App Store submission:"
echo "  - Replace AdMob test IDs with real IDs in:"
echo "      client/src/hooks/useAds.js"
echo "      ios/App/App/Info.plist (GADApplicationIdentifier)"
echo "  - Set up RevenueCat with your real API key in:"
echo "      client/src/hooks/usePurchases.js"
echo "  - Deploy your backend server and update the URL in:"
echo "      client/src/utils/api.js"
echo ""

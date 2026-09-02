# Building the Tagzheimer Android App

Three ways to build the APK / AAB, from easiest to most involved.

---

## Prerequisites (all methods)

1. **Install Node.js 20+** — https://nodejs.org (or use `nvm install 20`)
2. **Install Git** — to clone the repo
3. **An Android phone** (for testing) OR an Android emulator
4. **A Tagzheimer backend running somewhere** — either:
   - Locally: `cd backend && DEMO_MODE=true npm start` → `http://localhost:5000`
   - Deployed: `https://api.your-domain.com`
5. **For Play Store builds only:** a Google Play Developer account ($25 one-time)

---

## Method 1 — Expo Go (fastest, no APK build, just test on your phone)

Use this if you just want to test the app on your phone in 5 minutes. No APK is produced — Expo Go loads the JS bundle from your dev machine.

### 1.1 Install Expo Go on your Android phone
- Play Store → search "Expo Go" → install

### 1.2 On your dev machine:
```bash
git clone https://github.com/Tagzheimer/Tagzheimer.git tagzheimer   # or extract a repo copy
cd tagzheimer/mobile
npm install --legacy-peer-deps
npx expo start
```

### 1.3 On your phone:
- Open Expo Go
- Scan the QR code shown in your terminal (use the phone's camera or the Expo Go app's scan button)
- The app loads. Pair with serial `TAG-001` and tap "Send Now".

### Backend URL for the phone
The phone needs to reach your backend over the LAN:
- If backend runs on your laptop → enter `http://<laptop-LAN-IP>:5000` (e.g. `http://192.168.1.50:5000`)
- If backend is deployed → enter `https://api.your-domain.com`

To find your laptop's LAN IP:
- **macOS:** `ipconfig getifaddr en0`
- **Linux:** `ip addr show wlan0 | grep inet`
- **Windows:** `ipconfig` → look for "IPv4 Address" under WiFi

### Caveats
- App only sends GPS while Expo Go is in the foreground
- Phone + dev machine must stay on the same WiFi
- Not suitable for distributing to other people

---

## Method 2 — EAS Build (recommended, no Android Studio needed)

EAS (Expo Application Services) builds the APK in the cloud. Free for personal use, ~10 min per build.

### 2.1 Create an Expo account
- https://expo.dev/signup (free)

### 2.2 Install EAS CLI and log in
```bash
npm install -g eas-cli
eas login
```

### 2.3 Configure the project (one-time)
```bash
cd mobile
eas build:configure
```
This creates/updates `eas.json` (already in the repo, but run this if you cloned fresh).

### 2.4 Build an APK for sideloading
```bash
eas build --platform android --profile preview
```
- Takes ~10 minutes
- EAS prints a download URL when done
- Download the `.apk` file

### 2.5 Install the APK on your phone
- Copy the APK to your phone (USB cable, Google Drive, etc.)
- Open the file manager on the phone → tap the APK
- Android will warn "Install unknown apps" → allow it → install
- Open "Tagzheimer Tracker" from your app drawer

### 2.6 Build an AAB for the Play Store
```bash
eas build --platform android --profile production
```
- Produces an `.aab` (Android App Bundle) — Play Store format
- EAS auto-submits it to the Play Store if you've configured submit credentials

### 2.7 Submit to Play Store (one-time setup)
- Create a Google Cloud service account: https://expo.dev/accounts/[you]/projects/[project]/credentials
- Download the JSON key, save as `mobile/google-service-account.json`
- Run:
  ```bash
  eas submit --platform android --profile production
  ```
- The first submission goes to the **internal test track** — you can promote it to production later

### Cost
- Free for the first 15 builds/month on the free tier
- $99/year for unlimited builds (EAS Production plan)

---

## Method 3 — Local build with Android Studio (no cloud)

Use this if you can't use EAS (air-gapped environment, no Expo account, etc.).

### 3.1 Install prerequisites

| Tool | Version | Download |
|------|---------|----------|
| JDK | 17 (NOT 18+) | https://adoptium.net |
| Android Studio | Hedgehog (2023.1.1)+ | https://developer.android.com/studio |
| Android SDK | API 34 + Build Tools 34.0.0 | via Android Studio SDK Manager |
| Node.js | 20+ | https://nodejs.org |

After installing Android Studio, open it once → SDK Manager → install:
- Android SDK Platform 34
- Android SDK Build-Tools 34.0.0
- Android SDK Platform-Tools
- Android SDK Command-line Tools

Set environment variables (in `~/.bashrc` or `~/.zshrc`):
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
```

Verify:
```bash
java -version          # → 17.x.x
adb --version         # → Android Debug Bridge version 1.0.x
```

### 3.2 Generate native Android project
```bash
cd mobile
npm install --legacy-peer-deps
npx expo prebuild --platform android
```
This creates an `android/` folder inside `mobile/`. From here on we're using plain Gradle, not Expo.

### 3.3 Build the release APK
```bash
cd android
./gradlew assembleRelease
```
- Takes 5–15 min on first run (downloads ~500 MB of Gradle deps)
- Output: `android/app/build/outputs/apk/release/app-release.apk`

### 3.4 Sign the APK
EAS auto-manages signing. For local builds you need a keystore:

```bash
# Generate a keystore (one-time — keep this file safe, you'll need it for every update)
keytool -genkey -v -keystore tagzheimer.keystore \
  -alias tagzheimer \
  -keyalg RSA -keysize 2048 -validity 10000

# You'll be prompted for a password — remember it.
```

Add signing config to `android/app/build.gradle` (above the `android {` block):
```gradle
android {
    signingConfigs {
        release {
            storeFile file('../../tagzheimer.keystore')
            storePassword 'your-password'
            keyAlias 'tagzheimer'
            keyPassword 'your-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            // ... existing config
        }
    }
}
```

Then re-run `./gradlew assembleRelease` — the output APK is now signed.

### 3.5 Build an AAB for Play Store
```bash
cd android
./gradlew bundleRelease
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`

### 3.6 Install on a phone via USB
- Enable Developer Mode on your Android phone (Settings → About → tap "Build number" 7 times)
- Enable USB Debugging (Settings → Developer options → USB Debugging)
- Connect via USB cable
- Authorize the computer when prompted on the phone
- Run:
  ```bash
  cd android
  ./gradlew installRelease
  # or, simpler:
  adb install app/build/outputs/apk/release/app-release.apk
  ```

### 3.7 Upload AAB to Play Store manually
- Go to https://play.google.com/console
- Create an app → "Tagzheimer Tracker"
- Release → Production → Create new release
- Upload the `.aab` file
- Fill in store listing, content rating, privacy policy URL
- Submit for review (usually 1–3 days for first approval)

---

## Quick comparison

| Method | Time | Cost | Output | Best for |
|--------|------|------|--------|----------|
| **Expo Go** | 5 min | Free | No APK | Quick testing on your own phone |
| **EAS Build** | 10 min | Free (15 builds/mo) | APK + AAB | Personal distribution, Play Store |
| **Local build** | 30 min setup, 10 min build | Free | APK + AAB | Air-gapped, custom signing |

---

## Troubleshooting

### `eas build` fails with "Could not find project"
Run `eas init` once in the `mobile/` folder to register the project with your Expo account, then re-run.

### `npx expo prebuild` fails with "package version not found"
Make sure your `package.json` deps match Expo SDK 52. Run `npx expo install --check` to verify and auto-fix.

### `./gradlew assembleRelease` fails with "Could not resolve all files"
- Make sure you've accepted Android SDK licenses: `yes | sdkmanager --licenses`
- Check `ANDROID_HOME` is set: `echo $ANDROID_HOME`

### APK installs but crashes on launch
- Plug phone in via USB and check the crash log: `adb logcat *:E ReactNative:*`
- Most common cause: missing native module. Run `npx expo prebuild --clean` and re-build.

### "Install unknown apps" warning
This is normal for sideloaded APKs. On Android 8+ you'll be prompted to allow the file manager to install unknown apps. Tap "Allow from this source" and retry.

### The app can't reach the backend
- The phone and the backend must be on the same network, OR the backend must have a public HTTPS URL
- Android 9+ blocks cleartext HTTP traffic by default. If you must use `http://` in development, add `android:usesCleartextTraffic="true"` to the `<application>` tag in `android/app/src/main/AndroidManifest.xml`
- For production: use HTTPS only

### Google Play rejects the AAB
- Make sure you submitted an AAB, not an APK (Play Store no longer accepts APKs for new apps)
- Make sure the AAB is signed with the same key as your previous submissions
- Check the privacy policy URL is reachable — required for any app that requests location permission

---

## Files involved in the build

```
mobile/
├── app.json                  ← Expo config — Android permissions, package name, versionCode
├── eas.json                  ← EAS build profiles (preview / production)
├── package.json              ← JS deps
├── tsconfig.json             ← TypeScript config
├── babel.config.js           ← Babel preset for Expo
├── metro.config.js           ← Metro bundler config
├── app/                      ← Expo Router screens (compiled to JS bundle)
├── src/                      ← App logic (services, components, styles)
├── assets/                   ← Icon + splash PNGs
└── (generated by prebuild:)
    android/                  ← Native Android project
    ├── app/
    │   ├── build.gradle      ← Gradle build config (signing goes here)
    │   └── src/main/
    │       ├── AndroidManifest.xml
    │       └── java/com/tagzheimer/tracker/
    └── gradle/
        └── wrapper.jar
```

---

## Need help?

- Expo docs: https://docs.expo.dev
- EAS Build docs: https://docs.expo.dev/build/introduction/
- Android Studio setup: https://docs.expo.dev/tutorial/android-studio-config
- Play Store console: https://play.google.com/console

Good luck — you're ready to ship the app.

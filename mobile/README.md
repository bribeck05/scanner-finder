# Scanner Finder (iOS + Android, Expo / React Native)
Browse OpenMHz police/fire scanner systems, search by location, and listen to live calls.

## Run
    npm install
    npx expo install --fix
    npx expo start          # scan QR with Expo Go (iOS/Android)

## Native builds
    npx expo prebuild       # generates ios/ and android/ projects
    npx expo run:ios        # needs macOS + Xcode
    npx expo run:android    # needs Android Studio
    # or cloud builds for the stores: npm i -g eas-cli && eas build -p all

Change bundleIdentifier/package in app.json before publishing.
Data comes from the public OpenMHz API (api.openmhz.com); it covers trunked systems that OpenMHz users share, not every scanner.

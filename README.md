# AGAP Android App

The React app is packaged as an Android app with Capacitor. During local phone
testing, it connects to the Java backend running on your computer. Supabase Auth
and PostgreSQL remain hosted remotely; guests use anonymous Supabase sign-in.

## Requirements

- Node.js and npm
- Android Studio with the Android SDK installed
- Java 17 or newer and Maven 3.9+ to run the backend
- An Android phone with Developer Options and USB debugging enabled

## Configure local settings

Copy `.env.example` to `.env.local` and fill in the Supabase project URL and
publishable/anon key. Set `REACT_APP_API_BASE_URL` to the computer's Wi-Fi IPv4
address, not `localhost` (on a phone, `localhost` refers to the phone):

```text
REACT_APP_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
REACT_APP_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
REACT_APP_API_BASE_URL=http://YOUR_COMPUTER_LAN_IP:8080/api
```

For example, if the computer's Wi-Fi IPv4 address is `192.168.1.9`, use
`http://192.168.1.9:8080/api`. Keep `.env.local` private and never put a database
password or Supabase service-role key in the frontend.

## Run on your phone

1. Follow the Java backend repository's README to configure Supabase and start
   the Java API on port `8080`.
2. Connect the computer and phone to the same trusted Wi-Fi network. Allow Java
   through Windows Firewall for Private networks if prompted.
3. From this folder, install frontend dependencies if needed:

   ```powershell
   npm install
   ```

4. Build the React app and sync the local HTTP Capacitor configuration:

   ```powershell
   npm run android:sync:local
   ```

5. Open the Android project in Android Studio:

   ```powershell
   npm run android:open
   ```

6. Connect the phone with USB debugging enabled, select it as the Android Studio
   run target, and press **Run**.

The local-test configuration enables HTTP only for Android debug builds so the
app can reach your computer's local API. Do not distribute that debug build.
For changes to React code or `.env.local`, rerun `npm run android:sync:local`
before launching the app again. If the computer's Wi-Fi IP changes, update
`REACT_APP_API_BASE_URL` and rebuild/sync.

The normal `npm run android:sync` uses the default Capacitor configuration,
which does not enable the local HTTP scheme.

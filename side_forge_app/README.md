# Side Forge Mobile (`side_forge_app`)

React Native + Expo mobile application for **Side Forge**, serving three school-level user categories:
1. **Parents (`PARENT`)**
2. **Teachers (`TEACHER`)**
3. **School Administration (`SCHOOL_ADMIN`)**

> **Note:** Platform SaaS Administration is intentionally excluded from the mobile application and remains in `side_forge_ui` (Admin Web).

---

## Technology Stack

- **Framework:** React Native `0.83.4` + Expo SDK `55`
- **Language:** TypeScript (`strict: true`)
- **Navigation:** Expo Router (`expo-router`)
- **Server State & Caching:** TanStack Query v5 (`@tanstack/react-query`)
- **Forms & Validation:** React Hook Form + Zod (`@hookform/resolvers/zod`)
- **Client State:** Zustand (`zustand`)
- **Secure Storage:** Expo SecureStore (`expo-secure-store`)
- **Notifications & Deep Links:** Expo Notifications (`expo-notifications`) + Expo Linking (`expo-linking`)
- **Icons:** Lucide React Native (`lucide-react-native`)

---

## Connecting to the Spring Boot Backend (`localhost` vs Emulator vs Physical Device)

Because mobile emulators and physical phones run in their own network namespace, `localhost` on a phone refers to the phone itself—not your development computer.

1. **Android Emulator (AVD):**
   - Automatically defaults to `http://10.0.2.2:8080` (`10.0.2.2` is the Android emulator alias for your host machine's `127.0.0.1`).
2. **iOS Simulator:**
   - Automatically defaults to `http://localhost:8080`.
3. **Physical Android / iOS Device (Expo Go or Dev Build on Wi-Fi LAN):**
   - Find your computer's LAN IPv4 address (`ipconfig` on Windows, e.g. `192.168.1.42`).
   - Either set `EXPO_PUBLIC_API_BASE_URL=http://192.168.1.42:8080` in `.env` **or** tap the **Server** button on the Login screen (or in **Account & Appearance Settings**) to override the backend URL at runtime without rebuilding.

---

## Running the Application

```bash
cd side_forge_app

# Install dependencies (if not already installed)
npm install --legacy-peer-deps

# Type-check TypeScript
npm run typecheck

# Start Expo Metro Bundler
npx expo start

# Launch on Android Emulator / Connected Android Device
npx expo start --android

# Launch on iOS Simulator (macOS)
npx expo start --ios
```

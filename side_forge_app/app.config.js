const fs = require('fs');
const path = require('path');
const baseConfig = require('./app.json');

/**
 * Dynamic Expo configuration that binds `android.googleServicesFile` and
 * `ios.googleServicesFile` when the developer places `google-services.json`
 * or `GoogleService-Info.plist` in `side_forge_app/` (or sets GOOGLE_SERVICES_JSON).
 * Keeps local development functional before credentials are provisioned.
 */
module.exports = ({ config }) => {
  const merged = {
    ...baseConfig.expo,
    ...config,
  };

  const androidGoogleServicesCandidate =
    process.env.GOOGLE_SERVICES_JSON || './google-services.json';
  const resolvedAndroidPath = path.resolve(
    __dirname,
    androidGoogleServicesCandidate
  );

  const hasAndroidGoogleServices = fs.existsSync(resolvedAndroidPath);

  const iosPlistCandidate =
    process.env.GOOGLE_SERVICE_INFO_PLIST || './GoogleService-Info.plist';
  const resolvedIosPath = path.resolve(__dirname, iosPlistCandidate);
  const hasIosPlist = fs.existsSync(resolvedIosPath);

  return {
    ...merged,
    android: {
      ...merged.android,
      ...(hasAndroidGoogleServices
        ? { googleServicesFile: androidGoogleServicesCandidate }
        : {}),
    },
    ios: {
      ...merged.ios,
      ...(hasIosPlist ? { googleServicesFile: iosPlistCandidate } : {}),
    },
  };
};

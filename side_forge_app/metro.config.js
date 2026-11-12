const { getDefaultConfig } = require('expo/metro-config');
const http = require('http');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const BACKEND_HOST = process.env.EXPO_PUBLIC_BACKEND_HOST || 'localhost';
const BACKEND_PORT = Number(process.env.EXPO_PUBLIC_BACKEND_PORT || 8080);

const lucideCjsEntry = path.resolve(
  __dirname,
  'node_modules/lucide-react-native/dist/cjs/lucide-react-native.js'
);

const defaultResolveRequest = config.resolver?.resolveRequest;

config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    if (moduleName === 'lucide-react-native') {
      return {
        filePath: lucideCjsEntry,
        type: 'sourceFile',
      };
    }
    if (moduleName.startsWith('lucide-react-native/icons/')) {
      const iconSubpath = moduleName.replace('lucide-react-native/icons/', '');
      const iconFileName = iconSubpath.endsWith('.js')
        ? iconSubpath
        : `${iconSubpath}.js`;
      return {
        filePath: path.resolve(
          __dirname,
          'node_modules/lucide-react-native/dist/cjs/icons',
          iconFileName
        ),
        type: 'sourceFile',
      };
    }
    if (defaultResolveRequest) {
      return defaultResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

function extractJwtFromSetCookieHeader(setCookieHeader) {
  if (!setCookieHeader) return null;
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [String(setCookieHeader)];
  for (const cookieStr of cookies) {
    const match = cookieStr.match(/(?:^|[,;\s])jwt=([^;,\s]*)/i);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware) => {
    return (req, res, next) => {
      if (req.url && req.url.startsWith('/api/')) {
        const proxyReq = http.request(
          {
            hostname: BACKEND_HOST,
            port: BACKEND_PORT,
            path: req.url,
            method: req.method,
            headers: {
              ...req.headers,
              host: `${BACKEND_HOST}:${BACKEND_PORT}`,
            },
          },
          (proxyRes) => {
            const responseHeaders = { ...proxyRes.headers };
            const jwtToken = extractJwtFromSetCookieHeader(
              proxyRes.headers['set-cookie']
            );
            if (jwtToken) {
              responseHeaders['x-auth-token'] = jwtToken;
            }
            res.writeHead(proxyRes.statusCode || 500, responseHeaders);
            proxyRes.pipe(res, { end: true });
          }
        );

        proxyReq.on('error', (err) => {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: false,
              message: `Backend proxy error (${BACKEND_HOST}:${BACKEND_PORT}): ${err.message}`,
            })
          );
        });

        req.pipe(proxyReq, { end: true });
        return;
      }

      return metroMiddleware(req, res, next);
    };
  },
};

module.exports = config;


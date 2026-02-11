import { SignJWT, importPKCS8 } from "jose";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

const fcmConfig = {
  projectId: process.env.FCM_PROJECT_ID || "",
  clientEmail: process.env.FCM_CLIENT_EMAIL || "",
  privateKey: (process.env.FCM_PRIVATE_KEY || "").replace(/\\n/g, "\n")
};

const apnsConfig = {
  teamId: process.env.APNS_TEAM_ID || "",
  keyId: process.env.APNS_KEY_ID || "",
  privateKey: (process.env.APNS_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  bundleId: process.env.APNS_BUNDLE_ID || "",
  useProduction: (process.env.APNS_USE_PRODUCTION || "true").toLowerCase() !== "false"
};

let fcmAccessTokenCache = { token: "", expiresAtMs: 0 };
let apnsJwtCache = { token: "", expiresAtMs: 0 };

function toStringMap(data = {}) {
  const result = {};
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    result[key] = String(value);
  });
  return result;
}

async function getFcmAccessToken() {
  if (!fcmConfig.projectId || !fcmConfig.clientEmail || !fcmConfig.privateKey) {
    throw new Error("FCM not configured");
  }
  if (fcmAccessTokenCache.token && Date.now() < fcmAccessTokenCache.expiresAtMs - 60_000) {
    return fcmAccessTokenCache.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const privateKey = await importPKCS8(fcmConfig.privateKey, "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/firebase.messaging" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(fcmConfig.clientEmail)
    .setSubject(fcmConfig.clientEmail)
    .setAudience(GOOGLE_TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const params = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Unable to fetch FCM access token (${response.status}): ${text}`);
  }

  const payload = await response.json();
  const expiresIn = Number(payload.expires_in || 3600);
  fcmAccessTokenCache = {
    token: payload.access_token,
    expiresAtMs: Date.now() + expiresIn * 1000
  };
  return payload.access_token;
}

async function getApnsJwt() {
  if (!apnsConfig.teamId || !apnsConfig.keyId || !apnsConfig.privateKey || !apnsConfig.bundleId) {
    throw new Error("APNs not configured");
  }
  if (apnsJwtCache.token && Date.now() < apnsJwtCache.expiresAtMs - 60_000) {
    return apnsJwtCache.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const privateKey = await importPKCS8(apnsConfig.privateKey, "ES256");
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: apnsConfig.keyId })
    .setIssuer(apnsConfig.teamId)
    .setIssuedAt(now)
    .sign(privateKey);

  apnsJwtCache = {
    token,
    expiresAtMs: Date.now() + 50 * 60 * 1000
  };
  return token;
}

function normalizeApnsToken(token) {
  return String(token || "")
    .trim()
    .replace(/[<>\s]/g, "");
}

function isInvalidApnsReason(reason) {
  return [
    "BadDeviceToken",
    "DeviceTokenNotForTopic",
    "TopicDisallowed",
    "Unregistered"
  ].includes(reason);
}

function extractFcmErrorCode(payload) {
  const details = payload?.error?.details;
  if (!Array.isArray(details)) return "";
  const fcmError = details.find((item) => item?.["@type"]?.includes("google.firebase.fcm.v1.FcmError"));
  return fcmError?.errorCode || "";
}

export async function sendNativePush(device, payload) {
  if (!device?.provider || !device?.token || !payload?.title || !payload?.body) {
    return { ok: false, invalidToken: false, error: "Invalid push payload" };
  }

  if (device.provider === "fcm") {
    try {
      const accessToken = await getFcmAccessToken();
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${fcmConfig.projectId}/messages:send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            message: {
              token: device.token,
              notification: {
                title: payload.title,
                body: payload.body
              },
              data: toStringMap(payload.data)
            }
          })
        }
      );
      if (response.ok) {
        return { ok: true, invalidToken: false };
      }

      const responseBody = await response.json().catch(() => ({}));
      const fcmErrorCode = extractFcmErrorCode(responseBody);
      const invalidToken =
        fcmErrorCode === "UNREGISTERED" ||
        fcmErrorCode === "INVALID_ARGUMENT" ||
        response.status === 404;
      return {
        ok: false,
        invalidToken,
        error: responseBody?.error?.message || `FCM ${response.status}`
      };
    } catch (err) {
      return { ok: false, invalidToken: false, error: err instanceof Error ? err.message : "FCM error" };
    }
  }

  if (device.provider === "apns") {
    try {
      const jwt = await getApnsJwt();
      const token = normalizeApnsToken(device.token);
      const baseUrl = apnsConfig.useProduction
        ? "https://api.push.apple.com"
        : "https://api.sandbox.push.apple.com";
      const response = await fetch(`${baseUrl}/3/device/${token}`, {
        method: "POST",
        headers: {
          authorization: `bearer ${jwt}`,
          "apns-topic": apnsConfig.bundleId,
          "apns-push-type": "alert",
          "apns-priority": "10",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          aps: {
            alert: {
              title: payload.title,
              body: payload.body
            },
            sound: "default"
          },
          ...payload.data
        })
      });
      if (response.ok) {
        return { ok: true, invalidToken: false };
      }
      const responseBody = await response.json().catch(() => ({}));
      const reason = responseBody?.reason || `APNs ${response.status}`;
      return {
        ok: false,
        invalidToken: isInvalidApnsReason(reason),
        error: reason
      };
    } catch (err) {
      return { ok: false, invalidToken: false, error: err instanceof Error ? err.message : "APNs error" };
    }
  }

  return { ok: false, invalidToken: false, error: `Unsupported provider: ${device.provider}` };
}

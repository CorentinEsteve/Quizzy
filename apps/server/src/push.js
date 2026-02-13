import { SignJWT, importPKCS8 } from "jose";
import http2 from "node:http2";

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatError(err, fallback) {
  if (!err) return fallback;
  const message = err instanceof Error ? err.message : String(err);
  const code =
    typeof err === "object" && err !== null && "code" in err ? String(err.code) : "";
  const cause =
    err instanceof Error && err.cause
      ? err.cause instanceof Error
        ? err.cause.message
        : String(err.cause)
      : "";
  return [message, code ? `code=${code}` : "", cause ? `cause=${cause}` : ""]
    .filter(Boolean)
    .join(" | ");
}

async function sendApnsHttp2({ useProduction, token, jwt, bundleId, body }) {
  const authority = useProduction
    ? "https://api.push.apple.com"
    : "https://api.sandbox.push.apple.com";
  const client = http2.connect(authority);

  return await new Promise((resolve, reject) => {
    let settled = false;
    const finishResolve = (value) => {
      if (settled) return;
      settled = true;
      client.close();
      resolve(value);
    };
    const finishReject = (err) => {
      if (settled) return;
      settled = true;
      client.close();
      reject(err);
    };

    client.on("error", (err) => finishReject(err));

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json"
    });

    let status = 0;
    const chunks = [];

    req.on("response", (headers) => {
      status = Number(headers[":status"] || 0);
    });
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("error", (err) => finishReject(err));
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }
      finishResolve({ status, body: parsed, rawBody: text });
    });

    req.setEncoding("utf8");
    req.end(body);
  });
}

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
    const jwt = await getApnsJwt().catch((err) => {
      throw new Error(formatError(err, "APNs auth token error"));
    });
    const token = normalizeApnsToken(device.token);
    const requestBody = JSON.stringify({
      aps: {
        alert: {
          title: payload.title,
          body: payload.body
        },
        sound: "default"
      },
      ...payload.data
    });

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const response = await sendApnsHttp2({
          useProduction: apnsConfig.useProduction,
          token,
          jwt,
          bundleId: apnsConfig.bundleId,
          body: requestBody
        });
        if (response.status >= 200 && response.status < 300) {
          return { ok: true, invalidToken: false };
        }
        const reason = response.body?.reason || `APNs ${response.status} ${response.rawBody || ""}`.trim();
        return {
          ok: false,
          invalidToken: isInvalidApnsReason(reason),
          error: reason
        };
      } catch (err) {
        if (attempt < 2) {
          await sleep(300);
          continue;
        }
        return {
          ok: false,
          invalidToken: false,
          error: formatError(err, "APNs network error")
        };
      }
    }
  }

  return { ok: false, invalidToken: false, error: `Unsupported provider: ${device.provider}` };
}

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "qwizzy_dev_secret";
if (process.env.NODE_ENV === "production" && JWT_SECRET === "qwizzy_dev_secret") {
  throw new Error("JWT_SECRET must be set in production.");
}
const JWT_EXPIRES_IN = "7d";

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      displayName: user.display_name,
      country: user.country || "US",
      emailVerified: user.email_verified === 1 || user.email_verified === true
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ error: "Missing authorization header" });
  }
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) {
    return res.status(401).json({ error: "Invalid authorization header" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: payload.sub,
      email: payload.email,
      displayName: payload.displayName,
      country: payload.country || "US",
      emailVerified: payload.emailVerified === true
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

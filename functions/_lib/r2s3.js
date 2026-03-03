/**
 * Minimal S3-compatible R2 bucket wrapper for local development.
 *
 * When wrangler's remote-binding session can't reach *.workers.dev (e.g. network
 * restrictions), this module lets the Worker call R2's S3-compatible API directly
 * via fetch() + AWS Signature V4 using the credentials in .dev.vars.
 *
 * Exposes only the bucket.list() interface used by gallery.js.
 * Only depends on fetch() and crypto.subtle — both available in Workers runtime.
 *
 * Usage: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 * in .dev.vars. getBucket() in gallery.js picks this up automatically when those
 * vars are present.
 */

// SHA-256 of empty string — used for GET requests with no body.
const EMPTY_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

// RFC 3986 percent-encoding (stricter than encodeURIComponent for SigV4).
function rfc3986(s) {
  return encodeURIComponent(String(s)).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

function toHex(buf) {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256hex(data) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    typeof data === "string" ? new TextEncoder().encode(data) : data
  );
  return toHex(buf);
}

// keyMaterial: string (first call) or ArrayBuffer (chained calls)
async function hmacSha256(keyMaterial, data) {
  const keyBytes =
    typeof keyMaterial === "string"
      ? new TextEncoder().encode(keyMaterial)
      : keyMaterial;
  const k = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign(
    "HMAC",
    k,
    new TextEncoder().encode(data)
  );
}

// Decode XML character entities in key / prefix strings.
function xmlDecode(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCodePoint(parseInt(h, 16))
    )
    .replace(/&#([0-9]+);/g, (_, d) =>
      String.fromCodePoint(parseInt(d, 10))
    );
}

/**
 * Parse an S3 ListObjectsV2 XML response into the shape the native R2 binding
 * returns: { objects, delimitedPrefixes, truncated, cursor }.
 */
function parseListObjectsV2(xml) {
  const objects = [];
  for (const m of xml.matchAll(/<Key>([^<]*)<\/Key>/g)) {
    objects.push({ key: xmlDecode(m[1]) });
  }

  // <Prefix> appears both as a top-level echo of the query prefix AND inside
  // <CommonPrefixes>. Only collect the latter.
  const delimitedPrefixes = [];
  for (const m of xml.matchAll(
    /<CommonPrefixes>\s*<Prefix>([^<]*)<\/Prefix>\s*<\/CommonPrefixes>/g
  )) {
    delimitedPrefixes.push(xmlDecode(m[1]));
  }

  const tokenMatch = xml.match(
    /<NextContinuationToken>([^<]*)<\/NextContinuationToken>/
  );
  const truncatedMatch = xml.match(/<IsTruncated>([^<]*)<\/IsTruncated>/);

  return {
    objects,
    delimitedPrefixes,
    truncated: truncatedMatch
      ? truncatedMatch[1].trim() === "true"
      : false,
    cursor: tokenMatch ? xmlDecode(tokenMatch[1]) : undefined,
  };
}

/**
 * R2-compatible bucket class backed by the S3-compatible API.
 * Implements only list(), which is all gallery.js needs.
 */
class S3R2Bucket {
  constructor(env) {
    this._accountId = env.R2_ACCOUNT_ID;
    this._credentials = {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    };
    this._bucketName = env.R2_BUCKET_NAME;
    this._endpoint = `https://${this._accountId}.r2.cloudflarestorage.com`;
  }

  async list({ prefix = "", delimiter = "", cursor, limit = 1000 } = {}) {
    // Build query params, sorted for consistent SigV4 canonical query string.
    const params = [
      ["list-type", "2"],
      ["max-keys", String(limit)],
    ];
    if (delimiter) params.push(["delimiter", delimiter]);
    if (prefix) params.push(["prefix", prefix]);
    if (cursor) params.push(["continuation-token", cursor]);
    params.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

    const qs = params.map(([k, v]) => `${rfc3986(k)}=${rfc3986(v)}`).join("&");
    const url = `${this._endpoint}/${this._bucketName}?${qs}`;
    const host = `${this._accountId}.r2.cloudflarestorage.com`;

    // SigV4 timestamps
    const now = new Date();
    const amzDate = now
      .toISOString()
      .replace(/[:-]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
    const dateShort = amzDate.slice(0, 8);

    // Canonical request (headers are pre-sorted: host < x-amz-content-sha256 < x-amz-date)
    const canonicalHeaders =
      `host:${host}\n` +
      `x-amz-content-sha256:${EMPTY_SHA256}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

    const canonicalRequest = [
      "GET",
      `/${this._bucketName}`,
      qs,
      canonicalHeaders,
      signedHeaders,
      EMPTY_SHA256,
    ].join("\n");

    // String to sign
    const credScope = `${dateShort}/auto/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credScope,
      await sha256hex(canonicalRequest),
    ].join("\n");

    // Derived signing key
    let sigKey = await hmacSha256(
      `AWS4${this._credentials.secretAccessKey}`,
      dateShort
    );
    sigKey = await hmacSha256(sigKey, "auto");
    sigKey = await hmacSha256(sigKey, "s3");
    sigKey = await hmacSha256(sigKey, "aws4_request");
    const sig = toHex(await hmacSha256(sigKey, stringToSign));

    const authorization = [
      `AWS4-HMAC-SHA256 Credential=${this._credentials.accessKeyId}/${credScope}`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${sig}`,
    ].join(", ");

    const res = await fetch(url, {
      method: "GET",
      headers: {
        host,
        "x-amz-content-sha256": EMPTY_SHA256,
        "x-amz-date": amzDate,
        Authorization: authorization,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `R2 S3 list(prefix="${prefix}"): HTTP ${res.status} — ${body.slice(0, 300)}`
      );
    }

    return parseListObjectsV2(await res.text());
  }
}

/**
 * Returns an S3R2Bucket if all four credentials are present in env, else null.
 * In production none of these vars are set, so this returns null and the native
 * PHOTOS_BUCKET binding is used instead.
 */
function createS3Bucket(env) {
  if (
    !env.R2_ACCOUNT_ID ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY ||
    !env.R2_BUCKET_NAME
  ) {
    return null;
  }
  return new S3R2Bucket(env);
}

export { createS3Bucket };

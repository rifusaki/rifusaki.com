#!/usr/bin/env node
"use strict";

/**
 * scripts/preprocess-photos.js
 *
 * Generates WebP thumbnails for all gallery photos in the R2 bucket and
 * uploads them back under the `_thumbs/` prefix:
 *
 *   _thumbs/400/<gallery>/<filename>.webp   – grid thumbnails & gallery covers
 *   _thumbs/2000/<gallery>/<filename>.webp  – lightbox view
 *
 * Run with npm run photos:process. Images whose 400px thumb already exists are skipped.
 * Requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 *
 * Flags:
 *   --force   Re-process and overwrite all existing thumbnails.
 */

const {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const sharp = require("sharp");
const dotenv = require("dotenv");

dotenv.config({ path: ".dev.vars" });


// Config
const THUMB_WIDTHS = { grid: 400, lightbox: 2000 };
const THUMB_PREFIX = "_thumbs";
const WEBP_QUALITY = { grid: 80, lightbox: 98 };
const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp", "avif", "gif"]);

const {
  R2_ACCOUNT_ID: accountId,
  R2_ACCESS_KEY_ID: accessKeyId,
  R2_SECRET_ACCESS_KEY: secretAccessKey,
  R2_BUCKET_NAME: bucketName = "tukuriva",
} = process.env;

const FORCE = process.argv.includes("--force");

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error(
    "ERROR: Missing R2 credentials. Ensure .dev.vars contains:\n" +
      "  R2_ACCOUNT_ID=<your-cloudflare-account-id>\n" +
      "  R2_ACCESS_KEY_ID=<r2-api-token-key>\n" +
      "  R2_SECRET_ACCESS_KEY=<r2-api-token-secret>\n" +
      "  R2_BUCKET_NAME=<bucket-name>   (defaults to 'tukuriva')\n\n" +
      "Create an R2 API token at:\n" +
      "  Cloudflare Dashboard → R2 → Manage R2 API Tokens"
  );
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});


// Helpers
function isImageKey(key) {
  const ext = (key.split(".").pop() || "").toLowerCase();
  return IMAGE_EXTS.has(ext);
}

/** Returns the R2 key for a processed thumbnail. */
function thumbKey(originalKey, width) {
  const lastDot = originalKey.lastIndexOf(".");
  const stem = lastDot !== -1 ? originalKey.slice(0, lastDot) : originalKey;
  return `${THUMB_PREFIX}/${width}/${stem}.webp`;
}

function fmtBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function pad(n, width) {
  return String(n).padStart(width, " ");
}


// R2 operations
async function keyExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/** Yields all image keys in the bucket, excluding the _thumbs/ prefix. */
async function* listSourceImages() {
  let ContinuationToken;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({ Bucket: bucketName, ContinuationToken })
    );
    for (const obj of res.Contents || []) {
      if (isImageKey(obj.Key) && !obj.Key.startsWith(THUMB_PREFIX + "/")) {
        yield obj.Key;
      }
    }
    ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (ContinuationToken);
}

async function downloadToBuffer(key) {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function uploadBuffer(key, buffer) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: "image/webp",
    })
  );
}


/**
 * Downloads one image, generates both thumbnail sizes, uploads them.
 * Returns "processed" | "skipped" | "failed".
 */
async function processImage(key, label) {
  const gridKey = thumbKey(key, THUMB_WIDTHS.grid);

  if (!FORCE && (await keyExists(gridKey))) {
    process.stdout.write(`${label} skip    ${key}\n`);
    return "skipped";
  }

  process.stdout.write(`${label} process ${key} …`);

  const original = await downloadToBuffer(key);

  const [gridBuf, lightboxBuf] = await Promise.all([
    sharp(original)
      .resize({ width: THUMB_WIDTHS.grid, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY.grid })
      .toBuffer(),
    sharp(original)
      .resize({ width: THUMB_WIDTHS.lightbox, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY.lightbox })
      .toBuffer(),
  ]);

  await Promise.all([
    uploadBuffer(gridKey, gridBuf),
    uploadBuffer(thumbKey(key, THUMB_WIDTHS.lightbox), lightboxBuf),
  ]);

  process.stdout.write(
    ` ${fmtBytes(original.length)} → ${fmtBytes(gridBuf.length)} / ${fmtBytes(lightboxBuf.length)}\n`
  );

  return "processed";
}

// Main

async function main() {
  console.log(`Bucket  : ${bucketName}`);
  console.log(`Endpoint: ${accountId}.r2.cloudflarestorage.com`);
  if (FORCE) console.log("Mode    : --force (re-processing all images)");
  console.log("\nScanning for source images…\n");

  const keys = [];
  for await (const key of listSourceImages()) keys.push(key);

  if (keys.length === 0) {
    console.log("No source images found in bucket.");
    return;
  }

  const w = String(keys.length).length;
  console.log(
    `Found ${keys.length} image(s). Generating WebP thumbs ` +
      `(${THUMB_WIDTHS.grid}px + ${THUMB_WIDTHS.lightbox}px)…\n`
  );

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < keys.length; i++) {
    const label = `  [${pad(i + 1, w)}/${keys.length}]`;
    try {
      const result = await processImage(keys[i], label);
      if (result === "skipped") skipped++;
      else processed++;
    } catch (err) {
      process.stdout.write("\n");
      console.error(`${label} ERROR   ${keys[i]}\n           ${err.message}\n`);
      failed++;
    }
  }

  const divider = "─".repeat(40);
  console.log(`\n${divider}`);
  console.log(`Processed : ${processed}`);
  console.log(`Skipped   : ${skipped}  (thumbnails already exist)`);
  if (failed > 0) console.log(`Failed    : ${failed}  (see errors above)`);
  console.log(divider);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

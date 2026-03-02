import { getBucket } from "../../_lib/gallery.js";

export async function onRequestGet(context) {
  try {
    const bucket = getBucket(context.env);
    const objectPathParam = context.params.path;

    if (!objectPathParam) {
      return new Response("Missing object path", { status: 400 });
    }

    const objectPath = objectPathParam
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment))
      .join("/");

    const object = await bucket.get(objectPath);

    if (!object) {
      return new Response("Not found", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "public, max-age=3600");

    return new Response(object.body, { headers });
  } catch (error) {
    return new Response(error.message || "Unable to fetch object", { status: 500 });
  }
}

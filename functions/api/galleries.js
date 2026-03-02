import { listTopLevelGalleries } from "../_lib/gallery.js";

export async function onRequestGet(context) {
  try {
    const galleries = await listTopLevelGalleries(context.env, context.request);
    const payload = galleries.map((gallery) => ({
      slug: gallery.slug,
      title: gallery.title,
      count: gallery.count,
      cover: gallery.cover,
    }));

    return new Response(JSON.stringify({ galleries: payload }), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=120",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Unable to list galleries" }),
      {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8" },
      }
    );
  }
}

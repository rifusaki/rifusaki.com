import { galleryBySlug } from "../../_lib/gallery.js";

export async function onRequestGet(context) {
  const { slug } = context.params;

  try {
    const gallery = await galleryBySlug(context.env, context.request, slug);

    if (!gallery) {
      return new Response(JSON.stringify({ error: "Gallery not found" }), {
        status: 404,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    return new Response(JSON.stringify(gallery), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=120",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Unable to load gallery" }),
      {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8" },
      }
    );
  }
}

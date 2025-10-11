import { db } from "@/db/drizzle";
import { images } from "@/db/schema";
import { auth } from "@/lib/auth";
import { nanoid } from "nanoid";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    // Authenticate the user
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse the request body
    const body = await req.json();
    const { prompt, conversationId, size = "1024x1024" } = body;

    if (!prompt || typeof prompt !== 'string') {
      return new Response('Invalid prompt', { status: 400 });
    }

    if (!conversationId || typeof conversationId !== 'string') {
      return new Response('Conversation ID is required', { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response('Server misconfigured: missing OPENAI_API_KEY', {
        status: 500,
      });
    }

    // Generate image with OpenAI Images API (gpt-image-1)
    const imageResp = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size, // "256x256" | "512x512" | "1024x1024"
      response_format: "url",
    });

    // Extract URL or base64 fallback
    let imageUrl: string | null = null;
    if (Array.isArray(imageResp.data) && imageResp.data[0]) {
      imageUrl =
        (imageResp.data[0] as any).url ||
        ((imageResp.data[0] as any).b64_json
          ? `data:image/png;base64,${(imageResp.data[0] as any).b64_json}`
          : null);
    }

    if (!imageUrl) {
      console.error("OpenAI returned no image:", imageResp);
      return new Response("No image returned from provider", { status: 502 });
    }

    // Save the image metadata into the database
    const imageId = nanoid(); // Generate a unique ID for the image
    await db.insert(images).values({
      id: imageId,
      prompt,
      imageUrl,
      conversationId,
      createdAt: new Date(),
    });

    // Respond with the saved image metadata
    return new Response(
      JSON.stringify({
        message: 'Image generated and saved successfully',
        image: {
          id: imageId,
          prompt,
          imageUrl,
          createdAt: new Date(),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating image:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
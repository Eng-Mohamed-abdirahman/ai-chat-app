import { db } from "@/db/drizzle";
import { images } from "@/db/schema";
import { auth } from "@/lib/auth";
import { nanoid } from "nanoid";

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
    const { prompt, conversationId } = body;

    if (!prompt || typeof prompt !== 'string') {
      return new Response('Invalid prompt', { status: 400 });
    }

    if (!conversationId || typeof conversationId !== 'string') {
      return new Response('Conversation ID is required', { status: 400 });
    }

    // Generate the image URL (replace this with your actual image generation logic)
    const imageUrl = `https://dummyimage.com/600x400/000/fff&text=${encodeURIComponent(prompt)}`;

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
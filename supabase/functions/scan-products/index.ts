import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Product {
  name: string;
  category: string;
  confidence: number;
  searchUrl?: string;
}

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData, videoId, isUrl } = await req.json();

    if (!imageData) {
      console.error("No image data provided");
      return new Response(
        JSON.stringify({ error: "No image data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Scanning products from frame for video:", videoId, "isUrl:", isUrl);

    // Build the image content for the AI request
    // If isUrl is true, the imageData is a URL; otherwise it's base64
    const imageContent = {
      type: "image_url" as const,
      image_url: {
        url: imageData
      }
    };

    // Call the AI Vision API to analyze the image
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a product identification AI expert. Analyze images to identify shoppable products including:
- Fashion items (clothing, shoes, accessories, jewelry, bags, watches)
- Electronics (phones, laptops, headphones, cameras, tablets, gaming devices)
- Home decor (furniture, lighting, decorations, kitchenware)
- Beauty products (makeup, skincare, haircare)
- Sports equipment (shoes, apparel, gear, accessories)
- Vehicles (cars, motorcycles, bicycles)

For each product you identify, provide:
1. A specific product name (be descriptive, e.g., "Black leather crossbody bag" not just "bag")
2. A category (Fashion, Electronics, Home, Beauty, Sports, Accessories, Automotive)
3. A confidence score (0.0 to 1.0)

Return ONLY a valid JSON array of products. No markdown, no explanations. Example format:
[{"name": "Navy Blue Blazer", "category": "Fashion", "confidence": 0.92}]

If no products are visible, return an empty array: []
Identify as many products as you can see in the image.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Identify all shoppable products visible in this image. Return a JSON array of products with name, category, and confidence score."
              },
              imageContent
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please upgrade your plan." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "[]";
    
    console.log("AI response content:", content);

    // Parse the AI response
    let products: Product[] = [];
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.replace(/^```json\n?/, "").replace(/\n?```$/, "");
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/^```\n?/, "").replace(/\n?```$/, "");
      }
      
      const parsed = JSON.parse(cleanContent);
      
      // Validate and enhance products
      if (Array.isArray(parsed)) {
        products = parsed
          .filter((p: unknown): p is { name: string; category: string; confidence?: number } => 
            typeof p === 'object' && p !== null && 'name' in p && 'category' in p
          )
          .map((p) => ({
            name: p.name,
            category: p.category,
            confidence: p.confidence || 0.8,
            searchUrl: `https://www.amazon.com/s?k=${encodeURIComponent(p.name)}`,
          }));
      } else {
        console.warn("AI response was not an array, resetting to empty");
        products = [];
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError, "Content:", content);
      products = [];
    }

    console.log("Identified products:", products.length);

    return new Response(
      JSON.stringify({ products }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in scan-products function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
import { NextResponse } from "next/server";

export async function GET() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: "No GEMINI_API_KEY found in .env.local" },
            { status: 500 }
        );
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message ||
                `Google API Error: ${response.status} ${response.statusText}`
            );
        }

        const data = await response.json();

        // Filter and sort the models
        const filteredModels = (data.models || [])
            .filter(model =>
                // Only keep models that can generate content (removes embedding-only models)
                model.supportedGenerationMethods?.includes("generateContent")
            )
            .sort((a, b) => {
                // Sort by displayName descending (usually puts newer/numbered models at top)
                return b.displayName.localeCompare(a.displayName);
            });

        return NextResponse.json({ models: filteredModels });

    } catch (error) {
        console.error("Error checking models:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch models" },
            { status: 500 }
        );
    }
}
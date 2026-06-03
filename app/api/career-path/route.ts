import { NextResponse } from "next/server"
import { generateFeatherlessJSON, FeatherlessServiceError } from "@/lib/services/featherlessService"

export async function POST(req: Request) {
  try {
    const { targetRole } = await req.json()

    if (!targetRole) {
      return NextResponse.json({ error: "targetRole is required" }, { status: 400 })
    }

    console.log(`[CareerPath API] Generating path for ${targetRole}`)

    const systemPrompt = `You are a Career Path Explorer AI. Map out a comprehensive sequential progression pathway for a given target role, starting from entry-level up to senior/architect level.

IMPORTANT: Return ONLY valid JSON, no markdown formatting or extra text.

Return a JSON object with this exact structure:
{
  "roles": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "experience": "string (e.g., '0-2 Years')",
      "skills": ["string"],
      "projects": ["string"],
      "salary": "string"
    }
  ]
}`

    const userPrompt = `Create a career progression pathway for this target role: ${targetRole}

Return only valid JSON matching the specified structure. Do not include markdown formatting or any text outside the JSON object.`

    const data = await generateFeatherlessJSON([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ])

    return NextResponse.json({ careerPath: data.roles || data.careerPath })
  } catch (error: any) {
    console.error("[CareerPath API] Error:", error.message)
    if (error instanceof FeatherlessServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Failed to generate career path" }, { status: 500 })
  }
}

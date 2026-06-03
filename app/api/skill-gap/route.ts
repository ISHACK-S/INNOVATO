import { NextResponse } from "next/server"
import { generateFeatherlessJSON, FeatherlessServiceError } from "@/lib/services/featherlessService"

export async function POST(req: Request) {
  try {
    const { targetRole, skills } = await req.json()

    if (!targetRole || !skills) {
      return NextResponse.json({ error: "targetRole and skills are required" }, { status: 400 })
    }

    console.log(`[SkillGap API] Analyzing gap for ${targetRole}`)

    const systemPrompt = `You are a Skill Gap Intelligence AI. Your task is to analyze a student's current skills against the industry standard requirements for a specific target role.

IMPORTANT: Return ONLY valid JSON, no markdown formatting or extra text.

Return a JSON object with this exact structure:
{
  "readinessScore": number (0-100),
  "presentSkills": ["string"],
  "missingSkills": ["string"],
  "recommendations": ["string"],
  "learningOrder": ["string"]
}

Ensure the learningOrder contains the missingSkills ordered logically for studying.`

    const userPrompt = `Analyze skill gap for target role: ${targetRole}\nCurrent Skills: ${skills.join(", ")}\n\nReturn only valid JSON matching the specified structure with no additional text or markdown.`

    const data = await generateFeatherlessJSON([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ])

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[SkillGap API] Error:", error.message)
    if (error instanceof FeatherlessServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Failed to generate skill gap intelligence" }, { status: 500 })
  }
}

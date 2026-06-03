import { NextResponse } from "next/server"
import { generateFeatherlessJSON, FeatherlessServiceError } from "@/lib/services/featherlessService"

export async function POST(req: Request) {
  try {
    const { skills, projects, hoursLearned } = await req.json()

    if (!skills || !projects || hoursLearned === undefined) {
      return NextResponse.json({ error: "skills, projects, and hoursLearned are required" }, { status: 400 })
    }

    console.log(`[Employability API] Analyzing student profile`)

    const systemPrompt = `You are an Employability Insights AI. Analyze a student's profile (skills, projects, learning hours) and generate analytics on their career readiness.

IMPORTANT: Return ONLY valid JSON, no markdown formatting or extra text.

Return a JSON object with this exact structure:
{
  "careerReadiness": number (0-100),
  "portfolioStrength": number (0-100),
  "skillGrowth": number (0-100),
  "recommendations": ["string"]
}

The scores should realistically reflect the profile provided. If they have very few skills or projects, keep the scores appropriately low.`

    const userPrompt = `Analyze this student profile:
Skills: ${skills.join(", ")}
Projects: ${projects.join(", ")}
Hours Learned: ${hoursLearned}

Return only valid JSON matching the specified structure with no additional text or markdown.`

    const data = await generateFeatherlessJSON([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ])

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[Employability API] Error:", error.message)
    if (error instanceof FeatherlessServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Failed to generate employability insights" }, { status: 500 })
  }
}

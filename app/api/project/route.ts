import { NextResponse } from 'next/server'
import { generateFeatherlessJSON, FeatherlessServiceError } from "@/lib/services/featherlessService"

export async function POST(req: Request) {
  try {
    const { skill, level, mode } = await req.json()

    if (!skill) {
      return NextResponse.json(
        { error: 'Skill is required' },
        { status: 400 }
      )
    }

    // Validate mode parameter
    const validMode = mode === 'suggest' || mode === 'guide' ? mode : 'guide'

    if (validMode === 'suggest') {
      // For suggestions, return structured project ideas
      const systemPrompt = `You are a Project Idea Generator. Suggest creative, realistic project ideas tailored to a skill and level.

IMPORTANT: Return ONLY valid JSON, no markdown formatting or extra text.

Return a JSON object with this exact structure:
{
  "projects": [
    {
      "title": "string",
      "description": "string",
      "difficulty": "beginner|intermediate|advanced",
      "duration": "string (e.g., '2-3 weeks')",
      "keySkills": ["string"],
      "portfolioValue": "high|medium|low",
      "overview": "string"
    }
  ]
}`

      const userPrompt = `Suggest 3 project ideas for ${skill} at ${level || 'beginner'} level.
Return only valid JSON matching the specified structure with no additional text or markdown.`

      const data = await generateFeatherlessJSON([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ])

      return NextResponse.json({ projects: data.projects || [] })

    } else {
      // For guide mode, return step-by-step implementation plan
      const systemPrompt = `You are an Expert Project Mentor. Provide detailed step-by-step implementation guidance for a project.

IMPORTANT: Return ONLY valid JSON, no markdown formatting or extra text.

Return a JSON object with this exact structure:
{
  "projectTitle": "string",
  "overview": "string",
  "learningOutcomes": ["string"],
  "tools": ["string"],
  "projectStructure": {
    "description": "string",
    "folders": ["string"]
  },
  "steps": [
    {
      "step": number,
      "title": "string",
      "description": "string",
      "details": ["string"],
      "expectedOutput": "string"
    }
  ],
  "estimatedTimeline": "string",
  "commonChallenges": ["string"],
  "nextSteps": ["string"]
}`

      const userPrompt = `Create a detailed implementation guide for building a project using ${skill} at ${level || 'beginner'} level.
Return only valid JSON matching the specified structure with no additional text or markdown.`

      const data = await generateFeatherlessJSON([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ])

      return NextResponse.json({ guide: data })
    }

  } catch (error: any) {
    console.error('Project guidance error:', error.message)
    if (error instanceof FeatherlessServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json(
      { error: 'Failed to generate project guidance' },
      { status: 500 }
    )
  }
}

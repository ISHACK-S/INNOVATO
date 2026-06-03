import { NextResponse } from 'next/server'
import { generateFeatherlessJSON, FeatherlessServiceError } from "@/lib/services/featherlessService"

export async function POST(req: Request) {
  try {
    const { skill } = await req.json()

    if (!skill) {
      return NextResponse.json(
        { error: 'Skill is required' },
        { status: 400 }
      )
    }

    const systemPrompt = `You are a skill validator. Your job is to check if the user's input is a valid professional tech/soft skill.

IMPORTANT: Return ONLY valid JSON, no markdown formatting or extra text.

Return a JSON object with this exact structure:
{
  "is_valid": true or false,
  "skill_name": "string (Standardized skill name if misspelled, or original)",
  "category": "string (e.g., Frontend, Backend, Data Science, Mobile, DevOps, etc)",
  "description": "string (short 1-sentence description)",
  "demand_level": "high|medium|low",
  "confidence_score": number (0-100),
  "validation_summary": "string (brief explanation of validity)",
  "reasons": {
    "pros": ["string"],
    "cons": ["string"]
  },
  "alternatives": ["string"] (optional - if skill is not valid, suggest alternatives)
}`

    const userPrompt = `Validate this skill: ${skill}

Return only valid JSON matching the specified structure with no additional text or markdown.`

    const data = await generateFeatherlessJSON([
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: userPrompt
      }
    ], { temperature: 0.1 })

    return NextResponse.json(data)

  } catch (error: any) {
    console.error('Skill validation error:', error.message)
    if (error instanceof FeatherlessServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json(
      { error: 'Failed to validate skill' },
      { status: 500 }
    )
  }
}
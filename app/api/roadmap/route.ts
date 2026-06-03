import { NextResponse } from 'next/server'
import { generateFeatherlessJSON, FeatherlessServiceError } from "@/lib/services/featherlessService"

export async function POST(req: Request) {
  try {
    const { skill, experience, timeCommitment, learningGoal } = await req.json()

    if (!skill) {
      return NextResponse.json(
        { error: 'Skill is required' },
        { status: 400 }
      )
    }

    console.log('[Roadmap API] Generating roadmap for', skill)

    const systemPrompt = `You are an expert curriculum architect. Your job is to create a detailed learning roadmap for a student.

IMPORTANT: Return ONLY valid JSON, no markdown formatting or extra text.

Return a JSON object with this exact structure:
{
  "skill_name": "string",
  "difficulty_level": "beginner|intermediate|advanced",
  "total_duration_months": number,
  "phases": [
    {
      "title": "string",
      "duration": "string",
      "topics": [
        {
          "name": "string",
          "why_important": "string",
          "time_hours": number
        }
      ],
      "projects": ["string"],
      "resources": [
        {
          "title": "string",
          "type": "string",
          "url": "string"
        }
      ]
    }
  ],
  "milestones": ["string"],
  "estimated_timeline": "string"
}`;

    const userPrompt = `Create a detailed learning roadmap with these parameters:
Skill: ${skill}
Experience Level: ${experience || 'beginner'}
Time Commitment: ${timeCommitment || '10'} hours per week
Learning Goal: ${learningGoal || 'get a job'}

Return only valid JSON matching the specified structure.`;

    const data = await generateFeatherlessJSON([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ])

    return NextResponse.json({ roadmap: data })

  } catch (error: any) {
    console.error('[Roadmap API] Error:', error.message)
    if (error instanceof FeatherlessServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json(
      { error: 'Failed to generate roadmap' },
      { status: 500 }
    )
  }
}

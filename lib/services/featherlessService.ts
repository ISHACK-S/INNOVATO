interface FeatherlessMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface FeatherlessOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export class FeatherlessServiceError extends Error {
  constructor(message: string, public status: number = 500, public details?: any) {
    super(message);
    this.name = "FeatherlessServiceError";
  }
}

export async function generateFeatherlessCompletion(
  messages: FeatherlessMessage[],
  options: FeatherlessOptions = {},
): Promise<string> {
  const apiKey = process.env.FEATHERLESS_API_KEY;
  const baseUrl = process.env.FEATHERLESS_BASE_URL || "https://api.featherless.ai/v1";
  
  const models = [
    options.model || process.env.FEATHERLESS_MODEL || "Qwen/Qwen3-14B",
    process.env.FEATHERLESS_FALLBACK_MODEL_1 || "Qwen/Qwen2.5-14B-Instruct",
    process.env.FEATHERLESS_FALLBACK_MODEL_2 || "meta-llama/Llama-3.1-8B-Instruct"
  ];

  if (!apiKey) {
    console.error("Missing FEATHERLESS_API_KEY environment variable");
    throw new FeatherlessServiceError("API key invalid or missing.", 500);
  }

  const basePayload = {
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 2000,
  };

  let lastError: any = null;

  for (let i = 0; i < models.length; i++) {
    const currentModel = models[i];
    console.log(`[FeatherlessService] Request - Model: ${currentModel} (Attempt ${i + 1})`);
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ ...basePayload, model: currentModel }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = await response.text();
        }
        
        console.error(`[FeatherlessService] Response Error (${response.status}) on model ${currentModel}:`, errorData);
        
        const isCapacityExhausted = typeof errorData === 'string' ? errorData.includes('capacity_exhausted') : JSON.stringify(errorData).includes('capacity_exhausted');
        const isTemporaryError = response.status === 503 || response.status === 502 || response.status === 500 || response.status === 429;

        if (isCapacityExhausted || isTemporaryError) {
          if (i < models.length - 1) {
            console.warn(`[FeatherlessService] AI service temporarily unavailable. Retrying with backup model... (${models[i + 1]})`);
            lastError = new FeatherlessServiceError("AI service temporarily unavailable. Retrying with backup model...", response.status, errorData);
            continue;
          }
        }

        throw new FeatherlessServiceError(`AI service unavailable. Status: ${response.status}`, response.status, errorData);
      }

      const data = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content;
      }

      throw new FeatherlessServiceError("No completion generated from Featherless AI.");
      
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.error(`[FeatherlessService] Request timed out on model ${currentModel}.`);
        if (i < models.length - 1) {
          console.warn(`[FeatherlessService] AI service temporarily unavailable. Retrying with backup model... (${models[i + 1]})`);
          lastError = new FeatherlessServiceError("Request timed out. Retrying with backup model...", 504);
          continue;
        }
        throw new FeatherlessServiceError("Request timed out.", 504);
      }
      
      console.error(`[FeatherlessService] Fetch error on model ${currentModel}:`, error.message);
      
      if (error.message.includes('fetch') || error.message.includes('network')) {
        if (i < models.length - 1) {
          console.warn(`[FeatherlessService] Provider unreachable. Retrying with backup model... (${models[i + 1]})`);
          lastError = new FeatherlessServiceError("Provider unreachable. Retrying with backup model...", 503, error.message);
          continue;
        }
      }
      
      if (error instanceof FeatherlessServiceError && !error.message.includes("Retrying with backup model")) {
        throw error;
      }
      
      if (i === models.length - 1) {
        throw new FeatherlessServiceError("Provider unreachable or network error.", 503, error.message);
      }
    }
  }

  throw lastError || new FeatherlessServiceError("AI service unavailable after all fallbacks failed.", 503);
}

export async function generateFeatherlessJSON(
  messages: FeatherlessMessage[],
  options: FeatherlessOptions = {}
): Promise<any> {
  const completion = await generateFeatherlessCompletion(messages, { ...options, temperature: 0.1 });
  
  try {
    // Clean and extract JSON from various response formats
    let jsonStr = completion.trim();
    
    // Remove markdown code block wrappers (```json ... ```)
    jsonStr = jsonStr.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '');
    
    // Try to extract JSON object if wrapped in text
    // Look for the first { and last } to extract potential JSON
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }
    
    // Clean up the string
    jsonStr = jsonStr.trim();
    
    // Fix common JSON formatting issues
    // Handle incomplete JSON by counting and fixing braces
    const openBraces = (jsonStr.match(/\{/g) || []).length;
    const closeBraces = (jsonStr.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      jsonStr += '}'.repeat(openBraces - closeBraces);
    }
    
    // Handle incomplete arrays
    const openBrackets = (jsonStr.match(/\[/g) || []).length;
    const closeBrackets = (jsonStr.match(/\]/g) || []).length;
    if (openBrackets > closeBrackets) {
      jsonStr += ']'.repeat(openBrackets - closeBrackets);
    }
    
    // Remove trailing commas before closing braces/brackets (common JSON formatting issue)
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
    
    // Parse and validate
    const parsed = JSON.parse(jsonStr);
    return parsed;
    
  } catch (error: any) {
    console.error("[FeatherlessService] Failed to parse JSON response:", completion);
    console.error("[FeatherlessService] Parse error details:", error.message);
    throw new FeatherlessServiceError("Failed to parse AI response into JSON format.", 500, error.message);
  }
}

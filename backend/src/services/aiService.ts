import OpenAI from 'openai';
import axios from 'axios';
import prisma from '../config/prisma';
import config from '../config';
import logger from '../config/logger';

export interface AiProvider {
  name: string;
  display: string;
  enabled: boolean;
  models: string[];
}

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiCompletionOptions {
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

// ============================================================
// AI ABSTRACTION LAYER - Provider interface
// ============================================================

abstract class BaseAiProvider {
  abstract name: string;
  abstract complete(messages: AiMessage[], options: AiCompletionOptions): Promise<string>;

  protected buildMessages(systemPrompt: string, messages: AiMessage[]): AiMessage[] {
    const systemMessage: AiMessage = { role: 'system', content: systemPrompt };
    return [systemMessage, ...messages];
  }
}

class OpenAIProvider extends BaseAiProvider {
  name = 'openai';
  private client: OpenAI;

  constructor() {
    super();
    this.client = new OpenAI({ apiKey: config.ai.openai.apiKey });
  }

  async complete(messages: AiMessage[], options: AiCompletionOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options.model || config.ai.openai.model,
      messages: this.buildMessages(options.systemPrompt || 'Du är en kunnig juridisk assistent inom svensk rätt.', messages),
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens || 4000,
    });

    return response.choices[0]?.message?.content || '';
  }
}

class ClaudeProvider extends BaseAiProvider {
  name = 'claude';

  async complete(messages: AiMessage[], options: AiCompletionOptions): Promise<string> {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: options.model || config.ai.claude.model,
        max_tokens: options.maxTokens || 4000,
        system: options.systemPrompt || 'Du är en kunnig juridisk assistent inom svensk rätt.',
        messages: messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      },
      {
        headers: {
          'x-api-key': config.ai.claude.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.content[0]?.text || '';
  }
}

class DeepSeekProvider extends BaseAiProvider {
  name = 'deepseek';

  async complete(messages: AiMessage[], options: AiCompletionOptions): Promise<string> {
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: options.model || config.ai.deepseek.model,
        messages: this.buildMessages(options.systemPrompt || 'Du är en kunnig juridisk assistent inom svensk rätt.', messages),
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens || 4000,
      },
      {
        headers: {
          'Authorization': `Bearer ${config.ai.deepseek.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0]?.message?.content || '';
  }
}

class GeminiProvider extends BaseAiProvider {
  name = 'gemini';

  async complete(messages: AiMessage[], options: AiCompletionOptions): Promise<string> {
    const systemPrompt = options.systemPrompt || 'Du är en kunnig juridisk assistent inom svensk rätt.';
    const content = messages.map(m => m.content).join('\n');

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${options.model || config.ai.gemini.model}:generateContent?key=${config.ai.gemini.apiKey}`,
      {
        contents: [{ parts: [{ text: systemPrompt + '\n\n' + content }] }],
        generationConfig: { temperature: options.temperature ?? 0.3, maxOutputTokens: options.maxTokens || 4000 },
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    return response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
}

class MistralProvider extends BaseAiProvider {
  name = 'mistral';

  async complete(messages: AiMessage[], options: AiCompletionOptions): Promise<string> {
    const response = await axios.post(
      'https://api.mistral.ai/v1/chat/completions',
      {
        model: options.model || config.ai.mistral.model,
        messages: this.buildMessages(options.systemPrompt || 'Du är en kunnig juridisk assistent inom svensk rätt.', messages),
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens || 4000,
      },
      {
        headers: {
          'Authorization': `Bearer ${config.ai.mistral.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0]?.message?.content || '';
  }
}

// ============================================================
// AI SERVICE
// ============================================================

class AiService {
  private providers: Map<string, BaseAiProvider> = new Map();

  constructor() {
    this.registerProvider(new OpenAIProvider());
    this.registerProvider(new ClaudeProvider());
    this.registerProvider(new DeepSeekProvider());
    this.registerProvider(new GeminiProvider());
    this.registerProvider(new MistralProvider());
  }

  private registerProvider(provider: BaseAiProvider) {
    this.providers.set(provider.name, provider);
  }

  async getAvailableProviders(): Promise<AiProvider[]> {
    const settings = await prisma.systemSetting.findUnique({
      where: { settingKey: 'ai_providers' },
    });
    const val = settings?.settingValue as AiProvider[] | undefined;
    return Array.isArray(val) ? val : [];
  }

  async complete(
    messages: AiMessage[],
    userId: number,
    conversationId?: number,
    options: AiCompletionOptions = {}
  ): Promise<{ content: string; provider: string; model: string; tokens?: number }> {
    const providerName = options.provider || config.ai.defaultProvider;
    const model = options.model || config.ai.defaultModel;
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`AI-leverantör "${providerName}" är inte tillgänglig`);
    }

    const startTime = Date.now();
    let content = '';
    let tokens = 0;
    let status = 'success';
    let errorMessage = '';

    try {
      content = await provider.complete(messages, { ...options, model });
      tokens = Math.ceil(content.length / 4); // Estimate tokens

      logger.info(`AI completion from ${providerName}/${model}: ${content.length} chars`);
    } catch (error: any) {
      status = 'error';
      errorMessage = error.message;
      logger.error(`AI completion error from ${providerName}: ${error.message}`);
      throw error;
    } finally {
      const duration = Date.now() - startTime;

      // Log AI usage
      await prisma.aiLog.create({
        data: {
          userId,
          conversationId: conversationId || null,
          provider: providerName,
          model,
          promptTokens: Math.ceil(messages.reduce((a, m) => a + m.content.length, 0) / 4),
          completionTokens: tokens,
          totalTokens: Math.ceil(messages.reduce((a, m) => a + m.content.length, 0) / 4) + tokens,
          cost: 0, // Would need pricing tables
          durationMs: duration,
          endpoint: 'complete',
          status,
          errorMessage: errorMessage || null,
        },
      });
    }

    return { content, provider: providerName, model, tokens };
  }

  async analyzeDocument(text: string, userId: number): Promise<{ analysis: string; identifiedLaws: string[]; identifiedCases: string[] }> {
    const result = await this.complete(
      [{ role: 'user', content: `Analysera följande dokument och identifiera:
1. Vilka lagrum som är relevanta
2. Vilka rättsfall/prejudikat som kan vara relevanta
3. En sammanfattning av dokumentet
4. Eventuella fel eller problem

Dokument:
${text}` }],
      userId,
      undefined,
      { systemPrompt: 'Du är en erfaren svensk jurist som analyserar dokument. Svara på svenska med hänvisningar till specifika lagrum.' }
    );

    // Parse response for identified laws and cases
    const identifiedLaws: string[] = [];
    const identifiedCases: string[] = [];

    const lawMatches = result.content.match(/\d+\s*§\s*[a-zA-ZåäöÅÄÖ]+(?:lag|förordning|föreskrift)[a-zA-ZåäöÅÄÖ\s]*/gi);
    if (lawMatches) identifiedLaws.push(...lawMatches);

    const caseMatches = result.content.match(/(?:HFD|HD|RH|MÖD|Kammarrätten|Förvaltningsrätten)\s+\d+(?::\d+)?/gi);
    if (caseMatches) identifiedCases.push(...caseMatches);

    return {
      analysis: result.content,
      identifiedLaws: [...new Set(identifiedLaws)],
      identifiedCases: [...new Set(identifiedCases)],
    };
  }

  async generateAppeal(
    decisionText: string,
    userId: number,
    context?: { authority?: string; caseNumber?: string; additionalInfo?: string }
  ): Promise<{ appealText: string; simpleText: string; analysis: string }> {
    const result = await this.complete(
      [{ role: 'user', content: `Skriv ett professionellt överklagande baserat på följande myndighetsbeslut. 
Överklagandet ska vara i juridiskt korrekt svenska och innehålla hänvisningar till relevant lagstiftning och rättspraxis.

${context?.authority ? `Myndighet: ${context.authority}` : ''}
${context?.caseNumber ? `Ärendenummer: ${context.caseNumber}` : ''}
${context?.additionalInfo ? `Ytterligare information: ${context.additionalInfo}` : ''}

Beslut som ska överklagas:
${decisionText}` }],
      userId,
      undefined,
      {
        systemPrompt: 'Du är en erfaren svensk jurist specialiserad på förvaltningsrätt. Skriv ett formellt överklagande med korrekt juridisk struktur och språk. Inkludera rubriker som "Överklagande", "Yrkande", "Grunder" och "Bevisning".',
        temperature: 0.4,
      }
    );

    const simpleResult = await this.complete(
      [{ role: 'user', content: `Skriv om följande överklagande på enkel svenska så att en person utan juridisk utbildning förstår det:

${result.content}` }],
      userId,
      undefined,
      {
        systemPrompt: 'Du är en hjälpsam assistent som förklarar juridik på ett enkelt sätt. Använd vardagligt språk och förklara juridiska termer.',
        temperature: 0.5,
      }
    );

    return {
      appealText: result.content,
      simpleText: simpleResult.content,
      analysis: 'Överklagandet har genererats baserat på det inlämnade beslutet.',
    };
  }

  async searchLegalDatabase(query: string, userId: number): Promise<string> {
    // First search internal database
    const internalResults = await prisma.legalCase.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { summary: { contains: query } },
          { fullText: { contains: query } },
          { keywords: { path: '$', string_contains: query } },
        ],
        isApproved: true,
      },
      take: 5,
      orderBy: { year: 'desc' },
    });

    const internalContext = internalResults.length > 0
      ? `INTERNA RÄTTSFALL:\n${internalResults.map((r: any) => `- ${r.title} (${r.caseNumber}, ${r.court}, ${r.year})\n  ${r.summary?.substring(0, 200)}`).join('\n')}`
      : 'Inga interna rättsfall hittades.';

    // Then use AI with internet search capability
    const result = await this.complete(
      [{ role: 'user', content: `Sök efter relevant rättspraxis och lagstiftning för: "${query}"

${internalContext}

Använd din kunskap för att komplettera med ytterligare relevanta rättsfall, lagrum och prejudikat. Var specifik med case-nummer och lagrumshänvisningar. Nämn ALLTID källan för varje påstående.` }],
      userId,
      undefined,
      {
        systemPrompt: 'Du är en juridisk forskare med expertis inom svensk rätt. Sök efter rättsfall från HFD, HD, kammarrätter, förvaltningsrätter, samt relevant lagstiftning. Var noggrann med källhänvisningar. Svara på svenska.',
        temperature: 0.2,
      }
    );

    return result.content;
  }
}

export const aiService = new AiService();
export default aiService;
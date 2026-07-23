import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import aiService from '../services/aiService';
import logger from '../config/logger';

const router = Router();

// GET /api/ai/providers
router.get('/providers', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const providers = await aiService.getAvailableProviders();
    res.json({ providers });
  } catch (error) {
    logger.error('Get providers error:', error);
    res.status(500).json({ error: 'Kunde inte hämta AI-leverantörer' });
  }
});

// POST /api/ai/chat
router.post('/chat', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { message, conversationId, provider, model, myCaseId, contextDocuments } = req.body;

    if (!message) {
      res.status(400).json({ error: 'Meddelande krävs' });
      return;
    }

    let conversation: any;
    if (conversationId) {
      conversation = await prisma.aiConversation.findFirst({
        where: { id: conversationId, userId: req.user!.id },
        include: { messages: { orderBy: { createdAt: 'asc' } as any, take: 20 } },
      });

      if (!conversation) {
        res.status(404).json({ error: 'Konversation hittades inte' });
        return;
      }
    } else {
      const created = await prisma.aiConversation.create({
        data: {
          uuid: uuidv4(),
          userId: req.user!.id,
          myCaseId: myCaseId || null,
          title: message.substring(0, 100),
          aiProvider: provider || 'openai',
          aiModel: model || undefined,
          contextDocuments: contextDocuments || [],
        },
      });
      conversation = await prisma.aiConversation.findFirst({
        where: { id: created.id },
        include: { messages: { orderBy: { createdAt: 'asc' } as any, take: 20 } },
      });
    }

    if (!conversation) {
      res.status(500).json({ error: 'Kunde inte skapa eller hämta konversation' });
      return;
    }

    // Save user message
    await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
      },
    });

    // Build message history
    const priorMessages = (conversation.messages || []).map((m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    const messages = [
      ...priorMessages,
      { role: 'user' as const, content: message },
    ];

    // Check if there are context documents
    let systemPrompt = 'Du är en kunnig juridisk assistent inom svensk rätt. Hjälp användaren att förstå sina rättigheter, tolka myndighetsbeslut och navigera i välfärdssystemet. Var noggrann och hänvisa alltid till specifika lagrum när det är relevant. INFORMERA ALLTID användaren att du är en AI och att slutligt ansvar ligger hos användaren.';
    
    if (contextDocuments && contextDocuments.length > 0) {
      const docs = await prisma.document.findMany({
        where: { id: { in: contextDocuments }, userId: req.user!.id },
        select: { extractedText: true, originalFilename: true },
      });
      
      if (docs.length > 0) {
        systemPrompt += '\n\nSammanhang från användarens dokument:\n' +
          docs.map((d: { originalFilename: string; extractedText: string | null }) => `--- ${d.originalFilename} ---\n${d.extractedText?.substring(0, 2000)}`).join('\n\n');
      }
    }

    // Get AI response
    const result = await aiService.complete(
      messages,
      req.user!.id,
      conversation.id,
      { provider, model, systemPrompt }
    );

    // Save AI response
    const aiMessage = await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: result.content,
        tokensUsed: result.tokens,
        modelUsed: result.model,
      },
    });

    // Update conversation
    await prisma.aiConversation.update({
      where: { id: conversation.id },
      data: {
        messageCount: { increment: 2 },
        tokenCount: { increment: result.tokens || 0 },
        aiProvider: result.provider,
        aiModel: result.model,
      },
    });

    res.json({
      message: aiMessage,
      conversationId: conversation.id,
      provider: result.provider,
      model: result.model,
      disclaimer: 'AI kan ha fel. Kontrollera alltid informationen med en juridisk expert.',
    });
  } catch (error: any) {
    logger.error('AI chat error:', error);
    res.status(500).json({ error: error.message || 'AI-kommunikation misslyckades' });
  }
});

// GET /api/ai/conversations
router.get('/conversations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const [conversations, total] = await Promise.all([
      prisma.aiConversation.findMany({
        where: { userId: req.user!.id },
        include: {
          _count: { select: { messages: true } },
          myCase: { select: { title: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.aiConversation.count({ where: { userId: req.user!.id } }),
    ]);

    res.json({
      conversations: conversations.map((c: any) => ({
        id: c.id,
        uuid: c.uuid,
        title: c.title,
        aiProvider: c.aiProvider,
        aiModel: c.aiModel,
        messageCount: c._count.messages,
        tokenCount: c.tokenCount,
        isArchived: c.isArchived,
        caseTitle: c.myCase?.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('List conversations error:', error);
    res.status(500).json({ error: 'Kunde inte hämta konversationer' });
  }
});

// GET /api/ai/conversations/:id
router.get('/conversations/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const conversation = await prisma.aiConversation.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user!.id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        myCase: { select: { id: true, title: true } },
      },
    });

    if (!conversation) {
      res.status(404).json({ error: 'Konversation hittades inte' });
      return;
    }

    res.json(conversation);
  } catch (error) {
    logger.error('Get conversation error:', error);
    res.status(500).json({ error: 'Kunde inte hämta konversation' });
  }
});

// DELETE /api/ai/conversations/:id
router.delete('/conversations/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const conversation = await prisma.aiConversation.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user!.id },
    });

    if (!conversation) {
      res.status(404).json({ error: 'Konversation hittades inte' });
      return;
    }

    await prisma.aiConversation.delete({ where: { id: conversation.id } });
    res.json({ message: 'Konversationen har tagits bort' });
  } catch (error) {
    logger.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Kunde inte ta bort konversation' });
  }
});

// POST /api/ai/analyze-document
router.post('/analyze-document', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { documentId, text } = req.body;

    let documentText = text;
    if (documentId) {
      const doc = await prisma.document.findFirst({
        where: { id: documentId, userId: req.user!.id },
      });
      if (!doc) {
        res.status(404).json({ error: 'Dokument hittades inte' });
        return;
      }
      documentText = doc.extractedText || doc.ocrText || '';
    }

    if (!documentText) {
      res.status(400).json({ error: 'Ingen text att analysera' });
      return;
    }

    const analysis = await aiService.analyzeDocument(documentText, req.user!.id);

    res.json(analysis);
  } catch (error: any) {
    logger.error('Analyze document error:', error);
    res.status(500).json({ error: error.message || 'Analys misslyckades' });
  }
});

// POST /api/ai/generate-appeal
router.post('/generate-appeal', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { decisionText, authority, caseNumber, additionalInfo } = req.body;

    if (!decisionText) {
      res.status(400).json({ error: 'Beslutstext krävs' });
      return;
    }

    const result = await aiService.generateAppeal(decisionText, req.user!.id, {
      authority,
      caseNumber,
      additionalInfo,
    });

    res.json(result);
  } catch (error: any) {
    logger.error('Generate appeal error:', error);
    res.status(500).json({ error: error.message || 'Generering av överklagande misslyckades' });
  }
});

// POST /api/ai/search-legal
router.post('/search-legal', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { query } = req.body;

    if (!query) {
      res.status(400).json({ error: 'Sökfråga krävs' });
      return;
    }

    const result = await aiService.searchLegalDatabase(query, req.user!.id);

    res.json({ result, disclaimer: 'AI kan ha fel. Verifiera alltid rättsfall och lagrum med aktuella källor.' });
  } catch (error: any) {
    logger.error('Legal search error:', error);
    res.status(500).json({ error: error.message || 'Sökning misslyckades' });
  }
});

export default router;
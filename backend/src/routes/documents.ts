import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import prisma from '../config/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import logger from '../config/logger';
import config from '../config';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/tiff',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Filtypen stöds inte. Tillåtna typer: PDF, DOC, DOCX, TXT, JPG, PNG, TIFF'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.upload.maxFileSize },
});

// GET /api/documents
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const myCaseId = req.query.myCaseId as string;
    const isAdmin = ['admin', 'super_admin'].includes(req.user!.role);

    const where: any = isAdmin ? {} : { userId: req.user!.id };
    if (myCaseId) where.myCaseId = parseInt(myCaseId);

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          myCase: { select: { title: true } },
          _count: { select: { versions: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.document.count({ where }),
    ]);

    res.json({
      documents: documents.map(d => ({
        id: d.id,
        uuid: d.uuid,
        originalFilename: d.originalFilename,
        mimeType: d.mimeType,
        fileSize: d.fileSize,
        documentCategory: d.documentCategory,
        aiProcessed: d.aiProcessed,
        isApproved: d.isApproved,
        caseTitle: d.myCase?.title,
        versionCount: d._count.versions,
        createdAt: d.createdAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('List documents error:', error);
    res.status(500).json({ error: 'Kunde inte hämta dokument' });
  }
});

// POST /api/documents/upload
router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Ingen fil vald' });
      return;
    }

    const { myCaseId, appealCaseId, documentCategory, description } = req.body;

    const document = await prisma.document.create({
      data: {
        uuid: uuidv4(),
        userId: req.user!.id,
        myCaseId: myCaseId ? parseInt(myCaseId) : null,
        appealCaseId: appealCaseId ? parseInt(appealCaseId) : null,
        originalFilename: req.file.originalname,
        storedFilename: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        fileType: path.extname(req.file.originalname).toLowerCase().replace('.', ''),
        documentCategory: documentCategory || null,
        description: description || null,
      },
    });

    logger.info(`Document uploaded: ${document.originalFilename} by user ${req.user!.id}`);

    res.status(201).json(document);
  } catch (error) {
    logger.error('Upload document error:', error);
    res.status(500).json({ error: 'Uppladdning misslyckades' });
  }
});

// GET /api/documents/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const docId = parseInt(req.params.id);
    const isAdmin = ['admin', 'super_admin'].includes(req.user!.role);

    const document = await prisma.document.findFirst({
      where: isAdmin ? { id: docId } : { id: docId, userId: req.user!.id },
      include: {
        versions: { orderBy: { versionNumber: 'desc' } },
        myCase: { select: { id: true, title: true } },
      },
    });

    if (!document) {
      res.status(404).json({ error: 'Dokument hittades inte' });
      return;
    }

    res.json(document);
  } catch (error) {
    logger.error('Get document error:', error);
    res.status(500).json({ error: 'Kunde inte hämta dokument' });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const docId = parseInt(req.params.id);
    const isAdmin = ['admin', 'super_admin'].includes(req.user!.role);

    const document = await prisma.document.findFirst({
      where: isAdmin ? { id: docId } : { id: docId, userId: req.user!.id },
    });

    if (!document) {
      res.status(404).json({ error: 'Dokument hittades inte' });
      return;
    }

    // Delete physical file
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    await prisma.document.delete({ where: { id: docId } });
    res.json({ message: 'Dokumentet har tagits bort' });
  } catch (error) {
    logger.error('Delete document error:', error);
    res.status(500).json({ error: 'Kunde inte ta bort dokument' });
  }
});

export default router;
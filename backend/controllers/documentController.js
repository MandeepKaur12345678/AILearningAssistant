import Document from '../models/Document.js';
import FlashCard from '../models/FlashCard.js';
import Quiz from '../models/Quiz.js';

import { extractTextFromPDF } from '../utils/pdfParser.js';
import { chunkText } from '../utils/textChunker.js';

import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';

/**
 * Upload & process document
 */
export const uploadDocument = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const { title } = req.body;
        if (!title) {
            await fs.unlink(req.file.path).catch(() => {});
            return res.status(400).json({ success: false, error: 'Title is required' });
        }

        const baseUrl = `http://localhost:${process.env.PORT || 8000}`;
        const fileUrl = `${baseUrl}/uploads/documents/${req.file.filename}`;

        const document = await Document.create({
            userId: req.user._id,
            title,
            fileName: req.file.filename,
            filePath: fileUrl,
            fileSize: req.file.size,
            status: 'processing',
            uploadDate: new Date()
        });

        // background processing
        processPDF(document._id, req.file.path)
            .catch(err => console.error('Error processing PDF:', err));

        res.status(201).json({
            success: true,
            data: document,
            message: 'Document uploaded. Processing started...'
        });

    } catch (error) {
        if (req.file) await fs.unlink(req.file.path).catch(() => {});
        next(error);
    }
};


/**
 * Background PDF processing
 */
const processPDF = async (documentId, filePath) => {
    try {
        const { text } = await extractTextFromPDF(filePath);
        const chunks = chunkText(text, 500, 50);

        await Document.findByIdAndUpdate(documentId, {
            extractedText: text,
            chunks,
            status: 'ready'
        });

    } catch (error) {
        console.error('PDF Processing Failed:', error);
        await Document.findByIdAndUpdate(documentId, { status: 'failed' });
    }
};


/**
 * Get all documents
 */
export const getDocuments = async (req, res, next) => {
    try {
        const documents = await Document.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(req.user._id) } },
            {
                $lookup: {
                    from: 'flashcards',
                    localField: '_id',
                    foreignField: 'document',
                    as: 'flashCards'
                }
            },
            {
                $lookup: {
                    from: 'quizzes',
                    localField: '_id',
                    foreignField: 'document',
                    as: 'quizzes'
                }
            },
            {
                $addFields: {
                    flashCardCount: { $size: '$flashCards' },
                    quizCount: { $size: '$quizzes' }
                }
            },
            {
                $project: {
                    extractedText: 0,
                    chunks: 0,
                    flashCards: 0,
                    quizzes: 0
                }
            },
            { $sort: { uploadDate: -1 } }
        ]);

        res.json({
            success: true,
            count: documents.length,
            data: documents
        });

    } catch (error) {
        next(error);
    }
};


/**
 * Get single document
 */
export const getDocument = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid document ID' });
        }

        const document = await Document.findOne({
            _id: id,
            userId: req.user._id
        });

        if (!document) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }

        const flashCardCount = await FlashCard.countDocuments({
            document: document._id,
            userId: req.user._id
        });

        const quizCount = await Quiz.countDocuments({
            document: document._id,
            userId: req.user._id
        });

        document.lastAccessed = new Date();
        await document.save();

        const documentData = document.toObject();
        documentData.flashCardCount = flashCardCount;
        documentData.quizCount = quizCount;

        res.status(200).json({
            success: true,
            document: documentData
        });

    } catch (error) {
        next(error);
    }
};


/**
 * Delete document
 */
export const deleteDocument = async (req, res, next) => {
    try {
        const { id } = req.params;

        const document = await Document.findOneAndDelete({
            _id: id,
            userId: req.user._id
        });

        if (!document) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }

        const localPath = path.resolve(`uploads/documents/${document.fileName}`);
        await fs.unlink(localPath).catch(() => {});

        await FlashCard.deleteMany({ document: id });
        await Quiz.deleteMany({ document: id });

        res.json({
            success: true,
            message: 'Document deleted successfully'
        });

    } catch (error) {
        next(error);
    }
};


/**
 * Update title
 */
export const updateDocument = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, error: 'Title is required' });
        }

        const document = await Document.findOneAndUpdate(
            { _id: id, userId: req.user._id },
            { title },
            { new: true }
        );

        if (!document) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }

        res.json({ success: true, document });

    } catch (error) {
        next(error);
    }
};


/**
 * Generate flashcards
 */
export const generateFlashCards = async (req, res, next) => {
    try {
        const { id } = req.params;

        const document = await Document.findOne({
            _id: id,
            userId: req.user._id
        });

        if (!document) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }

        if (!document.chunks?.length) {
            return res.status(400).json({
                success: false,
                error: 'No chunks available to generate flashcards'
            });
        }

        const flashCards = document.chunks.map(chunk => ({
            question: `Explain: ${chunk.content.substring(0, 80)}...`,
            answer: chunk.content,
            document: document._id,
            userId: req.user._id
        }));

        const savedFlashCards = await FlashCard.insertMany(flashCards);

        res.status(201).json({
            success: true,
            count: savedFlashCards.length,
            flashCards: savedFlashCards
        });

    } catch (error) {
        next(error);
    }
};
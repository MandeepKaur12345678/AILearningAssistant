import Document from '../models/Document.js';
import FlashCard from '../models/FlashCard.js';
import Quiz from '../models/Quiz.js';

import { extractTextFromPDF } from '../utils/pdfParser.js';
import { chunkText } from '../utils/textChunker.js';

import fs from 'fs/promises';
import mongoose from 'mongoose';

/**
 * Upload & process document
 */
export const uploadDocument = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded',
                statusCode: 400
            });
        }

        const extractedText = await extractTextFromPDF(req.file.path);
        const chunks = chunkText(extractedText);

        const document = await Document.create({
            title: req.body.title || req.file.originalname,
            filePath: req.file.path,
            text: extractedText,
            chunks,
            user: req.user._id
        });

        res.status(201).json({
            success: true,
            document
        });
    } catch (error) {
        if (req.file) {
            await fs.unlink(req.file.path).catch(() => {});
        }
        next(error);
    }
};

/**
 * Get all documents of logged-in user
 */
export const getDocuments = async (req, res, next) => {
    try {
        const documents = await Document.find({ user: req.user._id })
            .select('-text')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            documents
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
            return res.status(400).json({
                success: false,
                error: 'Invalid document ID'
            });
        }

        const document = await Document.findOne({
            _id: id,
            user: req.user._id
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found'
            });
        }

        res.json({
            success: true,
            document
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
            user: req.user._id
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found'
            });
        }

        if (document.filePath) {
            await fs.unlink(document.filePath).catch(() => {});
        }

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
 * Update document title
 */
export const updateDocument = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title } = req.body;

        const document = await Document.findOneAndUpdate(
            { _id: id, user: req.user._id },
            { title },
            { new: true }
        );

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found'
            });
        }

        res.json({
            success: true,
            document
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Generate flashcards from document chunks
 */
export const generateFlashCards = async (req, res, next) => {
    try {
        const { id } = req.params;

        const document = await Document.findOne({
            _id: id,
            user: req.user._id
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found'
            });
        }

        const flashCards = document.chunks.map(chunk => ({
            question: `Explain: ${chunk.content.substring(0, 80)}...`,
            answer: chunk.content,
            document: document._id,
            user: req.user._id
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

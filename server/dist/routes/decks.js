"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const Deck_1 = __importDefault(require("../models/Deck"));
const Class_1 = __importDefault(require("../models/Class"));
const Card_1 = __importDefault(require("../models/Card"));
const User_1 = __importDefault(require("../models/User"));
const router = (0, express_1.Router)();
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { deckName, description, userId, classId } = req.body;
        if (!(deckName === null || deckName === void 0 ? void 0 : deckName.trim()) || !userId) {
            res.status(400).json({
                error: 'Deck name and user ID are required'
            });
            return;
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            res.status(400).json({ error: 'Invalid user ID' });
            return;
        }
        const user = yield User_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        if (classId) {
            if (!mongoose_1.default.Types.ObjectId.isValid(classId)) {
                res.status(400).json({ error: 'Invalid class ID' });
                return;
            }
            const classroom = yield Class_1.default.findById(classId);
            if (!classroom) {
                res.status(404).json({ error: 'Class not found' });
                return;
            }
            const isMember = classroom.owner.toString() === userId ||
                classroom.members.some((member) => member.toString() === userId) ||
                classroom.instructors.some((instructor) => instructor.toString() === userId);
            if (!isMember) {
                res.status(403).json({
                    error: 'You must be a member of this class to add decks'
                });
                return;
            }
            const deck = yield Deck_1.default.create({
                deckName: deckName.trim(),
                description: (description === null || description === void 0 ? void 0 : description.trim()) || '',
                userId,
                numCards: 0
            });
            yield Class_1.default.findByIdAndUpdate(classId, {
                $addToSet: { decks: deck._id }
            });
            res.status(201).json({
                message: 'Deck created successfully',
                deck
            });
            return;
        }
        const deck = yield Deck_1.default.create({
            deckName: deckName.trim(),
            description: (description === null || description === void 0 ? void 0 : description.trim()) || '',
            userId,
            numCards: 0
        });
        res.status(201).json({
            message: 'Deck created successfully',
            deck
        });
    }
    catch (error) {
        console.error('Error creating deck:', error);
        res.status(500).json({ error: 'Unable to create deck' });
    }
}));
// Get all decks created by a user.
router.get('/user/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            res.status(400).json({ error: 'Invalid user ID' });
            return;
        }
        const decks = yield Deck_1.default.find({ userId });
        res.status(200).json({ decks });
    }
    catch (error) {
        console.error('Error retrieving decks:', error);
        res.status(500).json({ error: 'Unable to retrieve decks' });
    }
}));
// Add a flashcard to a deck.
router.post('/:deckId/cards', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { deckId } = req.params;
        const { front, back } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(deckId)) {
            res.status(400).json({ error: 'Invalid deck ID' });
            return;
        }
        if (!(front === null || front === void 0 ? void 0 : front.trim()) || !(back === null || back === void 0 ? void 0 : back.trim())) {
            res.status(400).json({
                error: 'Both the front and back of the card are required'
            });
            return;
        }
        const deck = yield Deck_1.default.findById(deckId);
        if (!deck) {
            res.status(404).json({ error: 'Deck not found' });
            return;
        }
        const cardCount = yield Card_1.default.countDocuments({ deckId });
        const card = yield Card_1.default.create({
            front: front.trim(),
            back: back.trim(),
            deckId,
            index: cardCount
        });
        const updatedDeck = yield Deck_1.default.findByIdAndUpdate(deckId, { $inc: { numCards: 1 } }, { new: true });
        res.status(201).json({
            message: 'Flashcard created successfully',
            card,
            deck: updatedDeck
        });
    }
    catch (error) {
        console.error('Error creating flashcard:', error);
        res.status(500).json({ error: 'Unable to create flashcard' });
    }
}));
// Get one deck and its flashcards.
router.get('/:deckId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { deckId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(deckId)) {
            res.status(400).json({ error: 'Invalid deck ID' });
            return;
        }
        const deck = yield Deck_1.default.findById(deckId);
        if (!deck) {
            res.status(404).json({ error: 'Deck not found' });
            return;
        }
        const cards = yield Card_1.default.find({ deckId }).sort({ index: 1 });
        res.status(200).json({
            deck,
            cards
        });
    }
    catch (error) {
        console.error('Error retrieving deck:', error);
        res.status(500).json({ error: 'Unable to retrieve deck' });
    }
}));
// Delete a deck and its flashcards.
router.delete('/:deckId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { deckId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(deckId)) {
            res.status(400).json({ error: 'Invalid deck ID' });
            return;
        }
        const deck = yield Deck_1.default.findById(deckId);
        if (!deck) {
            res.status(404).json({ error: 'Deck not found' });
            return;
        }
        yield Card_1.default.deleteMany({ deckId });
        yield Class_1.default.updateMany({ decks: deckId }, { $pull: { decks: deckId } });
        yield Deck_1.default.findByIdAndDelete(deckId);
        res.status(200).json({
            message: 'Deck and its cards deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting deck:', error);
        res.status(500).json({ error: 'Unable to delete deck' });
    }
}));
exports.default = router;
//# sourceMappingURL=decks.js.map
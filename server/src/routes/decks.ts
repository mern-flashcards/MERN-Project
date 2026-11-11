
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

import Deck from '../models/Deck';
import Class from '../models/Class';
import Card from '../models/Card';
import User from '../models/User';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { deckName, description, userId, classId } = req.body;

    if (!deckName?.trim() || !userId) {
      res.status(400).json({
        error: 'Deck name and user ID are required'
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (classId) {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        res.status(400).json({ error: 'Invalid class ID' });
        return;
      }

      const classroom = await Class.findById(classId);

      if (!classroom) {
        res.status(404).json({ error: 'Class not found' });
        return;
      }

      const isMember =
        classroom.owner.toString() === userId ||
        classroom.members.some(
          (member: mongoose.Types.ObjectId) =>
            member.toString() === userId
        ) ||
        classroom.instructors.some(
          (instructor: mongoose.Types.ObjectId) =>
            instructor.toString() === userId
        );

      if (!isMember) {
        res.status(403).json({
          error: 'You must be a member of this class to add decks'
        });
        return;
      }

      const deck = await Deck.create({
        deckName: deckName.trim(),
        description: description?.trim() || '',
        userId,
        numCards: 0
      });

      await Class.findByIdAndUpdate(classId, {
        $addToSet: { decks: deck._id }
      });

      res.status(201).json({
        message: 'Deck created successfully',
        deck
      });
      return;
    }

    const deck = await Deck.create({
      deckName: deckName.trim(),
      description: description?.trim() || '',
      userId,
      numCards: 0
    });

    res.status(201).json({
      message: 'Deck created successfully',
      deck
    });
  } catch (error) {
    console.error('Error creating deck:', error);
    res.status(500).json({ error: 'Unable to create deck' });
  }
});

// Get all decks created by a user.
router.get('/user/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const decks = await Deck.find({ userId });

    res.status(200).json({ decks });
  } catch (error) {
    console.error('Error retrieving decks:', error);
    res.status(500).json({ error: 'Unable to retrieve decks' });
  }
});

// Add a flashcard to a deck.
router.post('/:deckId/cards', async (req: Request, res: Response): Promise<void> => {
  try {
    const { deckId } = req.params;
    const { front, back } = req.body;

    if (!mongoose.Types.ObjectId.isValid(deckId)) {
      res.status(400).json({ error: 'Invalid deck ID' });
      return;
    }

    if (!front?.trim() || !back?.trim()) {
      res.status(400).json({
        error: 'Both the front and back of the card are required'
      });
      return;
    }

    const deck = await Deck.findById(deckId);

    if (!deck) {
      res.status(404).json({ error: 'Deck not found' });
      return;
    }

    const cardCount = await Card.countDocuments({ deckId });

    const card = await Card.create({
      front: front.trim(),
      back: back.trim(),
      deckId,
      index: cardCount
    });

    const updatedDeck = await Deck.findByIdAndUpdate(
      deckId,
      { $inc: { numCards: 1 } },
      { new: true }
    );

    res.status(201).json({
      message: 'Flashcard created successfully',
      card,
      deck: updatedDeck
    });
  } catch (error) {
    console.error('Error creating flashcard:', error);
    res.status(500).json({ error: 'Unable to create flashcard' });
  }
});

// Get one deck and its flashcards.
router.get('/:deckId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { deckId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(deckId)) {
      res.status(400).json({ error: 'Invalid deck ID' });
      return;
    }

    const deck = await Deck.findById(deckId);

    if (!deck) {
      res.status(404).json({ error: 'Deck not found' });
      return;
    }

    const cards = await Card.find({ deckId }).sort({ index: 1 });

    res.status(200).json({
      deck,
      cards
    });
  } catch (error) {
    console.error('Error retrieving deck:', error);
    res.status(500).json({ error: 'Unable to retrieve deck' });
  }
});

// Delete a deck and its flashcards.
router.delete('/:deckId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { deckId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(deckId)) {
      res.status(400).json({ error: 'Invalid deck ID' });
      return;
    }

    const deck = await Deck.findById(deckId);

    if (!deck) {
      res.status(404).json({ error: 'Deck not found' });
      return;
    }

    await Card.deleteMany({ deckId });

    await Class.updateMany(
      { decks: deckId },
      { $pull: { decks: deckId } }
    );

    await Deck.findByIdAndDelete(deckId);

    res.status(200).json({
      message: 'Deck and its cards deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting deck:', error);
    res.status(500).json({ error: 'Unable to delete deck' });
  }
});

export default router;

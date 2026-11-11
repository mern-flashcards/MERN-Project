
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

import User from '../models/User';
import Class from '../models/Class';

const router = Router();

// Create a class
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, ownerId } = req.body;

    if (!name || !ownerId) {
      res.status(400).json({
        error: 'Class name and owner ID are required'
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(ownerId)) {
      res.status(400).json({ error: 'Invalid owner ID' });
      return;
    }

    const owner = await User.findById(ownerId);

    if (!owner) {
      res.status(404).json({ error: 'Owner not found' });
      return;
    }

    const classroom = await Class.create({
      name: name.trim(),
      description: description || '',
      owner: ownerId,
      members: [ownerId],
      instructors: [],
      decks: []
    });

    await User.findByIdAndUpdate(ownerId, {
      $addToSet: { classes: classroom._id }
    });

    res.status(201).json({
      message: 'Class created successfully',
      class: classroom
    });
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({ error: 'Unable to create class' });
  }
});

// Join a class using its class code
router.post('/join', async (req: Request, res: Response): Promise<void> => {
  try {
    const { classCode, userId } = req.body;

    if (!classCode || !userId) {
      res.status(400).json({
        error: 'Class code and user ID are required'
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

    const classroom = await Class.findOne({
      classCode: classCode.trim().toUpperCase()
    });

    if (!classroom) {
      res.status(404).json({ error: 'Invalid class code' });
      return;
    }

    await User.findByIdAndUpdate(userId, {
      $addToSet: { classes: classroom._id }
    });

    await Class.findByIdAndUpdate(classroom._id, {
      $addToSet: { members: userId }
    });

    const updatedClass = await Class.findById(classroom._id)
      .populate('decks');

    res.status(200).json({
      message: 'Successfully joined class',
      class: updatedClass
    });
  } catch (error) {
    console.error('Error joining class:', error);
    res.status(500).json({ error: 'Unable to join class' });
  }
});

// Get all classes belonging to a user
router.get('/user/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const user = await User.findById(userId).populate({
      path: 'classes',
      populate: { path: 'decks' }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({
      classes: user.classes
    });
  } catch (error) {
    console.error('Error retrieving classes:', error);
    res.status(500).json({ error: 'Unable to retrieve classes' });
  }
});

// Get one class, including its members
router.get('/:classId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      res.status(400).json({ error: 'Invalid class ID' });
      return;
    }

    const classroom = await Class.findById(classId)
      .populate('decks')
      .populate('members', 'firstName lastName login email');

    if (!classroom) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }

    res.status(200).json({ class: classroom });
  } catch (error) {
    console.error('Error retrieving class:', error);
    res.status(500).json({ error: 'Unable to retrieve class' });
  }
});

// Update class name, description, or class code
router.patch('/:classId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;
    const { name, description, classCode, ownerId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      res.status(400).json({ error: 'Invalid class ID' });
      return;
    }

    const classroom = await Class.findById(classId);

    if (!classroom) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }

    if (!ownerId || String(classroom.owner) !== String(ownerId)) {
      res.status(403).json({ error: 'Only the class owner can edit this class' });
      return;
    }

    const updates: {
      name?: string;
      description?: string;
      classCode?: string;
    } = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'Class name cannot be empty' });
        return;
      }

      updates.name = name.trim();
    }

    if (description !== undefined) {
      if (typeof description !== 'string') {
        res.status(400).json({ error: 'Invalid description' });
        return;
      }

      updates.description = description.trim();
    }

    if (classCode !== undefined) {
      if (typeof classCode !== 'string' || !classCode.trim()) {
        res.status(400).json({ error: 'Class code cannot be empty' });
        return;
      }

      const normalizedCode = classCode.trim().toUpperCase();

      const existingClass = await Class.findOne({
        classCode: normalizedCode,
        _id: { $ne: classId }
      });

      if (existingClass) {
        res.status(409).json({ error: 'That class code is already in use' });
        return;
      }

      updates.classCode = normalizedCode;
    }

    const updatedClass = await Class.findByIdAndUpdate(
      classId,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('decks')
      .populate('members', 'firstName lastName login email');

    res.status(200).json({
      message: 'Class updated successfully',
      class: updatedClass
    });
  } catch (error) {
    console.error('Error updating class:', error);

    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    ) {
      res.status(409).json({ error: 'That class code is already in use' });
      return;
    }

    res.status(500).json({ error: 'Unable to update class' });
  }
});

// Remove a member from a class
router.delete(
  '/:classId/members/:memberId',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { classId, memberId } = req.params;
      const { ownerId } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(classId) ||
        !mongoose.Types.ObjectId.isValid(memberId) ||
        !mongoose.Types.ObjectId.isValid(ownerId)
      ) {
        res.status(400).json({ error: 'Invalid ID' });
        return;
      }

      const classroom = await Class.findById(classId);

      if (!classroom) {
        res.status(404).json({ error: 'Class not found' });
        return;
      }

      if (String(classroom.owner) !== String(ownerId)) {
        res.status(403).json({ error: 'Only the class owner can remove members' });
        return;
      }

      if (String(classroom.owner) === String(memberId)) {
        res.status(400).json({ error: 'The class owner cannot be removed' });
        return;
      }

      if (!classroom.members.some(
        (member) => String(member) === String(memberId)
      )) {
        res.status(404).json({ error: 'Member not found in this class' });
        return;
      }

      await Class.findByIdAndUpdate(classId, {
        $pull: { members: memberId }
      });

      await User.findByIdAndUpdate(memberId, {
        $pull: { classes: classId }
      });

      const updatedClass = await Class.findById(classId)
        .populate('decks')
        .populate('members', 'firstName lastName login email');

      res.status(200).json({
        message: 'Member removed successfully',
        class: updatedClass
      });
    } catch (error) {
      console.error('Error removing class member:', error);
      res.status(500).json({ error: 'Unable to remove member' });
    }
  }
);

export default router;

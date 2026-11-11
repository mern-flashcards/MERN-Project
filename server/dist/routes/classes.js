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
const User_1 = __importDefault(require("../models/User"));
const Class_1 = __importDefault(require("../models/Class"));
const router = (0, express_1.Router)();
// Create a class
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description, ownerId } = req.body;
        if (!name || !ownerId) {
            res.status(400).json({
                error: 'Class name and owner ID are required'
            });
            return;
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(ownerId)) {
            res.status(400).json({ error: 'Invalid owner ID' });
            return;
        }
        const owner = yield User_1.default.findById(ownerId);
        if (!owner) {
            res.status(404).json({ error: 'Owner not found' });
            return;
        }
        const classroom = yield Class_1.default.create({
            name: name.trim(),
            description: description || '',
            owner: ownerId,
            members: [ownerId],
            instructors: [],
            decks: []
        });
        yield User_1.default.findByIdAndUpdate(ownerId, {
            $addToSet: { classes: classroom._id }
        });
        res.status(201).json({
            message: 'Class created successfully',
            class: classroom
        });
    }
    catch (error) {
        console.error('Error creating class:', error);
        res.status(500).json({ error: 'Unable to create class' });
    }
}));
// Join a class using its class code
router.post('/join', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { classCode, userId } = req.body;
        if (!classCode || !userId) {
            res.status(400).json({
                error: 'Class code and user ID are required'
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
        const classroom = yield Class_1.default.findOne({
            classCode: classCode.trim().toUpperCase()
        });
        if (!classroom) {
            res.status(404).json({ error: 'Invalid class code' });
            return;
        }
        yield User_1.default.findByIdAndUpdate(userId, {
            $addToSet: { classes: classroom._id }
        });
        yield Class_1.default.findByIdAndUpdate(classroom._id, {
            $addToSet: { members: userId }
        });
        const updatedClass = yield Class_1.default.findById(classroom._id)
            .populate('decks');
        res.status(200).json({
            message: 'Successfully joined class',
            class: updatedClass
        });
    }
    catch (error) {
        console.error('Error joining class:', error);
        res.status(500).json({ error: 'Unable to join class' });
    }
}));
// Get all classes belonging to a user
router.get('/user/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            res.status(400).json({ error: 'Invalid user ID' });
            return;
        }
        const user = yield User_1.default.findById(userId).populate({
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
    }
    catch (error) {
        console.error('Error retrieving classes:', error);
        res.status(500).json({ error: 'Unable to retrieve classes' });
    }
}));
// Get one class, including its members
router.get('/:classId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { classId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(classId)) {
            res.status(400).json({ error: 'Invalid class ID' });
            return;
        }
        const classroom = yield Class_1.default.findById(classId)
            .populate('decks')
            .populate('members', 'firstName lastName login email');
        if (!classroom) {
            res.status(404).json({ error: 'Class not found' });
            return;
        }
        res.status(200).json({ class: classroom });
    }
    catch (error) {
        console.error('Error retrieving class:', error);
        res.status(500).json({ error: 'Unable to retrieve class' });
    }
}));
// Update class name, description, or class code
router.patch('/:classId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { classId } = req.params;
        const { name, description, classCode, ownerId } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(classId)) {
            res.status(400).json({ error: 'Invalid class ID' });
            return;
        }
        const classroom = yield Class_1.default.findById(classId);
        if (!classroom) {
            res.status(404).json({ error: 'Class not found' });
            return;
        }
        if (!ownerId || String(classroom.owner) !== String(ownerId)) {
            res.status(403).json({ error: 'Only the class owner can edit this class' });
            return;
        }
        const updates = {};
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
            const existingClass = yield Class_1.default.findOne({
                classCode: normalizedCode,
                _id: { $ne: classId }
            });
            if (existingClass) {
                res.status(409).json({ error: 'That class code is already in use' });
                return;
            }
            updates.classCode = normalizedCode;
        }
        const updatedClass = yield Class_1.default.findByIdAndUpdate(classId, { $set: updates }, { new: true, runValidators: true })
            .populate('decks')
            .populate('members', 'firstName lastName login email');
        res.status(200).json({
            message: 'Class updated successfully',
            class: updatedClass
        });
    }
    catch (error) {
        console.error('Error updating class:', error);
        if (typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 11000) {
            res.status(409).json({ error: 'That class code is already in use' });
            return;
        }
        res.status(500).json({ error: 'Unable to update class' });
    }
}));
// Remove a member from a class
router.delete('/:classId/members/:memberId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { classId, memberId } = req.params;
        const { ownerId } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(classId) ||
            !mongoose_1.default.Types.ObjectId.isValid(memberId) ||
            !mongoose_1.default.Types.ObjectId.isValid(ownerId)) {
            res.status(400).json({ error: 'Invalid ID' });
            return;
        }
        const classroom = yield Class_1.default.findById(classId);
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
        if (!classroom.members.some((member) => String(member) === String(memberId))) {
            res.status(404).json({ error: 'Member not found in this class' });
            return;
        }
        yield Class_1.default.findByIdAndUpdate(classId, {
            $pull: { members: memberId }
        });
        yield User_1.default.findByIdAndUpdate(memberId, {
            $pull: { classes: classId }
        });
        const updatedClass = yield Class_1.default.findById(classId)
            .populate('decks')
            .populate('members', 'firstName lastName login email');
        res.status(200).json({
            message: 'Member removed successfully',
            class: updatedClass
        });
    }
    catch (error) {
        console.error('Error removing class member:', error);
        res.status(500).json({ error: 'Unable to remove member' });
    }
}));
exports.default = router;
//# sourceMappingURL=classes.js.map
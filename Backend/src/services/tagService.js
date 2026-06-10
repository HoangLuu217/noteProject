const mongoose = require('mongoose');
const Tag = require('../model/Tag');
const Note = require('../model/Note');

const getTags = async (userId) => {
  return Tag.find({ userId }).sort({ name: 1 });
};

const getTagById = async (userId, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error('Invalid tag id');
    error.statusCode = 400;
    throw error;
  }

  const tag = await Tag.findOne({ _id: id, userId });
  if (!tag) {
    const error = new Error('Tag not found');
    error.statusCode = 404;
    throw error;
  }

  return tag;
};

const createTag = async (userId, payload) => {
  const { name, color = '#ffffff' } = payload;

  if (!name || !name.trim()) {
    const error = new Error('Name is required');
    error.statusCode = 400;
    throw error;
  }

  // Check if a tag with the same name already exists for this user (case-insensitive)
  const existingTag = await Tag.findOne({
    userId,
    name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
  });

  if (existingTag) {
    const error = new Error('Tag name already exists');
    error.statusCode = 409;
    throw error;
  }

  const tag = await Tag.create({
    userId,
    name: name.trim(),
    color,
  });

  return tag;
};

const updateTag = async (userId, id, payload) => {
  const tag = await getTagById(userId, id);
  const { name, color } = payload;

  if (typeof name === 'string') {
    if (!name.trim()) {
      const error = new Error('Name cannot be empty');
      error.statusCode = 400;
      throw error;
    }

    // Check if another tag with the same name exists for this user
    const existingTag = await Tag.findOne({
      userId,
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });

    if (existingTag) {
      const error = new Error('Tag name already exists');
      error.statusCode = 409;
      throw error;
    }

    tag.name = name.trim();
  }

  if (color !== undefined) {
    tag.color = color;
  }

  await tag.save();
  return tag;
};

const deleteTag = async (userId, id) => {
  const tag = await getTagById(userId, id);
  await tag.deleteOne();

  // Pull tag from any notes referencing it
  await Note.updateMany({ userId }, { $pull: { tags: id } });

  return tag;
};

module.exports = {
  getTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
};

import Category from '../models/Category.js';

export const listCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    return res.status(200).json({
      success: true,
      message: 'Categories retrieved',
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoryBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const category = await Category.findOne({ slug, isActive: true });

    if (!category) {
      const error = new Error('Category not found');
      error.status = 404;
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Category retrieved',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const category = await Category.create(req.body);
    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

    if (!category) {
      const error = new Error('Category not found');
      error.status = 404;
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndUpdate(id, { isActive: false }, { new: true });

    if (!category) {
      const error = new Error('Category not found');
      error.status = 404;
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Category deactivated successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

import * as productService from '../services/productService.js';
import { logAuditEvent } from '../services/auditService.js';
import Product from '../models/Product.js';

export const getProducts = async (req, res, next) => {
  try {
    const isStaff = ['super_admin', 'admin', 'inventory_manager'].includes(req.user?.role);
    const result = await productService.listProducts({
      ...req.query,
      includeUnpublished: isStaff && req.query.includeUnpublished === 'true',
    });

    res.json({
      success: true,
      message: 'Products retrieved.',
      data: result.products,
      meta: {
        total: result.total,
        page: result.page,
        pages: result.pages,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getProductBySlug = async (req, res, next) => {
  try {
    const isStaff = ['super_admin', 'admin', 'inventory_manager'].includes(req.user?.role);
    const { product, variants } = await productService.getProductBySlug(
      req.params.slug,
      isStaff
    );

    res.json({
      success: true,
      data: {
        ...product.toObject(),
        variants,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'PRODUCT_CREATED',
      targetModel: 'Product',
      targetId: product._id.toString(),
      details: { sku: product.sku, name: product.name },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Product piece created successfully.',
      data: product,
    });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'PRODUCT_UPDATED',
      targetModel: 'Product',
      targetId: product._id.toString(),
      details: { updatedFields: Object.keys(req.body) },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Product updated successfully.',
      data: product,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const { action, product } = await productService.archiveOrDeleteProduct(req.params.id);

    await logAuditEvent({
      actorId: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: action === 'archived' ? 'PRODUCT_ARCHIVED' : 'PRODUCT_DELETED',
      targetModel: 'Product',
      targetId: req.params.id,
      details: { action },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: action === 'archived'
        ? 'Product is associated with existing orders and was safely archived rather than deleted.'
        : 'Product deleted from database.',
      data: product,
    });
  } catch (err) {
    next(err);
  }
};

export const addProductImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { public_id, url, altText = '', isPrimary = false } = req.body;

    if (!public_id || !url) {
      const error = new Error('public_id and url are required for product gallery image.');
      error.status = 400;
      throw error;
    }

    const product = await productService.updateProduct(id, {
      $push: { images: { public_id, url, altText, isPrimary } },
    });

    res.status(200).json({
      success: true,
      message: 'Product gallery image added.',
      data: product,
    });
  } catch (err) {
    next(err);
  }
};

export const removeProductImage = async (req, res, next) => {
  try {
    const { id, publicId } = req.params;

    const product = await productService.updateProduct(id, {
      $pull: { images: { public_id: publicId } },
    });

    res.status(200).json({
      success: true,
      message: 'Product gallery image removed.',
      data: product,
    });
  } catch (err) {
    next(err);
  }
};

export const reorderProductImages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { images } = req.body;

    if (!Array.isArray(images)) {
      const error = new Error('Images array is required for reordering.');
      error.status = 400;
      throw error;
    }

    const product = await productService.updateProduct(id, { images });

    res.status(200).json({
      success: true,
      message: 'Product gallery image ordering updated.',
      data: product,
    });
  } catch (err) {
    next(err);
  }
};

export const setPrimaryProductImage = async (req, res, next) => {
  try {
    const { id, publicId } = req.params;
    const product = await productService.getProductBySlug(id, true).catch(() => null);

    // If id was ObjectId, update directly
    const productDoc = await Product.findById(id);
    if (!productDoc) {
      const error = new Error('Product not found.');
      error.status = 404;
      throw error;
    }

    productDoc.images.forEach((img) => {
      img.isPrimary = img.public_id === publicId;
    });

    await productDoc.save();

    res.status(200).json({
      success: true,
      message: 'Primary product image updated.',
      data: productDoc,
    });
  } catch (err) {
    next(err);
  }
};


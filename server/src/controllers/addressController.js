import Address from '../models/Address.js';

export const getMyAddresses = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const addresses = await Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Addresses retrieved',
      data: addresses,
    });
  } catch (error) {
    next(error);
  }
};

export const addAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const count = await Address.countDocuments({ user: userId });

    const isDefault = count === 0 ? true : Boolean(req.body.isDefault);

    if (isDefault) {
      await Address.updateMany({ user: userId }, { isDefault: false });
    }

    const address = await Address.create({
      ...req.body,
      user: userId,
      isDefault,
    });

    return res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: address,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (req.body.isDefault) {
      await Address.updateMany({ user: userId }, { isDefault: false });
    }

    const address = await Address.findOneAndUpdate(
      { _id: id, user: userId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!address) {
      const error = new Error('Address not found');
      error.status = 404;
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: address,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const address = await Address.findOneAndDelete({ _id: id, user: userId });

    if (!address) {
      const error = new Error('Address not found');
      error.status = 404;
      throw error;
    }

    // If deleted address was default, set another address as default if any remain
    if (address.isDefault) {
      const remaining = await Address.findOne({ user: userId });
      if (remaining) {
        remaining.isDefault = true;
        await remaining.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Address removed successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const setDefault = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    await Address.updateMany({ user: userId }, { isDefault: false });

    const address = await Address.findOneAndUpdate(
      { _id: id, user: userId },
      { isDefault: true },
      { new: true }
    );

    if (!address) {
      const error = new Error('Address not found');
      error.status = 404;
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Default address updated',
      data: address,
    });
  } catch (error) {
    next(error);
  }
};

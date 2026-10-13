/**
 * Renewal Controller
 * Handles renewal items, full step-by-step guides, and step completion progress
 */

const {
  getRenewalItems,
  getRenewalGuide,
  toggleRenewalStep
} = require('../services/renewalService');

/**
 * Get all documents requiring renewal
 * GET /api/renewals
 */
const getAllRenewals = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const items = await getRenewalItems(userId);
    res.setHeader('Cache-Control', 'private, max-age=5, stale-while-revalidate=10');
    return res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get detailed renewal dossier for a specific document
 * GET /api/renewals/:docId
 */
const getSingleRenewalGuide = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { docId } = req.params;
    const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';

    const dossier = await getRenewalGuide(userId, docId, forceRefresh);
    if (!forceRefresh) {
      res.setHeader('Cache-Control', 'private, max-age=10, stale-while-revalidate=30');
    }
    return res.status(200).json({
      success: true,
      data: dossier
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle completion of a renewal checklist step
 * POST /api/renewals/:docId/step-toggle
 */
const postStepToggle = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { docId } = req.params;
    const { stepId, completed } = req.body;

    if (!stepId) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errorCode: 'VALIDATION_ERROR',
        message: 'stepId is required'
      });
    }

    const updated = await toggleRenewalStep(userId, docId, stepId, completed);
    return res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRenewals,
  getSingleRenewalGuide,
  postStepToggle
};

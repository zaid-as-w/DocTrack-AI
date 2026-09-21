const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/auth');
const {
  classifyDocument,
  getCategories,
  batchClassify,
  getStatus
} = require('../controllers/classificationController');

// Classification routes (classify & batch require authentication)
router.post('/classify', authenticateJWT, classifyDocument);
router.get('/categories', getCategories);
router.post('/batch', authenticateJWT, batchClassify);
router.get('/status', getStatus);

module.exports = router;

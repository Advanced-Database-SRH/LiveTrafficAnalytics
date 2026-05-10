const express = require('express');
const multer = require('multer');
const chatController = require('../controllers/chatController');

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('image'), chatController.handleChat);

module.exports = router;
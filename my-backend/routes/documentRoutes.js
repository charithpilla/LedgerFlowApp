const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const upload = multer({ dest: "uploads/" });

const {
  submitDocument,
  getDocuments,
  updateDocument,
  uploadDocument,
  getInsights
} = require("../controllers/documentController");

router.use(authMiddleware);

router.get("/insights/spend", getInsights);
router.post("/upload", upload.single("file"), uploadDocument);
router.post("/", submitDocument);
router.get("/", getDocuments);
router.patch("/:id", updateDocument);

module.exports = router;

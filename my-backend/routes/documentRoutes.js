const express = require("express");

const router = express.Router();

const {
  submitDocument,
  getDocuments,
  updateDocument,
} = require("../controllers/documentController");

router.post("/", submitDocument);
router.get("/", getDocuments);
router.patch("/:id", updateDocument);

module.exports = router;

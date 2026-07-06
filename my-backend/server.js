const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const { supabase } = require("./config/supabase");

const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documentRoutes");
const { updateDocument } = require("./controllers/documentController");

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.patch("/api/documents/:id", updateDocument);

app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        return res.status(400).json({ success: false, message: "Invalid JSON payload" });
    }
    next(err);
});

app.get("/", (req, res) => {
    res.send("Backend is running!");
});

app.get("/test", (req, res) => {
    res.json({
        message: "Test route works!",
        supabaseConfigured: Boolean(supabase),
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
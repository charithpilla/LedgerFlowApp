const { supabaseAdmin } = require("../config/supabase");

const fallbackDocuments = [
  {
    id: "demo-doc-1",
    type: "Vendor Invoice",
    vendor: "Sri Krishna Traders",
    amount: 24500,
    category: "Office Supplies",
    status: "review",
    stage: 3,
    history: [
      { t: "Captured via portal upload", at: "09:13" },
      { t: "Data extracted — 1 line item", at: "09:14" },
      { t: "Routed to Manager for approval", at: "09:15" },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-doc-2",
    type: "Employee Reimbursement",
    vendor: "P. Mehta — Travel claim",
    amount: 8200,
    category: "Travel",
    status: "approved",
    stage: 4,
    history: [
      { t: "Submitted via mobile app", at: "08:40" },
      { t: "Approved by A. Rao", at: "11:15" },
    ],
    created_at: new Date().toISOString(),
  },
];
const useFallback = process.env.SUPABASE_USE_FALLBACK !== "false";

const normalizeDocument = (doc) => ({
  ...doc,
  id: doc.id || doc._id || `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  amount: Number(doc.amount || 0),
  stage: Number(doc.stage || 3),
  history: Array.isArray(doc.history) ? doc.history : [],
  created_at: doc.created_at || new Date().toISOString(),
});

exports.submitDocument = async (req, res) => {
  try {
    const payload = normalizeDocument({
      ...req.body,
      id: req.body?.id || `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      created_at: new Date().toISOString(),
      status: req.body?.status || "review",
      stage: req.body?.stage || 3,
      history: req.body?.history || [],
    });

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("documents")
        .insert({
          type: payload.type,
          vendor: payload.vendor,
          amount: payload.amount,
          category: payload.category,
          status: payload.status,
          stage: payload.stage,
          history: payload.history,
          created_at: payload.created_at,
        })
        .select()
        .single();

      if (!error && data) {
        return res.status(201).json({
          success: true,
          storage: "supabase",
          document: normalizeDocument(data),
        });
      }

      console.error("Supabase document insert failed:", error?.message || "unknown error");
    }

    if (useFallback) {
      fallbackDocuments.unshift(payload);
      return res.status(201).json({
        success: true,
        storage: "fallback",
        document: payload,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to save document",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error) {
        return res.json((data || []).map(normalizeDocument));
      }

      console.error("Supabase document fetch failed:", error?.message || "unknown error");
    }

    if (useFallback) {
      return res.json(fallbackDocuments.map(normalizeDocument));
    }

    return res.status(500).json({
      success: false,
      message: "Unable to load documents",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("documents")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        return res.json({
          success: true,
          storage: "supabase",
          document: normalizeDocument(data),
        });
      }

      console.error("Supabase document update failed:", error?.message || "unknown error");
    }

    if (useFallback) {
      const index = fallbackDocuments.findIndex((doc) => String(doc.id) === String(id));

      if (index !== -1) {
        fallbackDocuments[index] = {
          ...fallbackDocuments[index],
          ...updates,
        };

        return res.json({
          success: true,
          storage: "fallback",
          document: normalizeDocument(fallbackDocuments[index]),
        });
      }
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update document",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback if no key is provided
      return res.status(200).json({
        success: true,
        message: "File uploaded (AI disabled due to missing key)",
        extractedData: {
          vendor: "Manual Entry Required",
          amount: 0,
          category: "General",
          type: "Vendor Invoice",
        }
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    function fileToGenerativePart(path, mimeType) {
      return {
        inlineData: {
          data: Buffer.from(fs.readFileSync(path)).toString("base64"),
          mimeType
        },
      };
    }
    
    // Defaulting to image/jpeg for simplicity, but could be derived from req.file.mimetype
    const mimeType = req.file.mimetype || "image/jpeg";
    const imagePart = fileToGenerativePart(req.file.path, mimeType);

    const prompt = `
      Analyze this receipt/invoice. 
      Extract the following information and output ONLY a raw JSON object (no markdown formatting, no backticks, no intro):
      {
        "vendor": "Name of the business or vendor",
        "amount": Total amount as a number (e.g. 15.99),
        "category": "One of: Office Supplies, Utilities, Software & Subscriptions, Hardware, Travel, General",
        "type": "Vendor Invoice"
      }
    `;

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text().trim();
    
    // Clean up potential markdown blocks if the model ignored instructions
    const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const extractedData = JSON.parse(jsonStr);

    return res.status(200).json({
      success: true,
      message: "File uploaded and analyzed with AI successfully",
      extractedData: {
        vendor: extractedData.vendor || "Unknown Vendor",
        amount: extractedData.amount || 0,
        category: extractedData.category || "General",
        type: extractedData.type || "Vendor Invoice",
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "AI analysis failed: " + error.message,
    });
  }
};

exports.getInsights = async (req, res) => {
  try {
    let allDocs = [];
    if (!useFallback && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("documents").select("category, amount");
      if (!error && data) {
        allDocs = data;
      }
    } else {
      allDocs = fallbackDocuments;
    }

    const chartData = allDocs.reduce((acc, doc) => {
      if (!doc.category) return acc;
      acc[doc.category] = (acc[doc.category] || 0) + Number(doc.amount || 0);
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: Object.keys(chartData).length ? chartData : { 'No Data': 0 }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

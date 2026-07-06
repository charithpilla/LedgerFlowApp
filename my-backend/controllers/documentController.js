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
          id: payload.id,
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
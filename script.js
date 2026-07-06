const API_BASE_URL = "http://localhost:3000";

const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const documentForm = document.getElementById("documentForm");
const statusBox = document.getElementById("statusBox");
const documentList = document.getElementById("documentList");

function setStatus(message, isError = false) {
  if (!statusBox) return;
  statusBox.textContent = message;
  statusBox.style.color = isError ? "#dc2626" : "#16a34a";
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

async function registerUser(event) {
  event.preventDefault();

  const payload = {
    name: document.getElementById("registerName").value,
    email: document.getElementById("registerEmail").value,
    password: document.getElementById("registerPassword").value,
  };

  try {
    const data = await requestJson("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setStatus(`Registration successful: ${data.user?.email || payload.email}`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function loginUser(event) {
  event.preventDefault();

  const payload = {
    email: document.getElementById("loginEmail").value,
    password: document.getElementById("loginPassword").value,
  };

  try {
    const data = await requestJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setStatus(`Login successful for ${data.user?.email || payload.email}`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function submitDocument(event) {
  event.preventDefault();

  const payload = {
    type: document.getElementById("docType").value,
    vendor: document.getElementById("docVendor").value,
    amount: Number(document.getElementById("docAmount").value),
    category: document.getElementById("docCategory").value,
    status: "Pending",
  };

  try {
    const data = await requestJson("/api/documents", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setStatus(`Document submitted via ${data.storage || "backend"}`);
    documentForm.reset();
    loadDocuments();
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function loadDocuments() {
  try {
    const documents = await requestJson("/api/documents");
    if (!documentList) return;

    if (!documents.length) {
      documentList.innerHTML = "<li class='doc-card'><strong>No documents yet.</strong><span class='doc-meta'>Submit the form to create your first record.</span></li>";
      return;
    }

    const totalDocuments = documents.length;
    const totalAmount = documents.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const statDocuments = document.getElementById("statDocuments");
    if (statDocuments) {
      statDocuments.textContent = totalDocuments;
    }

    documentList.innerHTML = documents
      .map(
        (item) => `
          <li class="doc-card">
            <div class="doc-title">${item.type || "Document"}</div>
            <div class="doc-meta">${item.vendor || "Unknown vendor"} • ${item.category || "General"}</div>
            <div class="doc-amount">$${Number(item.amount || 0).toFixed(2)}</div>
            <span class="status pending">${item.status || "Pending"}</span>
          </li>`
      )
      .join("");
  } catch (error) {
    if (documentList) {
      documentList.innerHTML = "<li class='doc-card'><strong>Unable to load documents.</strong><span class='doc-meta'>The backend may still be starting up.</span></li>";
    }
  }
}

if (registerForm) {
  registerForm.addEventListener("submit", registerUser);
}

if (loginForm) {
  loginForm.addEventListener("submit", loginUser);
}

if (documentForm) {
  documentForm.addEventListener("submit", submitDocument);
}

loadDocuments();
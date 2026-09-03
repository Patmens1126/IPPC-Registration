const TSHIRT_LABELS = {
  yellow: { label: "Yellow", swatch: "#D4A017" },
  "blue-black": { label: "Blue-Black", swatch: "#1B2A4A" },
  red: { label: "Red", swatch: "#A32638" },
  white: { label: "White", swatch: "#F2EFEA" },
};

const feeInput = document.getElementById("program-fee");
const body = document.getElementById("registrants-body");
const statCount = document.getElementById("stat-count");
const statPaid = document.getElementById("stat-paid");
const statTotal = document.getElementById("stat-total");
const formError = document.getElementById("form-error");
const searchInput = document.getElementById("participant-search");

let registrants = [];
let programFee = 50;
let searchTerm = "";

// ---------- Auth guard ----------
async function guardSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    window.location.href = "index.html";
    return false;
  }
  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", data.session.user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    window.location.href = profile?.role === "user" ? "user-dashboard.html" : "index.html";
    return false;
  }
  return true;
}

document.getElementById("logout-btn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
});

// ---------- Status helpers ----------
function getStatus(paid, fee) {
  if (!paid || paid <= 0) return "unpaid";
  if (paid >= fee) return "paid";
  return "partial";
}

function statusBadgeHtml(paid, fee) {
  const status = getStatus(paid, fee);
  if (status === "paid") return `<span class="status-badge status-paid">PAID</span>`;
  if (status === "partial")
    return `<span class="status-badge status-partial">GHS ${paid.toFixed(2)} PAID</span>`;
  return `<span class="status-badge status-unpaid">NOT PAID</span>`;
}

// ---------- Data loading ----------
async function loadProgramFee() {
  const { data, error } = await supabaseClient
    .from("program_settings")
    .select("fee")
    .eq("id", 1)
    .maybeSingle();
  if (!error && data) {
    programFee = data.fee;
    feeInput.value = programFee;
  }
}

async function saveProgramFee(fee) {
  await supabaseClient.from("program_settings").upsert({ id: 1, fee });
}

async function loadRegistrants() {
  const { data, error } = await supabaseClient
    .from("registrants")
    .select("*")
    .order("created_at", { ascending: true });
  if (!error) {
    registrants = data || [];
    render();
  }
}

// ---------- Rendering ----------
function render() {
  statCount.textContent = registrants.length;
  const paidCount = registrants.filter((r) => getStatus(r.amount_paid, programFee) === "paid").length;
  statPaid.textContent = paidCount;
  const totalCollected = registrants.reduce((sum, r) => sum + Number(r.amount_paid), 0);
  statTotal.textContent = `GHS ${totalCollected.toFixed(2)}`;

  const visibleRegistrants = registrants.filter((registrant) => {
    const searchableText = `${registrant.name} ${registrant.contact} ${registrant.occupation}`.toLowerCase();
    return searchableText.includes(searchTerm);
  });

  if (visibleRegistrants.length === 0) {
    const message = registrants.length === 0
      ? "No registrants yet. Add the first participant above."
      : "No participants match your search.";
    body.innerHTML = `<tr class="empty-row"><td colspan="9">${message}</td></tr>`;
    return;
  }

  body.innerHTML = visibleRegistrants
    .map((r) => {
      const tshirt = TSHIRT_LABELS[r.tshirt_color] || { label: r.tshirt_color, swatch: "#ccc" };
      const amountPaid = Number(r.amount_paid) || 0;
      const paymentEditor = getStatus(amountPaid, programFee) === "paid"
        ? amountPaid.toFixed(2)
        : `<input class="payment-input" type="number" min="0" step="0.01" value="${amountPaid.toFixed(2)}" data-id="${r.id}" aria-label="Amount paid for ${escapeHtml(r.name)}" />`;
      return `
        <tr>
          <td>${escapeHtml(r.name)}</td>
          <td>${escapeHtml(r.contact)}</td>
          <td>${escapeHtml(r.occupation)}</td>
          <td><span class="swatch" style="background:${tshirt.swatch};"></span>${tshirt.label}</td>
          <td>${escapeHtml(r.tshirt_size || "medium")}</td>
          <td>${statusBadgeHtml(amountPaid, programFee)}</td>
          <td>${paymentEditor}</td>
          <td class="entered-cell">${formatDateTime(r.created_at)}</td>
          <td class="center-cell no-print"><button class="btn-delete" data-id="${r.id}">Remove</button></td>
        </tr>`;
    })
    .join("");

  body.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", () => deleteRegistrant(btn.dataset.id));
  });
  body.querySelectorAll(".payment-input").forEach((input) => {
    input.addEventListener("change", () => updatePayment(input.dataset.id, input.value));
  });
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// ---------- Mutations ----------
async function addRegistrant() {
  const name = document.getElementById("name").value.trim();
  const contact = document.getElementById("contact").value.trim();
  const occupation = document.getElementById("occupation").value.trim();
  const tshirt = document.getElementById("tshirt").value;
  const tshirtSize = document.getElementById("tshirt-size").value;
  const amountPaid = parseFloat(document.getElementById("amount-paid").value) || 0;

  formError.style.display = "none";

  if (!name || !contact || !occupation) {
    formError.textContent = "Name, contact, and occupation are required.";
    formError.style.display = "block";
    return;
  }

  const { error } = await supabaseClient.from("registrants").insert({
    name,
    contact,
    occupation,
    tshirt_color: tshirt,
    tshirt_size: tshirtSize,
    amount_paid: amountPaid,
  });

  if (error) {
    formError.textContent = "Could not save registrant: " + error.message;
    formError.style.display = "block";
    return;
  }

  document.getElementById("name").value = "";
  document.getElementById("contact").value = "";
  document.getElementById("occupation").value = "";
  document.getElementById("amount-paid").value = "";
  document.getElementById("tshirt").value = "yellow";
  document.getElementById("tshirt-size").value = "medium";

  await loadRegistrants();
}

async function deleteRegistrant(id) {
  await supabaseClient.from("registrants").delete().eq("id", id);
  await loadRegistrants();
}

async function updatePayment(id, value) {
  const amountPaid = parseFloat(value);
  if (!Number.isFinite(amountPaid) || amountPaid < 0) {
    formError.textContent = "Enter a valid payment amount.";
    formError.style.display = "block";
    render();
    return;
  }

  formError.style.display = "none";
  const { error } = await supabaseClient
    .from("registrants")
    .update({ amount_paid: amountPaid })
    .eq("id", id);

  if (error) {
    formError.textContent = "Could not update payment: " + error.message;
    formError.style.display = "block";
    return;
  }

  await loadRegistrants();
}

// ---------- Events ----------
document.getElementById("add-btn").addEventListener("click", addRegistrant);
document.getElementById("print-btn").addEventListener("click", () => window.print());
searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value.trim().toLowerCase();
  render();
});

feeInput.addEventListener("change", async () => {
  programFee = parseFloat(feeInput.value) || 0;
  await saveProgramFee(programFee);
  render();
});

// ---------- Init ----------
(async function init() {
  const ok = await guardSession();
  if (!ok) return;
  await loadProgramFee();
  await loadRegistrants();
})();

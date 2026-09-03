const statCount = document.getElementById("stat-count");
const formError = document.getElementById("form-error");
const registrationBody = document.getElementById("my-registration-body");
const TSHIRT_LABELS = {
  yellow: { label: "Yellow", swatch: "#D4A017" },
  "blue-black": { label: "Blue-Black", swatch: "#1B2A4A" },
  red: { label: "Red", swatch: "#A32638" },
  white: { label: "White", swatch: "#F2EFEA" },
};

function getAmountDue(reference) {
  return reference.trim().toLowerCase() === "soul" ? 50 : 100;
}

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
  if (profile?.role !== "user") {
    window.location.href = profile?.role === "admin" ? "dashboard.html" : "index.html";
    return false;
  }
  return true;
}

document.getElementById("logout-btn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
});

// ---------- Data ----------
let currentUserId = null;

// The RPC returns only the total count and never exposes registrant rows.
async function loadRegistrationCount() {
  const { data, error } = await supabaseClient.rpc("get_registration_count");
  if (!error) statCount.textContent = data ?? 0;
}

async function loadRegistrationStatus() {
  const { data, error } = await supabaseClient.rpc("has_my_registration");
  if (error) return;
  const hasRegistration = data === true;
  ["name", "contact", "occupation", "tshirt", "tshirt-size", "add-btn"].forEach((id) => {
    document.getElementById(id).disabled = hasRegistration;
  });
}

async function loadMyRegistration() {
  const { data, error } = await supabaseClient
    .from("registrants_user_view")
    .select("name, contact, occupation, reference, tshirt_color, tshirt_size, amount_due")
    .eq("user_id", currentUserId)
    .maybeSingle();
  if (error) return;
  if (!data) {
    registrationBody.innerHTML = `<tr class="empty-row"><td colspan="7">You have not registered yet.</td></tr>`;
    return;
  }
  const tshirt = TSHIRT_LABELS[data.tshirt_color] || { label: data.tshirt_color, swatch: "#ccc" };
  registrationBody.innerHTML = `<tr>
    <td>${escapeHtml(data.name)}</td>
    <td>${escapeHtml(data.contact)}</td>
    <td>${escapeHtml(data.occupation)}</td>
    <td>${escapeHtml(data.reference || "-")}</td>
    <td><span class="swatch" style="background:${tshirt.swatch};"></span>${tshirt.label}</td>
    <td>${escapeHtml(data.tshirt_size || "medium")}</td>
    <td>GHS ${Number(data.amount_due || getAmountDue(data.reference || "")).toFixed(2)}</td>
  </tr>`;
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value ?? "";
  return element.innerHTML;
}

// ---------- Insert one personal registration (amount_paid always defaults to 0) ----------
async function addRegistrant() {
  const name = document.getElementById("name").value.trim();
  const contact = document.getElementById("contact").value.trim();
  const occupation = document.getElementById("occupation").value.trim();
  const reference = document.getElementById("reference").value.trim();
  const tshirt = document.getElementById("tshirt").value;
  const tshirtSize = document.getElementById("tshirt-size").value;

  formError.style.display = "none";

  if (!name || !contact || !occupation) {
    formError.textContent = "Name, contact, and occupation are required.";
    formError.style.display = "block";
    return;
  }

  const { error } = await supabaseClient.from("registrants").insert({
    user_id: currentUserId,
    name,
    contact,
    occupation,
    reference: reference || null,
    amount_due: getAmountDue(reference),
    tshirt_color: tshirt,
    tshirt_size: tshirtSize,
  });

  if (error) {
    formError.textContent = "Could not save registrant: " + error.message;
    formError.style.display = "block";
    return;
  }

  document.getElementById("name").value = "";
  document.getElementById("contact").value = "";
  document.getElementById("occupation").value = "";
  document.getElementById("reference").value = "";
  document.getElementById("tshirt").value = "yellow";
  document.getElementById("tshirt-size").value = "medium";

  document.getElementById("name").disabled = true;
  document.getElementById("contact").disabled = true;
  document.getElementById("occupation").disabled = true;
  document.getElementById("tshirt").disabled = true;
  document.getElementById("add-btn").disabled = true;
  await loadRegistrationCount();
  await loadMyRegistration();
}

document.getElementById("add-btn").addEventListener("click", addRegistrant);

// ---------- Init ----------
(async function init() {
  const ok = await guardSession();
  if (!ok) return;
  const { data: { user } } = await supabaseClient.auth.getUser();
  currentUserId = user.id;
  await loadRegistrationCount();
  await loadRegistrationStatus();
  await loadMyRegistration();
})();

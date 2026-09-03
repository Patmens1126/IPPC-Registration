const TSHIRT_LABELS = {
  yellow: { label: "Yellow", swatch: "#D4A017" },
  "blue-black": { label: "Blue-Black", swatch: "#1B2A4A" },
  red: { label: "Red", swatch: "#A32638" },
  white: { label: "White", swatch: "#F2EFEA" },
};

const body = document.getElementById("registrants-body");
const statCount = document.getElementById("stat-count");
const formError = document.getElementById("form-error");

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

// The view excludes payment data and RLS limits it to the signed-in user's row.
async function loadRegistrants() {
  const { data, error } = await supabaseClient
    .from("registrants_user_view")
    .select("*")
    .eq("user_id", currentUserId)
    .order("created_at", { ascending: true });
  if (!error) render(data || []);
}

function render(registrants) {
  statCount.textContent = registrants.length;

  const hasRegistration = registrants.length > 0;
  ["name", "contact", "occupation", "tshirt", "tshirt-size", "add-btn"].forEach((id) => {
    document.getElementById(id).disabled = hasRegistration;
  });

  if (registrants.length === 0) {
    body.innerHTML = `<tr class="empty-row"><td colspan="5">You have not registered yet.</td></tr>`;
    return;
  }

  body.innerHTML = registrants
    .map((r) => {
      const tshirt = TSHIRT_LABELS[r.tshirt_color] || { label: r.tshirt_color, swatch: "#ccc" };
      return `
        <tr>
          <td>${escapeHtml(r.name)}</td>
          <td>${escapeHtml(r.contact)}</td>
          <td>${escapeHtml(r.occupation)}</td>
          <td><span class="swatch" style="background:${tshirt.swatch};"></span>${tshirt.label}</td>
          <td>${escapeHtml(r.tshirt_size || "medium")}</td>
        </tr>`;
    })
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// ---------- Insert one personal registration (amount_paid always defaults to 0) ----------
async function addRegistrant() {
  const name = document.getElementById("name").value.trim();
  const contact = document.getElementById("contact").value.trim();
  const occupation = document.getElementById("occupation").value.trim();
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
  document.getElementById("tshirt").value = "yellow";
  document.getElementById("tshirt-size").value = "medium";

  document.getElementById("name").disabled = true;
  document.getElementById("contact").disabled = true;
  document.getElementById("occupation").disabled = true;
  document.getElementById("tshirt").disabled = true;
  document.getElementById("add-btn").disabled = true;
  await loadRegistrants();
}

document.getElementById("add-btn").addEventListener("click", addRegistrant);

// ---------- Init ----------
(async function init() {
  const ok = await guardSession();
  if (!ok) return;
  const { data: { user } } = await supabaseClient.auth.getUser();
  currentUserId = user.id;
  await loadRegistrants();
})();

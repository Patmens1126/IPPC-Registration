const loginForm = document.getElementById("login-form");
const errorText = document.getElementById("error-text");
const loginBtn = document.getElementById("login-btn");

async function redirectAdmin(userId) {
  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) return false;
  if (profile.role !== "admin") return "wrong-role";
  window.location.href = "dashboard.html";
  return true;
}

supabaseClient.auth.getSession().then(({ data }) => {
  if (data.session) redirectAdmin(data.session.user.id);
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorText.style.display = "none";
  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in...";

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
  });

  loginBtn.disabled = false;
  loginBtn.textContent = "Login";

  if (error) {
    errorText.textContent = "Incorrect email or password.";
    errorText.style.display = "block";
    return;
  }

  const result = await redirectAdmin(data.user.id);
  if (result !== true) {
    await supabaseClient.auth.signOut();
    errorText.textContent = result === "wrong-role"
      ? "This account is not an administrator. Use the user login."
      : "Your account has not been assigned a role.";
    errorText.style.display = "block";
  }
});

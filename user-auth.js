const loginForm = document.getElementById("login-form");
const errorText = document.getElementById("error-text");
const loginBtn = document.getElementById("login-btn");

async function routeIfLoggedIn() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (profile?.role === "admin") window.location.href = "dashboard.html";
  else if (profile?.role === "user") window.location.href = "user-dashboard.html";
}

routeIfLoggedIn();

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorText.style.display = "none";
  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  loginBtn.disabled = false;
  loginBtn.textContent = "Login";

  if (error) {
    errorText.textContent = "Incorrect email or password.";
    errorText.style.display = "block";
    return;
  }

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  // Admin accounts are welcome here too — route them to the full dashboard.
  if (profile?.role === "admin") {
    await supabaseClient.auth.signOut();
    errorText.textContent = "This is an admin account. Use the admin login.";
    errorText.style.display = "block";
  } else if (profile?.role === "user") {
    window.location.href = "user-dashboard.html";
  } else {
    await supabaseClient.auth.signOut();
    errorText.textContent = "Your account has not been assigned a role.";
    errorText.style.display = "block";
  }
});

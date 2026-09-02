const loginForm = document.getElementById("login-form");
const errorText = document.getElementById("error-text");
const loginBtn = document.getElementById("login-btn");

// If already logged in, skip straight to the dashboard
supabaseClient.auth.getSession().then(({ data }) => {
  if (data.session) window.location.href = "dashboard.html";
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorText.style.display = "none";
  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  loginBtn.disabled = false;
  loginBtn.textContent = "Login";

  if (error) {
    errorText.textContent = "Incorrect email or password.";
    errorText.style.display = "block";
    return;
  }

  window.location.href = "dashboard.html";
});

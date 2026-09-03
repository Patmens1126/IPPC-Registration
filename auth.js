const loginForm = document.getElementById("login-form");
const errorText = document.getElementById("error-text");
const loginBtn = document.getElementById("login-btn");
const nameField = document.getElementById("name-field");
const phoneField = document.getElementById("phone-field");
const formTitle = document.getElementById("form-title");
const formSwitch = document.getElementById("form-switch");
const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("password-toggle");
let isSignup = false;

function confirmationRedirectUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

async function redirectForRole(userId) {
  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) return false;
  window.location.href = profile.role === "admin" ? "dashboard.html" : "user-dashboard.html";
  return true;
}

supabaseClient.auth.getSession().then(({ data }) => {
  if (data.session) redirectForRole(data.session.user.id);
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorText.style.display = "none";
  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (isSignup) {
    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    if (!name || !phone) {
      errorText.textContent = !name ? "Please enter your full name." : "Please enter your phone number.";
      errorText.style.display = "block";
      loginBtn.disabled = false;
      loginBtn.textContent = "Create account";
      return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, phone },
        emailRedirectTo: confirmationRedirectUrl(),
      },
    });
    loginBtn.disabled = false;
    loginBtn.textContent = "Create account";

    if (error) {
      errorText.textContent = error.message;
      errorText.style.display = "block";
      return;
    }

    if (!data.session) {
      errorText.textContent = "Account created. Check your email to confirm your account, then log in.";
      errorText.style.display = "block";
      return;
    }
    if (!(await redirectForRole(data.user.id))) {
      await supabaseClient.auth.signOut();
      errorText.textContent = "Your account was created, but its profile is not ready yet.";
      errorText.style.display = "block";
    }
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  loginBtn.disabled = false;
  loginBtn.textContent = "Login";

  if (error) {
    errorText.textContent = "Incorrect email or password.";
    errorText.style.display = "block";
    return;
  }

  if (!(await redirectForRole(data.user.id))) {
    await supabaseClient.auth.signOut();
    errorText.textContent = "Your account has not been assigned a role.";
    errorText.style.display = "block";
  }
});

function toggleSignupMode() {
  isSignup = !isSignup;
  nameField.hidden = !isSignup;
  phoneField.hidden = !isSignup;
  document.getElementById("name").required = isSignup;
  document.getElementById("phone").required = isSignup;
  formTitle.textContent = isSignup ? "Create account" : "User Login";
  loginBtn.textContent = isSignup ? "Create account" : "Login";
  formSwitch.innerHTML = isSignup
    ? 'Already registered? <button type="button" class="link-button" id="signup-toggle">Log in</button>'
    : 'New user? <button type="button" class="link-button" id="signup-toggle">Create an account</button>';
}

formSwitch.addEventListener("click", (event) => {
  if (event.target.id === "signup-toggle") toggleSignupMode();
});

passwordToggle.addEventListener("click", () => {
  const isVisible = passwordInput.type === "text";
  passwordInput.type = isVisible ? "password" : "text";
  passwordToggle.textContent = isVisible ? "Show" : "Hide";
  passwordToggle.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
  passwordToggle.setAttribute("aria-pressed", String(!isVisible));
});

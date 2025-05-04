import React, { useState } from "react";
import "./SignIn.css";
import { signInWithGoogle } from "../utils/storeFirestore";

function SignIn({ onSignIn }: { onSignIn: (username: string, password: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }
    setError("");
    onSignIn(username, password);
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      // Optionally, you can notify the parent App to update auth state
      window.location.reload(); // or call a callback to update App state
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
    }
  };

  return (
    <div className="signin-container">
      <form className="signin-form" onSubmit={handleSubmit}>
        <h2>Sign In</h2>
        {error && <div className="error-msg">{error}</div>}
        <div className="input-wrapper">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Enter username"
            required
          />
        </div>
        <div className="input-wrapper">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password"
            required
          />
        </div>
        <button className="btn primary" type="submit" style={{ width: "100%", marginTop: 10 }}>
          Sign In
        </button>
        <button
          type="button"
          className="btn google"
          style={{
            width: "100%",
            marginTop: 12,
            background: "#fff",
            color: "#444",
            border: "1.5px solid #4285f4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontWeight: 500
          }}
          onClick={handleGoogleSignIn}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" style={{ width: 22, height: 22 }} />
          Sign in with Google
        </button>
      </form>
    </div>
  );
}

export default SignIn;
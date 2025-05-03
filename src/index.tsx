import React from "react";
import ReactDOM from "react-dom/client";
import App from "./components/App";
import "./styles/style.css";

const rootDiv = document.getElementById("root");
const root = ReactDOM.createRoot(rootDiv!);
root.render(<App />);
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WaveformPage } from "./WaveformPage";

// biome-ignore lint/style/noNonNullAssertion: #root is in waveform/index.html
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<WaveformPage />
	</StrictMode>,
);

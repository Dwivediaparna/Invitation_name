<div align="center">

# ✨ Invitation Personalizer

### AI-Powered Personalized Invitation Video Generator

Generate stunning, AI-crafted invitation backgrounds and personalized video intros — all from your browser.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![Google Gemini](https://img.shields.io/badge/Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

</div>

---

## 📋 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Demo](#-demo)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
- [Deployment](#-deployment)
  - [GitHub Pages](#github-pages)
  - [Other Platforms](#other-platforms)
- [Project Structure](#-project-structure)
- [How It Works](#-how-it-works)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 About

**Invitation Personalizer** is a browser-based tool that helps you create beautiful, personalized invitation videos. Whether it's a wedding, celebration, or any special occasion, this app uses **Google Gemini AI** to generate gorgeous backgrounds and **FFmpeg (WASM)** to produce professional-quality video intros — all processed entirely in your browser with zero server-side rendering.

Perfect for Indian weddings with full **Hindi (Devanagari) text support** 🇮🇳

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎨 **AI Background Generation** | Generate stunning invitation backgrounds using Google Gemini's image generation model |
| 🏛️ **Multiple Themes** | Choose from Traditional Indian, Modern Minimalist, Romantic Floral, Royal Rajput, or Yellow Ganesha Card styles |
| 🎯 **Video Style Matching** | Upload a video and let AI analyze & match its visual style for a seamless background |
| ✏️ **Custom Prompts** | Describe your dream background and let AI create it for you |
| 🔤 **Multilingual Text** | Full support for English and Hindi (Devanagari) text on invitations |
| 🎬 **Video Generation** | Create 5-second personalized intro videos with guest names |
| 🔗 **Video Merging** | Optionally merge the generated intro with your original invitation video |
| 📱 **Responsive Design** | Works beautifully on desktop and mobile devices |
| 🔒 **Privacy First** | All video processing happens in-browser via FFmpeg WASM — nothing is uploaded to any server |

---

## 🎥 Demo

> Upload your invitation video → Choose an AI background style → Enter guest name → Generate a personalized video intro!

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| [Next.js 15](https://nextjs.org/) | React framework with App Router |
| [React 19](https://react.dev/) | UI library |
| [TypeScript 5.9](https://www.typescriptlang.org/) | Type safety |
| [Tailwind CSS 4](https://tailwindcss.com/) | Utility-first styling |
| [Shadcn UI](https://ui.shadcn.com/) | Pre-built accessible components |
| [Google Gemini AI](https://ai.google.dev/) | Background image generation & video style analysis |
| [FFmpeg WASM](https://ffmpegwasm.netlify.app/) | In-browser video processing |
| [Noto Serif Devanagari](https://fonts.google.com/noto/specimen/Noto+Serif+Devanagari) | Hindi/Devanagari font support |
| [Lucide React](https://lucide.dev/) | Icon library |
| [Motion](https://motion.dev/) | Animations |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x (or yarn/pnpm)
- A **Google Gemini API Key** ([Get one here](https://aistudio.google.com/apikey))

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/invitation-personalizer.git
cd invitation-personalizer

# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Required: Your Google Gemini API key (MUST have NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_GEMINI_API_KEY="your_gemini_api_key_here"

# Optional: App URL (for self-referential links)
APP_URL="http://localhost:3000"
```

> [!IMPORTANT]
> The variable **must** be named `NEXT_PUBLIC_GEMINI_API_KEY` (with the `NEXT_PUBLIC_` prefix). This prefix tells Next.js to embed the value into the client-side JavaScript bundle at build time. Without this prefix, the key will be `undefined` in the browser and AI background generation will silently fail.

### Running Locally

```bash
# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deployment

### GitHub Pages

This project is configured for automated deployment to GitHub Pages using GitHub Actions.

---

#### Step 1: Get a Gemini API Key

1. Go to **[Google AI Studio](https://aistudio.google.com/apikey)**
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the generated key (it starts with `AIza...`)

---

#### Step 2: Add the API Key as a GitHub Repository Secret

> [!CAUTION]
> The secret name **must be exactly** `NEXT_PUBLIC_GEMINI_API_KEY`. Any typo or different name will cause the AI background generation to fail silently (you'll see a plain golden fallback instead of the AI-generated Ganesha background).

Follow these steps carefully:

1. Go to your GitHub repository page
2. Click the **⚙️ Settings** tab (top menu bar, far right)
3. In the left sidebar, scroll down and click **"Secrets and variables"**
4. Click **"Actions"** from the dropdown
5. Click the green **"New repository secret"** button
6. Fill in the form:

   | Field | Value |
   |---|---|
   | **Name** | `NEXT_PUBLIC_GEMINI_API_KEY` |
   | **Secret** | Your Gemini API key (e.g., `AIzaSy...`) |

7. Click **"Add secret"**

> [!WARNING]
> **Common mistakes that will break the deployment:**
> - ❌ Using `GEMINI_API_KEY` (missing `NEXT_PUBLIC_` prefix)
> - ❌ Using `NEXT_PUBLIC_GEMINI_KEY` (wrong name)
> - ❌ Adding extra spaces or quotes around the key value
> - ❌ Setting it as an **Environment variable** instead of a **Secret**
> - ✅ Correct: Name = `NEXT_PUBLIC_GEMINI_API_KEY`, Value = `AIzaSy...` (no quotes)

---

#### Step 3: Enable GitHub Pages

1. In your repository, go to **⚙️ Settings**
2. Click **"Pages"** in the left sidebar
3. Under **"Build and deployment" → Source**, select **"GitHub Actions"** from the dropdown
4. Click **Save**

---

#### Step 4: Push & Deploy

```bash
# Add remote (replace with your actual repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to main — this triggers the GitHub Actions workflow automatically
git push -u origin main
```

The deployment will:
1. Install dependencies
2. Read `NEXT_PUBLIC_GEMINI_API_KEY` from your secret and embed it into the build
3. Build the static site to the `out/` directory
4. Deploy to GitHub Pages

---

#### Step 5: Verify the Deployment

1. Go to your repo → **Actions** tab to watch the build progress
2. Once complete, visit `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`
3. Select **"Yellow Ganesha Card"** theme → Click **"Generate Background"**
4. If you see an AI-generated golden card with Ganesha — ✅ the secret is working!
5. If you see a plain golden gradient with faint circles — ❌ the secret is not configured correctly. Go back to Step 2 and double-check.

---

#### Troubleshooting

| Problem | Solution |
|---|---|
| Background shows plain golden gradient (no Ganesha) | The API key is missing or named incorrectly. Verify the secret name is **exactly** `NEXT_PUBLIC_GEMINI_API_KEY` |
| Build fails in GitHub Actions | Check the Actions tab for error logs. Ensure `npm ci` succeeds |
| Page shows 404 | Ensure GitHub Pages Source is set to "GitHub Actions" (not "Deploy from a branch") |
| Changes don't appear after push | Wait 2-3 minutes. Check Actions tab for a running workflow |
| Need to update the API key | Go to Settings → Secrets → click on the secret → **"Update secret"** → paste new key → **re-run the workflow** (Actions → latest run → "Re-run all jobs") |

> [!NOTE]
> **Why does the key need to be a build-time secret?** This is a static site (no server). The Gemini API key is embedded directly into the JavaScript bundle during `npm run build`. The `NEXT_PUBLIC_` prefix is Next.js's convention for variables that should be available in the browser. The GitHub Actions workflow reads the secret and passes it as an environment variable during the build step.

> **⚠️ Security Note:** The Gemini API key will be visible in the client-side JavaScript bundle since this is a static export. For production use with sensitive keys, consider implementing a server-side proxy for API calls.

---

### Other Platforms

Since the app uses `output: 'export'` for static generation, it can be deployed to any static hosting:

| Platform | Command |
|---|---|
| **Vercel** | `vercel deploy` |
| **Netlify** | Drop the `out/` folder |
| **Firebase** | `firebase deploy` |
| **AWS S3** | Upload `out/` to S3 bucket |

> [!TIP]
> For **local builds** targeting other platforms, set the env var before building:
> ```bash
> NEXT_PUBLIC_GEMINI_API_KEY="AIzaSy..." npm run build
> ```

---

## 📁 Project Structure

```
invitation-personalizer/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD pipeline
├── app/
│   ├── globals.css             # Global styles & Tailwind/Shadcn theme
│   ├── layout.tsx              # Root layout with fonts
│   └── page.tsx                # Main application page
├── components/
│   └── ui/                     # Shadcn UI components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── progress.tsx
│       ├── select.tsx
│       ├── switch.tsx
│       └── textarea.tsx
├── hooks/
│   └── use-mobile.ts           # Mobile detection hook
├── lib/
│   └── utils.ts                # Utility functions (cn)
├── .env.example                # Environment variable template
├── .gitignore                  # Git ignore rules
├── components.json             # Shadcn UI configuration
├── next.config.ts              # Next.js configuration
├── package.json                # Dependencies & scripts
├── postcss.config.mjs          # PostCSS configuration
├── tsconfig.json               # TypeScript configuration
└── README.md                   # This file
```

---

## ⚙️ How It Works

```mermaid
flowchart TD
    A[User Selects Theme] --> B{Theme Type}
    B -->|Preset| C[Use Predefined Prompt]
    B -->|Custom| D[User Writes Prompt]
    B -->|Match Video| E[Extract Frame → Gemini Vision Analyzes Style]
    C --> F[Gemini AI Generates Background Image]
    D --> F
    E --> F
    F --> G[Canvas API Renders Invitation Frame]
    G --> H[FFmpeg WASM Creates 5s Intro Video]
    H --> I{Merge with Original?}
    I -->|Yes| J[FFmpeg Concatenates Videos]
    I -->|No| K[Output Intro Video]
    J --> L[Download Final Video 🎉]
    K --> L
```

1. **Background Generation** — Google Gemini's image generation model creates a beautiful background based on the selected theme or custom prompt
2. **Style Matching** — For "Match Original Video" mode, a frame is extracted and analyzed by Gemini Vision to describe the visual style
3. **Frame Rendering** — The Canvas API composites the background with personalized text (guest name, invitation text) in the appropriate font
4. **Video Creation** — FFmpeg WASM (running entirely in-browser) converts the static frame into a 5-second video
5. **Video Merging** — Optionally, the intro is concatenated with the original invitation video using FFmpeg's concat demuxer

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ by [Abhijat](https://github.com/abhijat)**

</div>

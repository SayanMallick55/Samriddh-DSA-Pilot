# Samriddh DSA Pilot 🚀

**Your AI-powered companion for mastering Data Structures and Algorithms.**

Samriddh DSA Pilot is a Chrome extension designed to help developers practice DSA problems on LeetCode through AI-generated progressive hints and C++ solutions. It encourages logical thinking, debugging, and independent problem-solving instead of immediately revealing the answer.

## ✨ Features

- **LeetCode Integration:** Reads the current problem title, description, and available editor code.
- **Progressive Hints:** Get hints in stages to work through a problem independently.
- **AI-Powered Assistance:** Uses Google's Gemini API to generate contextual guidance.
- **C++ Solution Support:** Request a complete C++ solution when you need one.
- **Learning-Focused Workflow:** Uses your current code and attempted approach as context for assistance.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| JavaScript | Chrome extension functionality |
| HTML & CSS | Extension interface |
| Chrome Extension APIs | Browser integration and local session storage |
| Node.js & Express | Backend API |
| Google Gemini API | AI-generated hints and solutions |
| LeetCode | DSA problem-solving platform |

## 🏗️ Project Structure

```text
Samriddh-DSA-Pilot/
├── manifest.json
├── background.js
├── content.js
├── page-bridge.js
├── popup.html
├── popup.css
├── popup.js
├── .gitignore
└── server/
    ├── server.js
    ├── package.json
    └── package-lock.json
```

## ⚙️ Getting Started

### Prerequisites

- Google Chrome
- Node.js and npm
- A Google Gemini API key

### 1. Clone the Repository

```bash
git clone https://github.com/SayanMallick55/Samriddh-DSA-Pilot.git
cd Samriddh-DSA-Pilot
```

### 2. Install Backend Dependencies

```bash
cd server
npm install
```

### 3. Configure Environment Variables

Create a `.env` file inside the `server` directory:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Replace the placeholder with your actual Gemini API key. Never commit your `.env` file or expose your API key publicly.

### 4. Start the Backend

From the `server` directory, run:

```bash
node server.js
```

Keep the backend running while using the extension. The extension is configured to communicate with `http://localhost:3000`.

### 5. Load the Chrome Extension

1. Open `chrome://extensions` in Google Chrome.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the cloned `Samriddh-DSA-Pilot` project folder containing `manifest.json`.
5. Open a LeetCode problem and click the extension icon.

## 🔐 Security

- Store your Gemini API key in `server/.env`.
- Keep `.env` and `node_modules/` out of version control.
- Never hardcode API keys in extension JavaScript or commit them to GitHub.
- The backend currently uses a local development URL. A deployed backend is required to use the extension without running the server locally.

## 🗺️ Roadmap

- [ ] Improve hint relevance based on the user's current approach.
- [ ] Avoid repeating earlier hints.
- [ ] Improve editor-code extraction reliability.
- [ ] Add support for more programming languages.
- [ ] Deploy the backend for easier access.
- [ ] Add a learning-progress dashboard.

## 🎯 Vision

The goal of Samriddh DSA Pilot is to make DSA practice more interactive and learning-oriented by helping developers understand the reasoning behind a solution rather than simply copying code.

## 🤝 Contributing

Contributions, suggestions, and bug reports are welcome. Feel free to fork the repository and submit a pull request.

## 📄 License

No license has been specified yet. Add a license before allowing others to reuse, modify, or distribute the project.

---

**Built with ❤️ for problem solvers.**

# IPL Fantasy League

A real-time fantasy cricket app built with React + Firebase.

## Prerequisites

- Node.js 18+
- A Firebase project with Firestore enabled
- A free CricketData.org API key (for live squad/match data)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure Firebase**  
   Edit `src/firebase/config.js` and paste your Firebase project credentials.

3. **Start the app**
   ```bash
   npm start
   ```
   Opens at `http://localhost:3000`

## First-time admin setup

1. Open the app and enter the default admin PIN: `0000`
2. Go to **League Setup** → change the PIN, set your player name, and generate a join link
3. Go to **Current Match** → create a match, load the player pool via the API or manually
4. Share the join link with friends so they can register and pick their teams

## Build for production

```bash
npm run build
```

Output goes to the `build/` folder — deploy to Firebase Hosting, Vercel, or any static host.

# BanChat

Real-time chat application with a React SPA and a Node.js API powered by Express and Socket.IO. Users can register, sign in, manage profiles, add friends, and exchange messages in rooms with live presence and typing indicators.

> Public demo for local exploration. Point the env files at your own MongoDB and secrets before running.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React (Create React App), React Router, Socket.IO client |
| Backend | Node.js, Express, Socket.IO |
| Data | MongoDB (official driver) |
| Auth | JWT + bcrypt password hashing |

## Features

- **Auth** — register and login with email/password; JWT protects API routes
- **Profiles** — name, bio, and profile photo upload
- **Friends** — search users, send/accept friend requests
- **Rooms & messages** — create/join rooms and persist chat history in MongoDB
- **Realtime** — Socket.IO for live messages, online/offline status, and typing indicators

## Project layout

```
.
├── React/          # SPA (CRA)
│   ├── src/        # components, auth context, socket client
│   └── .env.example
└── Node/           # Express + Socket.IO API
    ├── rutas/      # usuarios, salas, mensajes, amistades
    ├── middleware/ # JWT auth
    ├── db.js
    └── .env.example
```

## Run locally

**Requirements:** Node.js 18+, a running MongoDB instance.

### 1. API

```bash
cd Node
cp .env.example .env
# edit .env — see variables below
npm install
npm start
# or: node index.js
```

Default listen port is **3001** (override with `PORT`).

### 2. React app

```bash
cd React
cp .env.example .env
# REACT_APP_API_URL should match the API (default http://localhost:3001)
npm install
npm start
```

The SPA starts on port 3000 and talks to the API over HTTP + WebSocket.

### Environment variables

**Node (`.env`)**

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection URI (e.g. `mongodb://localhost:27017`) |
| `MONGODB_DB` | Database name |
| `JWT_SECRET` | Secret used to sign JWTs |
| `PORT` | API port (default `3001`) |

**React (`.env`)**

| Variable | Description |
|----------|-------------|
| `REACT_APP_API_URL` | API base URL without trailing slash (e.g. `http://localhost:3001`) |

## License

ISC (see `Node/package.json`).

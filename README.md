<div align="center">

<img src="https://raw.githubusercontent.com/NotJcao17/trip-comitium-frontend/main/public/images/logo_128.png" width="88" alt="Trip Comitium logo">

# Trip Comitium · Backend API

**The REST API behind Trip Comitium, the app where a group decides a trip by voting instead of arguing in the chat.**

<a href="https://trip-comitium.netlify.app"><img src="https://img.shields.io/badge/Live%20demo-trip--comitium.netlify.app-3E7B5A?style=for-the-badge" alt="Live demo at trip-comitium.netlify.app"></a>
<a href="https://github.com/NotJcao17/trip-comitium-frontend"><img src="https://img.shields.io/badge/Frontend-trip--comitium--frontend-1B2A22?style=for-the-badge&logo=github&logoColor=white" alt="Frontend repository"></a>

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com)
[![MySQL](https://img.shields.io/badge/MySQL-TiDB%20Cloud-4479A1?logo=mysql&logoColor=white)](https://www.pingcap.com/tidb-cloud/)
[![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)](https://jwt.io)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://trip-comitium-backend.vercel.app)

<br>

<img src="https://raw.githubusercontent.com/NotJcao17/trip-comitium-frontend/main/docs/screenshots/admin.webp" width="820" alt="Organizer panel of Trip Comitium">

<sub>The organizer panel of the <a href="https://github.com/NotJcao17/trip-comitium-frontend">Angular client</a>, fed by this API.</sub>

</div>

---

## What does it do?

Trip Comitium lets an organizer open a **room** for a trip, share a five-character code, and run
**polls** that everyone answers from their phone: available dates, where to stay, budget, a tier list
of activities or free text. This API stores the rooms, participants, polls and votes, and computes
the results (calendar heatmap, votes per option, budget average, tier list ranking, participation).

There are no user accounts: a person enters a room with the code, their name and a 4-digit PIN, and
gets a JWT scoped to that trip.

---

## ✨ Features

- 🏠 **Rooms** with a unique share code, of two kinds: **closed** (the organizer defines the roster
  and each friend claims their name) or **open** (anyone with the code joins with a nickname).
- 🔑 **Join or log in in one call**: the first time, the PIN is hashed with **bcrypt** and stored;
  later, the same name and PIN log back in.
- 🗳️ **Five poll types**: `date`, `multiple_choice`, `slider`, `tier_list` and `text`, with
  per-type configuration (date range, budget min/max/step), option descriptions and photo galleries.
- 📊 **Results computed on the server** for each type, plus **participation** (who voted and who is
  missing) crossed with the trip's roster.
- 🙈 **Anonymous polls**: voter names are stripped from the results for everyone except the organizer.
- 🛡️ **Organizer-only actions** behind an admin middleware: create, close, reopen and delete polls;
  invite participants, reset PINs and remove people.
- 🖼️ **Image links whitelist**: option photos are only accepted from allowed hosts (Postimages and ImgBB).
- 🚦 **Rate limiting** with `express-rate-limit` on joining (15 attempts per 15 minutes), creating
  trips (20 per hour) and voting.
- 🔁 **Versioned SQL migrations** with a `schema_migrations` table.
- ☁️ **Serverless**: runs as a Vercel function, with keep-alive on the MySQL pool so TiDB Serverless
  idle connections do not break requests.

---

## 🔌 API

All routes are under `/api`. Routes marked 🔒 need `Authorization: Bearer <token>`; 👑 also require
the organizer.

### Auth

| Method | Route | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/join` | Join a trip (or log back in) with `shareCode`, `name` and `accessPin`. Returns the token, user and trip. |

### Trips

| Method | Route | Description |
| :--- | :--- | :--- |
| `POST` | `/trips` | Create a trip (room type, roster, organizer name and PIN). |
| `GET` | `/trips/:code` | Public info of a trip by its code. |
| `GET` | `/trips/:code/roster` | Room type and roster, to pick a name in a closed room. |
| `GET` | `/trips/participants` 🔒 | Participants of the current trip. |
| `POST` | `/trips/participants` 🔒👑 | Invite a participant. |
| `POST` | `/trips/participants/:id/reset-pin` 🔒👑 | Reset a participant's PIN. |
| `DELETE` | `/trips/participants/:id` 🔒👑 | Remove a participant. |

### Polls and votes

| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/polls` 🔒 | Polls of the trip with their options and images. |
| `GET` | `/polls/:pollId` 🔒 | One poll. |
| `POST` | `/polls` 🔒👑 | Create a poll. |
| `PATCH` | `/polls/:pollId/status` 🔒👑 | Change the status (`active`, `locked`, `hidden`). |
| `DELETE` | `/polls/:pollId` 🔒👑 | Delete a poll. |
| `POST` | `/votes` 🔒 | Cast or update a vote. |
| `GET` | `/votes/:pollId/my-vote` 🔒 | The current user's vote in a poll. |
| `GET` | `/votes/my-votes` 🔒 | Ids of the polls the user already voted in. |
| `GET` | `/stats/:pollId` 🔒 | Results and participation of a poll. |

---

## 🗄️ Data Model

```
trips ──< participants
  │
  └──< polls ──< poll_options ──< poll_option_images
          │
          └──< votes >── participants
```

| Table | Key columns |
| :--- | :--- |
| `trips` | `name`, `description`, `share_code` (unique), `room_type` (`open` / `closed`) |
| `participants` | `name`, `access_pin` (bcrypt), `is_admin`, `status` (`invited` / `active`) |
| `polls` | `title`, `description`, `type`, `status`, `is_anonymous`, `config` (JSON) |
| `poll_options` | `text`, `description` |
| `poll_option_images` | `url`, `thumb_url`, `source` |
| `votes` | `option_id`, `vote_value` (JSON: dates, amount or tiers), `text_response` |

The base schema is in `database.sql` and later changes in `migrations/`.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Runtime** | Node.js |
| **Framework** | Express 5 |
| **Database** | MySQL-compatible TiDB Cloud (Serverless) through `mysql2` |
| **Auth** | JWT (`jsonwebtoken`) + bcrypt for PINs |
| **Security** | `cors` whitelist, `express-rate-limit` |
| **Hosting** | Vercel (Serverless Functions) |

---

## 🏗️ Project Structure

```
├── index.js            # Express app, CORS and routes
├── config/db.js        # MySQL pool (SSL in production, keep-alive)
├── routes/             # auth, trips, polls, votes, stats
├── controllers/        # Business logic for each resource
├── middleware/         # auth (JWT), admin, rateLimiter
├── utils/              # imageLinks (allowed hosts), names
├── database.sql        # Base schema
├── migrations/         # Versioned SQL migrations
├── migrate.js          # Applies pending migrations
└── vercel.json         # Serverless deployment
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- A MySQL or TiDB database

### Setup

```bash
git clone https://github.com/NotJcao17/trip-comitium-backend.git
cd trip-comitium-backend
npm install
```

Create a `.env` file:

```env
DB_HOST=your_host
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=trip_comitium
DB_PORT=4000            # 4000 for TiDB, 3306 for MySQL
DB_SSL=true             # required by TiDB Cloud
JWT_SECRET=your_secret_key
CLIENT_URL=https://your-frontend.netlify.app
```

Create the schema and run the server:

```bash
mysql -h <host> -u <user> -p < database.sql   # base schema
npm run migrate                                # pending migrations
npm run dev                                    # http://localhost:3000
```

The Angular client in development expects the API at `http://localhost:3000/api`.

---

<div align="center">
  Created by <b>Juan Carlos Orozco Nieto</b>
</div>

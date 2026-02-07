# Trip Comitium - Backend API 

This repository contains the RESTful API for **Trip Comitium**, a Full Stack application designed for dynamic travel survey organization. The backend is built with a Serverless architecture to ensure scalability and high performance.

## 🛠️ Technical Stack

- **Runtime:** Node.js.
- **Framework:** Express.js.
- **Database:** TiDB (MySQL Cloud).
- **Authentication:** JSON Web Tokens (JWT) & Bcrypt for secure password hashing.
- **Deployment:** Vercel (Serverless Functions).
- **Key Dependencies:** `mysql2`, `cors`, `dotenv`, and `jsonwebtoken`.

## 🚀 Getting Started

### Prerequisites
- Node.js installed.
- A TiDB or MySQL instance.

### Installation
1. **Clone the repository:**
   git clone [https://github.com/NotJcao17/trip-comitium-backend.git]
   cd trip-comitium-backend
2. **Install dependencies**
   npm install
3. **Environment Configuration**
   DB_HOST=your_host
   DB_USER=your_user
   DB_PASSWORD=your_password
   DB_NAME=your_db_name
   DB_PORT=your_port
   JWT_SECRET=your_secret_key
4. **Run Server**
   node index.js
5. **Live Demo**
   Access the application here: https://trip-comitium.netlify.app/

# 🗳️ Smart Contract-Based Voting System
### A Case Study of Multimedia University of Kenya

**Author:** Bichage Nigel Ombaba (CIT-222-033/2021)  
**Supervisor:** Dr. Nick Ishmael  
**Department:** Computer Technology, Faculty of Computing and Information Technology  
**Institution:** Multimedia University of Kenya  

---

## Overview

A blockchain-enabled, smart contract-based voting system designed for institutional elections at Multimedia University of Kenya. The system addresses transparency, security, and trust challenges in traditional voting by recording votes on an Ethereum blockchain through Solidity smart contracts.

### Key Features

- **Blockchain-Backed Votes** — Immutable vote recording via Ethereum smart contracts
- **Voter Anonymity** — Database stores only transaction hashes, never candidate choices
- **Individual Verification** — Voters receive a cryptographic receipt to verify their vote
- **Real-Time Results** — Automated tallying via smart contract upon poll closure
- **Role-Based Access** — Voter, Electoral Admin, and System Admin roles
- **Complete Audit Trail** — Every admin action logged with timestamps and IP addresses
- **34 Automated Tests** — 100% pass rate across all backend functionality

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React.js 18 | Single-page application with role-based views |
| Backend | Django 5.2 + DRF | REST API with JWT authentication |
| Database | PostgreSQL 17 | User data, election metadata, audit logs |
| Blockchain | Ethereum (Solidity 0.8.19) | Immutable vote ledger and election logic |
| Blockchain Tools | Hardhat + Ganache | Development, testing, deployment |

---

## Project Structure

```
mmu-voting/
├── backend/                     # Django REST API
│   ├── accounts/                # User management, JWT auth, audit logs
│   ├── voting/                  # Elections, candidates, voting, blockchain service
│   ├── voting_project/          # Django settings and URL configuration
│   ├── tests.py                 # 34 automated tests
│   └── requirements.txt         # Python dependencies
├── contracts/
│   └── VotingSystem.sol         # Solidity smart contract (239 lines)
├── scripts/
│   └── deploy.js                # Hardhat deployment script
├── test/
│   └── VotingSystem.test.js     # Smart contract tests
├── hardhat.config.js
└── package.json
```

---

## Setup & Installation

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 17
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/mmu-voting-system.git
cd mmu-voting-system
```

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

### 3. Configure Database

Create a PostgreSQL database called `mmu_voting`, then edit `backend/voting_project/settings.py`:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'mmu_voting',
        'USER': 'postgres',
        'PASSWORD': 'your_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

### 4. Initialize Database

```bash
pip install psycopg2-binary
python manage.py migrate
python manage.py seed_data
```

This creates test users and a sample election with 3 candidates.

### 5. Install Smart Contract Dependencies

```bash
cd ..
npm install
```

### 6. Frontend Setup

```bash
npx create-react-app frontend
```

Copy the contents of `mmu-voting-frontend.jsx` into `frontend/src/App.js`, then:

```bash
cd frontend
npm start
```

---

## Running the Application

You need **two terminals** running simultaneously:

**Terminal 1 — Backend:**
```bash
cd backend
python manage.py runserver 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
```

Then open **http://localhost:3000** in your browser.

**Optional — Terminal 3 — Local Blockchain:**
```bash
npx ganache --port 8545
npx hardhat run scripts/deploy.js --network ganache
```

---

## Test Credentials

| Role | Student ID | Password |
|------|-----------|----------|
| Electoral Admin | `ADMIN001` | `admin123` |
| System Admin | `SYSADMIN001` | `sysadmin123` |
| Voter 1 | `CIT-222-001/2021` | `voter123` |
| Voter 2-10 | `CIT-222-002/2021` to `CIT-222-010/2021` | `voter123` |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/accounts/login/` | Authenticate user |
| POST | `/api/accounts/register/` | Register new user |
| GET | `/api/voting/elections/` | List all elections |
| POST | `/api/voting/elections/{id}/vote/` | Cast a vote |
| POST | `/api/voting/verify/` | Verify vote by transaction hash |
| GET | `/api/voting/elections/{id}/results/` | Get election results |

Full API documentation with 20 endpoints available in the project documentation.

---

## Testing

**Backend Tests (34 tests, 100% pass rate):**
```bash
cd backend
python manage.py test tests --verbosity=2
```

**Smart Contract Tests:**
```bash
npx hardhat test
```

---

## Security Features

- JWT authentication with role-based token expiry
- PBKDF2-SHA256 password hashing (870,000 iterations)
- CSRF protection on all state-modifying endpoints
- SQL injection prevention via Django ORM
- Double-vote prevention at both smart contract and database levels
- Voter anonymity by design (vote_records stores only tx hash, not candidate choice)
- Circuit breaker for emergency election pause

---

## License

This project was developed as a BSc Computer Technology capstone project at Multimedia University of Kenya.

© 2026 Bichage Nigel Ombaba. All rights reserved.

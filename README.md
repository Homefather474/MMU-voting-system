# 🗳️ Smart Contract-Based Voting System
## A Case Study of Multimedia University of Kenya

**Author:** Bichage Nigel Ombaba (CIT-222-033/2021)  
**Supervisor:** Dr. Nick Ishmael  
**Department:** Computer Technology, Faculty of Computing and Information Technology  
**Institution:** Multimedia University of Kenya  

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Setup & Installation](#setup--installation)
6. [Running the Application](#running-the-application)
7. [API Documentation](#api-documentation)
8. [Smart Contract Documentation](#smart-contract-documentation)
9. [Testing](#testing)
10. [Deployment Guide](#deployment-guide)
11. [Security Features](#security-features)
12. [Test Credentials](#test-credentials)

---

## Project Overview

This project implements a blockchain-enabled, smart contract-based voting system designed specifically for institutional elections at Multimedia University of Kenya. The system addresses transparency, security, and trust challenges identified in the current manual voting process.

### Key Features

- **Blockchain-Backed Votes**: All votes are recorded on an Ethereum blockchain via smart contracts, providing immutability and tamper-proof records
- **Smart Contract Automation**: Election rules, voter registration, vote casting, and tallying are automated through Solidity smart contracts
- **Voter Anonymity**: The database stores only transaction hashes (not candidate choices), preserving ballot secrecy
- **Individual Vote Verification**: Voters receive a cryptographic receipt (transaction hash) they can use to independently verify their vote
- **Real-Time Results**: Automated tallying produces instant results upon poll closure
- **Role-Based Access Control**: Three distinct roles—Voter, Electoral Admin, and System Admin—with appropriate permission levels
- **Complete Audit Trail**: Every administrative action is logged for accountability
- **Responsive Web Interface**: Mobile-friendly React.js frontend accessible on any device

---

## System Architecture

The system follows a **three-tier architecture**:

```
┌─────────────────────────────────────────────────────────┐
│                   PRESENTATION TIER                      │
│              React.js (Single Page App)                   │
│     Voter UI  │  Admin Dashboard  │  System Panel        │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API (HTTPS)
┌──────────────────────┴──────────────────────────────────┐
│                   APPLICATION TIER                        │
│              Django + DRF (Python)                        │
│  JWT Auth │ Business Logic │ Blockchain Service Layer     │
└──────┬─────────────────────────────────────┬────────────┘
       │ SQL (ORM)                           │ Web3.py (RPC)
┌──────┴────────────┐          ┌─────────────┴────────────┐
│     DATA TIER     │          │    BLOCKCHAIN TIER        │
│  PostgreSQL/SQLite│          │   Ethereum (Ganache/      │
│  Users, Elections │          │   Sepolia/Private)        │
│  Audit Logs       │          │   Smart Contracts         │
└───────────────────┘          └──────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React.js | Component-based UI with responsive design |
| **Backend** | Django 5.x + DRF | REST API, business logic, authentication |
| **Database** | SQLite (dev) / PostgreSQL (prod) | User data, election metadata, audit logs |
| **Blockchain** | Ethereum | Immutable vote ledger |
| **Smart Contracts** | Solidity 0.8.19 | Election logic automation |
| **Blockchain Tools** | Hardhat, Ganache | Development, testing, deployment |
| **Auth** | JWT (JSON Web Tokens) | Stateless authentication |
| **Blockchain Lib** | Web3.py (backend) | Python-Ethereum interaction |

---

## Project Structure

```
mmu-voting/
├── backend/                        # Django REST API
│   ├── voting_project/             # Django project settings
│   │   ├── settings.py             # Configuration
│   │   ├── urls.py                 # Root URL routing
│   │   └── wsgi.py                 # WSGI entry point
│   ├── accounts/                   # User management app
│   │   ├── models.py               # User, AuditLog models
│   │   ├── views.py                # Auth endpoints
│   │   ├── serializers.py          # DRF serializers
│   │   ├── authentication.py       # JWT auth class
│   │   └── urls.py                 # Account routes
│   ├── voting/                     # Election management app
│   │   ├── models.py               # Election, Candidate, VoteRecord
│   │   ├── views.py                # All voting endpoints
│   │   ├── serializers.py          # DRF serializers
│   │   ├── blockchain.py           # Web3 service layer
│   │   ├── urls.py                 # Voting routes
│   │   └── management/commands/
│   │       └── seed_data.py        # Test data seeder
│   ├── tests.py                    # 34 unit/integration tests
│   └── requirements.txt            # Python dependencies
├── contracts/                      # Solidity smart contracts
│   └── VotingSystem.sol            # Main voting contract
├── scripts/
│   └── deploy.js                   # Hardhat deployment script
├── test/
│   └── VotingSystem.test.js        # Smart contract tests
├── hardhat.config.js               # Hardhat configuration
├── package.json                    # Node.js dependencies
├── .env.example                    # Environment template
└── README.md                       # This file
```

---

## Setup & Installation

### Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- Git

### 1. Clone and Install Backend

```bash
cd mmu-voting/backend
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 3. Initialize Database

```bash
cd backend
python manage.py makemigrations accounts voting
python manage.py migrate
python manage.py seed_data       # Creates test users and sample election
```

### 4. Install Smart Contract Dependencies

```bash
cd mmu-voting
npm install
```

### 5. Install Frontend Dependencies (for standalone React)

If running the React frontend separately:
```bash
npx create-react-app frontend
# Copy the mmu-voting-frontend.jsx content into src/App.jsx
cd frontend && npm start
```

---

## Running the Application

### Start Backend Server

```bash
cd backend
python manage.py runserver 8000
```
API available at: `http://localhost:8000/api/`

### Start Local Blockchain (optional, for full blockchain features)

```bash
# Terminal 2: Start Ganache
npx ganache --port 8545

# Terminal 3: Deploy smart contract
npx hardhat run scripts/deploy.js --network ganache
```

### Start Frontend

The React frontend artifact connects to the backend at `http://localhost:8000/api/`.

---

## API Documentation

### Authentication Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/accounts/register/` | None | Register new user |
| POST | `/api/accounts/login/` | None | Login, returns JWT |
| GET | `/api/accounts/profile/` | JWT | Get current user |
| PATCH | `/api/accounts/profile/` | JWT | Update profile |
| GET | `/api/accounts/users/` | Admin | List all users |
| POST | `/api/accounts/bulk-eligibility/` | Admin | Bulk update eligibility |
| GET | `/api/accounts/audit-logs/` | Admin | View audit trail |
| GET | `/api/accounts/system-health/` | SysAdmin | System status |

### Election Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/voting/elections/` | JWT | List elections |
| POST | `/api/voting/elections/` | Admin | Create election |
| GET | `/api/voting/elections/{id}/` | JWT | Election detail |
| PATCH | `/api/voting/elections/{id}/` | Admin | Update election |
| DELETE | `/api/voting/elections/{id}/` | SysAdmin | Delete election |

### Election Phase Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/voting/elections/{id}/phase/start_registration/` | Admin | Open registration |
| POST | `/api/voting/elections/{id}/phase/open_polls/` | Admin | Open voting |
| POST | `/api/voting/elections/{id}/phase/close_polls/` | Admin | Close voting |
| POST | `/api/voting/elections/{id}/phase/publish_results/` | Admin | Publish results |
| POST | `/api/voting/elections/{id}/phase/pause/` | Admin | Pause (circuit breaker) |
| POST | `/api/voting/elections/{id}/phase/resume/` | Admin | Resume |

### Candidate Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/voting/elections/{id}/candidates/` | JWT | List candidates |
| POST | `/api/voting/elections/{id}/candidates/` | Admin | Add candidate |
| PATCH | `/api/voting/elections/{id}/candidates/{cid}/` | Admin | Update candidate |
| DELETE | `/api/voting/elections/{id}/candidates/{cid}/` | Admin | Remove candidate |

### Voting Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/voting/elections/{id}/register/` | JWT (Voter) | Register for election |
| GET | `/api/voting/elections/{id}/registrations/` | Admin | List registered voters |
| POST | `/api/voting/elections/{id}/vote/` | JWT (Voter) | Cast vote |
| GET | `/api/voting/elections/{id}/my-status/` | JWT | Check vote status |
| GET | `/api/voting/elections/{id}/results/` | Public | Get results |
| POST | `/api/voting/verify/` | Public | Verify vote by tx hash |
| GET | `/api/voting/dashboard/` | JWT | Dashboard statistics |

---

## Smart Contract Documentation

### VotingSystem.sol

The main smart contract manages the entire election lifecycle:

**State Machine:**
```
NotStarted → Registration → Voting → Ended → ResultsPublished
```

**Key Functions:**

| Function | Access | Description |
|----------|--------|-------------|
| `addCandidate(id, name, position)` | Admin | Register a candidate |
| `startRegistration()` | Admin | Open voter registration |
| `registerVoter(address)` | Admin | Register a voter wallet |
| `registerVotersBatch(addresses)` | Admin | Batch register voters |
| `openPolls()` | Admin | Open voting (needs ≥2 candidates) |
| `castVote(candidateId)` | Voter | Cast a vote |
| `closePolls()` | Admin | Close voting |
| `publishResults()` | Admin | Make results official |
| `getResults()` | Public | Get vote counts (after close) |
| `verifyVoterStatus(address)` | Public | Check registration/vote status |
| `pauseElection()` | Admin | Emergency circuit breaker |

**Security Properties:**
- Checks-effects-interactions pattern prevents re-entrancy
- Solidity 0.8.x built-in overflow protection
- Function modifiers enforce role-based access
- Circuit breaker for emergency pause

---

## Testing

### Backend Tests (34 tests)

```bash
cd backend
python manage.py test tests --verbosity=2
```

**Test Coverage:**
- Authentication: registration, login, JWT validation, profile access
- Elections: CRUD operations, permission checks
- Candidates: add/list/validate timing constraints
- Phase Transitions: valid and invalid state changes, permission checks
- Voter Registration: eligibility, duplicate prevention, timing constraints
- Vote Casting: success, double-vote prevention, anonymity verification
- Vote Verification: valid and invalid transaction hashes
- Dashboard: statistics aggregation
- Audit Logs: admin access, voter restriction

### Smart Contract Tests

```bash
npx hardhat test
```

**Test Coverage:**
- Deployment and initialization
- Candidate management
- Voter registration and batch registration
- Vote casting with all guard conditions
- Election lifecycle transitions
- Results calculation
- Circuit breaker functionality
- Access control enforcement

---

## Deployment Guide

### Phase 1: Internal Testing (Ganache)

```bash
npx ganache --port 8545
npx hardhat run scripts/deploy.js --network ganache
# Update .env with CONTRACT_ADDRESS
```

### Phase 2: Pilot (Sepolia Testnet)

```bash
# Get Sepolia ETH from faucet
# Set SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY in .env
npx hardhat run scripts/deploy.js --network sepolia
```

### Phase 3: Production

1. Set up PostgreSQL database
2. Configure Django for production (DEBUG=False, proper SECRET_KEY)
3. Deploy to private/consortium Ethereum network
4. Set up nginx reverse proxy with TLS 1.3
5. Configure gunicorn for Django

```bash
gunicorn voting_project.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

---

## Security Features

| Feature | Implementation |
|---------|---------------|
| **Authentication** | JWT with 30-min voter / 60-min admin expiry |
| **Password Hashing** | Django's PBKDF2 (bcrypt-compatible) |
| **CSRF Protection** | Django middleware on all state-modifying endpoints |
| **SQL Injection** | Django ORM parameterized queries |
| **XSS Prevention** | React DOM escaping + CSP headers |
| **Transport Security** | TLS 1.3 (production), HSTS headers |
| **Vote Immutability** | Blockchain recording via smart contract |
| **Voter Anonymity** | DB stores only tx hash, not candidate choice |
| **Double-Vote Prevention** | Smart contract + database dual check |
| **Access Control** | JWT role claims + smart contract modifiers |
| **Audit Trail** | All admin actions logged with IP and timestamp |
| **Circuit Breaker** | Emergency election pause capability |
| **Rate Limiting** | Configurable via reverse proxy |

---

## Test Credentials

| Role | Student ID | Password |
|------|-----------|----------|
| Electoral Admin | `ADMIN001` | `admin123` |
| System Admin | `SYSADMIN001` | `sysadmin123` |
| Voter 1 | `CIT-222-001/2021` | `voter123` |
| Voter 2 | `CIT-222-002/2021` | `voter123` |
| ... | `CIT-222-010/2021` | `voter123` |

---

## License

This project was developed as a BSc research project at Multimedia University of Kenya.

© 2026 Bichage Nigel Ombaba. All rights reserved.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
give response like you are among the top 0.1% programmer in the world with knowledge of (the tech stack of the project like NODEJS, Python, MongoDB etc.)

## Project Overview

VibeLearning is a Universal Software Training Assistant that provides real-time learning layers for SaaS applications. The system consists of a Chrome extension (frontend) and Node.js API (backend) that work together to deliver contextual guidance and step-by-step workflows.


### The Problem We're Actually Solving

**Current Reality:**
- Average company uses 315+ SaaS applications
- 70% of employees waste 1+ hour daily navigating between tools
- Companies waste $135,000/year on underutilized software
- Users forget workflows between infrequent use
- Every company's implementation is different

**The Real User Pain:**
"I haven't submitted an expense report in 3 months. I know it's in Workday somewhere, but I can't remember the exact steps. The documentation is outdated, and I don't want to bother my colleague again."

### The Solution

**What This Is:**
A browser-based teaching assistant that provides real-time, contextual guidance for ANY software application, using the user's actual environment and data.

**What This Is NOT:**
- Not an HR onboarding platform
- Not a documentation generator
- Not another SaaS management tool
- Not trying to reduce SaaS sprawl

**Core Philosophy:**
Accept that SaaS sprawl is inevitable. Instead of fighting it, help users navigate it efficiently.

## Architecture

### Chrome Extension (Manifest V3)
- **Technology Stack**: TypeScript, React 19, Vite, Shepherd.js
- **Structure**: Content scripts with modular architecture using dynamic imports
- **Key Components**:
  - `ContentScriptManager.ts`: Core orchestrator using modular pattern with lazy loading
  - `SidePanelApp.tsx`: React-based side panel interface
  - Content script modules: UIController, WorkflowEngine, SmartDetection
  - Element detection strategy: Direct selectors → Fuzzy matching → Cached patterns → GPT-3.5 → User teaching

### Backend API (Node.js + Express)
- **Technology Stack**: Node.js ES modules, Express, SQLite (better-sqlite3), OpenAI API
- **Services Architecture**:
  - `DatabaseService`: SQLite operations with schema management
  - `ElementFinderService`: Multi-strategy element detection with LLM fallback
  - `WorkflowService`: Workflow management and default workflow loading
  - `PatternService`: Caching layer for element selectors to minimize API costs
  - `AnalyticsService`: Usage tracking and completion analytics

## Development Commands

### Root Level Commands
```bash
# Full development environment
npm run dev                    # Starts both extension (watch) and backend (nodemon)

# Production builds
npm run build                  # Builds both extension and backend
./build.sh                     # Alternative build script with detailed steps

# Testing
npm test                       # Runs tests for both workspaces
```

### Extension Development
```bash
cd extension

# Development
npm run dev                    # Vite build with watch mode
npm run dev:serve             # Development server (port 5173)

# Building
npm run build                 # Production build to dist/
npm run build:production      # Production build with optimizations

# Type checking and testing
npm run lint                  # TypeScript type checking (tsc --noEmit)
npm test                      # Jest test runner
```

### Backend Development
```bash
cd backend

# Development
npm run dev                   # Nodemon with auto-restart
npm start                     # Production server

# No build step needed for Node.js backend
npm test                      # Jest test runner
```

## Key Development Patterns

### Extension Content Script Architecture
The extension uses a modern modular architecture with dynamic imports:
- `ContentScriptManager` orchestrates all modules
- Modules implement `ContentModule` interface with `init()` and `destroy()` methods
- Smart Detection module is lazy-loaded only when needed
- Message passing between content scripts and side panel

### Element Detection Strategy
1. **Direct selector matching** (instant, free)
2. **Fuzzy text matching** (fast, free)  
3. **Cached patterns** (fast, free)
4. **Gemma3:2b context matching** ($0.001/lookup)
5. **User teaching fallback**

### Database Schema
- `workflows`: Workflow definitions with steps
- `patterns`: Cached element selectors by intent/URL/company
- `completions`: Usage analytics
- `feedback`: User feedback tracking

## Environment Setup

### Extension Loading
1. Build: `cd extension && npm run build`
2. Load `extension/dist/` as unpacked extension in Chrome
3. Extension requires backend running on localhost:3000

### Backend Setup
1. Install: `cd backend && npm install`
2. Database auto-initializes with schema on first run
3. Default workflows loaded from `workflows/` directory
4. Requires OpenAI API key in environment for smart detection

## Supported Platforms

Currently implemented:
- **Workday**: Expense report workflows (`workflows/workday-expense.json`)

Architecture supports adding new platforms by creating workflow JSON files and updating the detection logic in `useAppDetection.ts`.

## Cost Optimization

The system is designed for <$0.30/user/month LLM costs through:
- Pattern caching in SQLite database
- Multi-tier detection strategy with free methods first
- Smart detection only as fallback
- Rate limiting on API endpoints

## Testing Approach

Both workspaces use Jest for testing. No specific test runners or frameworks beyond standard Jest configuration. Run tests with `npm test` in respective directories.
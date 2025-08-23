# VibeLearning - Universal Software Training Assistant

Real-time learning layer for SaaS applications. Provides contextual guidance and step-by-step workflows for any enterprise software.

## Vision

Accept that SaaS sprawl is inevitable. Instead of fighting it, help users navigate it efficiently with real-time, contextual guidance.

## Features

- **Universal Element Detection**: AI-powered element finding that works across any web application
- **Adaptive Learning**: System learns from user interactions and improves over time
- **Workflow Marketplace**: Community-driven workflow sharing
- **Pattern Caching**: Intelligent caching reduces API costs to <$0.30/user/month
- **Multi-Strategy Detection**: Layered approach from direct selectors to AI fallback

## Quick Start

### Extension Setup
```bash
cd extension
npm install
npm run build
```

Load the `extension/dist` folder as an unpacked extension in Chrome.

### Backend Setup
```bash
cd backend
npm install
npm start
```

Backend runs on http://localhost:3000

## Architecture

### Frontend (Chrome Extension)
- Manifest V3 extension
- Shepherd.js for guided tours
- Content script injection
- Universal element finder

### Backend (Node.js API)
- Express server
- SQLite database
- Pattern learning system
- Analytics tracking

### Element Detection Strategy
1. Direct selector matching (instant, free)
2. Fuzzy text matching (fast, free)
3. Cached patterns (fast, free)
4. GPT-3.5 context matching ($0.001/lookup)
5. User teaching fallback

## Supported Platforms

Currently supported:
- Workday (expense reports)

Coming soon:
- Salesforce
- ServiceNow
- Concur
- Microsoft Dynamics

## Development Roadmap

- [x] Chrome extension foundation
- [x] Shepherd.js integration
- [x] Universal element finder
- [x] Workday expense workflow
- [x] Backend API
- [x] Pattern caching
- [ ] User onboarding flow
- [ ] Workflow recording
- [ ] Analytics dashboard
- [ ] Payment integration
- [ ] Workflow marketplace

## Cost Structure

- Infrastructure: <$100/month
- LLM costs: ~$0.30/user/month
- Pricing: $9/user/month
- Gross margin: >90%

## Contributing

This is a proprietary project. All rights reserved.

## License

Copyright 2024 VibeLearning. All rights reserved.
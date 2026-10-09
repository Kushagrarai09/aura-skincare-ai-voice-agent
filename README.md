# Aura Skincare — AI Voice CX Agent

An AI-powered, browser-based voice customer support agent built for the **Datastraw AI Voice CX Agent assessment**. The agent, named **Aria**, helps customers with order tracking, product information, delivery questions, cancellation eligibility, return policies, and other Aura Skincare-related queries.

**Live Demo:** https://aura-skincare-ai-voice-agent.vercel.app/ 
---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [How to Use the Application](#how-to-use-the-application)
- [Sample Orders](#sample-orders)
- [Business Rules and Policies](#business-rules-and-policies)
- [API Endpoints](#api-endpoints)
- [Example Test Scenarios](#example-test-scenarios)
- [Deployment](#deployment)
- [Design Decisions](#design-decisions)
- [Challenges and Solutions](#challenges-and-solutions)
- [Future Improvements](#future-improvements)
- [Scaling to 1,000 Conversations per Day](#scaling-to-1000-conversations-per-day)
- [Limitations](#limitations)
- [Author](#author)

## Overview

Aura Skincare AI Voice CX Agent is a full-stack web application that provides an interactive customer support experience through browser-based speech input and output.

Customers can speak naturally to Aria instead of navigating menus or filling out forms. The application processes customer messages through a backend API, uses Gemini for conversational reasoning, and retrieves order information through a dedicated `get_order_details(order_id)` tool backed by a mock order database.

After a call ends, the application displays the conversation transcript and a structured JSON summary containing the customer intent, relevant order ID, resolution status, call summary, tool used, and applicable policy.

The project is designed as a lightweight MVP that can be tested through a public browser URL without requiring a separate telephony system.

## Features

- **Voice interaction:** Captures customer speech using the browser Web Speech API.
- **AI-powered conversations:** Uses Google's Gemini model to understand requests and generate customer-facing responses.
- **Order lookup:** Retrieves order details using `get_order_details(order_id)`.
- **Policy-aware responses:** Applies defined delivery, cancellation, return, and damaged-product policies.
- **Order validation:** Handles missing or invalid order IDs without inventing order details.
- **Out-of-scope handling:** Politely redirects requests unrelated to Aura Skincare support.
- **Speech output:** Reads agent responses aloud using browser speech synthesis.
- **Live interaction states:** Displays Listening, Thinking, and Speaking states.
- **Live transcript:** Shows customer and agent messages during the conversation.
- **Post-call summary:** Generates structured JSON after the call ends.
- **Text fallback:** Allows text-based testing when browser speech recognition is unavailable.
- **Server-side API key handling:** Keeps the Gemini API key in server-side environment variables instead of exposing it in frontend code.
- **Deployable architecture:** Supports local development and deployment to Vercel.

## Technology Stack

| Technology | Purpose |
|---|---|
| Next.js | Full-stack React framework and API routes |
| React | Interactive user interface |
| TypeScript | Type safety and maintainable code |
| Google Gemini API | Conversational reasoning and response generation |
| Web Speech API | Browser speech recognition and speech synthesis |
| Node.js | Server-side JavaScript runtime |
| JSON | Mock order data storage |
| Vercel | Application deployment and hosting |
| Git and GitHub | Version control and source code management |

## System Architecture

```text
                 CUSTOMER
                     |
                     v
            Browser Voice Interface
                     |
          +----------+----------+
          |                     |
          v                     v
   Speech Recognition     Text Fallback
          |                     |
          +----------+----------+
                     |
                     v
              Next.js Frontend
                     |
                     | POST /api/chat
                     v
              Backend API
                     |
                     v
                Gemini AI
                     |
            +--------+--------+
            |                 |
            v                 v
       General Query      Order Query
                              |
                              v
                   get_order_details()
                              |
                              v
                       orders.json
                              |
                              v
                     Order Tool Result
                              |
                              v
                    Gemini Final Response
                              |
                              v
                     Browser Speech Output
                              |
                              v
                       Live Transcript
                              |
                         End Call
                              |
                              v
                     POST /api/summary
                              |
                              v
                    Structured JSON Summary
```

### Request Flow

1. The customer speaks or enters a message in the browser.
2. The frontend sends the message to `/api/chat`.
3. The backend uses Gemini to interpret the request and generate a response.
4. For order-specific questions, the agent can request the `get_order_details(order_id)` tool.
5. The tool retrieves matching information from the mock order database.
6. The agent uses the returned information to formulate its response.
7. The frontend displays the response and can read it aloud.
8. When the call ends, the transcript is submitted to `/api/summary`.
9. The backend returns structured JSON for display in the post-call summary panel.

The summary implementation uses rule-based classification to generate the structured output locally, avoiding a dependency on an additional Gemini request for the post-call summary.

## Project Structure

```text
aura-skincare-ai-voice-agent/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts
│   │   └── summary/
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── VoiceAgent.tsx
├── data/
│   └── orders.json
├── lib/
│   ├── agent.ts
│   ├── orders.ts
│   └── types.ts
├── public/
├── .env.example
├── .gitignore
├── next.config.mjs
├── package.json
├── package-lock.json
├── README.md
└── tsconfig.json
```

### Important Files

- `app/api/chat/route.ts` — Handles conversational requests and Gemini integration.
- `app/api/summary/route.ts` — Generates structured post-call summaries.
- `components/VoiceAgent.tsx` — Implements the voice interface, transcript, and call controls.
- `lib/agent.ts` — Contains agent instructions and tool definitions.
- `lib/orders.ts` — Implements order lookup functionality.
- `lib/types.ts` — Defines shared TypeScript types.
- `data/orders.json` — Contains mock customer order information.
- `.env.example` — Documents required environment variables using placeholders.

## Getting Started

### Prerequisites

Install the following before running the project:

- Node.js 20 or later.
- npm.
- Git.
- A modern browser, preferably Google Chrome or Microsoft Edge.
- A Gemini API key from Google AI Studio.

### 1. Clone the Repository

Open a terminal and run:

```bash
git clone https://github.com/Kushagrarai09/aura-skincare-ai-voice-agent.git
```

Navigate into the project:

```bash
cd aura-skincare-ai-voice-agent
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a file named `.env.local` in the project root.

Add the following configuration:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Replace `your_gemini_api_key_here` with your actual API key.

If you use a different supported model, set `GEMINI_MODEL` to the model ID configured and verified for your Gemini API access.

**Security note:** Never commit `.env.local`, API keys, OAuth tokens, or service-account credentials to GitHub. The `.env.example` file should contain placeholders only.

### 4. Start the Development Server

```bash
npm run dev
```

Open the application in your browser:

http://localhost:3000

The Next.js development server runs locally and provides the frontend and backend API routes.

## How to Use the Application

### Step 1: Open the Application

Visit the live deployment:

https://aura-skincare-ai-voice-agent.vercel.app/

Alternatively, start the application locally using the setup instructions above.

### Step 2: Start a Call

Click **Start Call** and allow microphone access when your browser asks for permission.

The agent greets the customer and waits for their question.

### Step 3: Ask a Customer Support Question

Try questions such as:

- "Where is my order ORD-101?"
- "What product did I order in ORD-103?"
- "Can I cancel my order?"
- "What is your return policy?"

Use the text fallback if speech recognition is unavailable in your browser.

### Step 4: Follow the Conversation

Aria processes the message, retrieves order information when needed, and responds according to the configured policies.

The interface displays the conversation and the current interaction state.

### Step 5: End the Call

Click **End Call** when you finish.

The application displays the chronological transcript and the Post-Call Structured Summary.

### Step 6: Inspect the JSON Summary

The summary includes fields such as:

```json
{
  "customer_intent": "ORDER_TRACKING",
  "order_id": "ORD-101",
  "resolution_status": "RESOLVED",
  "call_summary": "Customer asked about the status of order ORD-101.",
  "tool_used": "get_order_details",
  "key_policy": null
}
```

This is an illustrative example of the output format. Actual values depend on the conversation.

## Sample Orders

The application uses mock data for assessment and demonstration purposes.

| Order ID | Product | Amount | Status |
|---|---|---:|---|
| ORD-101 | Vitamin C Serum (30ml) | ₹699 | Out for Delivery |
| ORD-102 | Hydrating Sunscreen SPF 50 | ₹499 | Delivered |
| ORD-103 | Green Tea Face Wash + Toner | ₹850 | Processing |

### Order-Specific Details

**ORD-101**
- Courier: BlueDart.
- Tracking ID: BD-982103.
- Expected delivery: By 6 PM today, according to the sample data.
- Cancellation: Not permitted because the order is out for delivery.

**ORD-102**
- Courier: Delhivery.
- Tracking ID: DL-441029.
- Status: Delivered approximately 14 days ago.
- Return eligibility must be evaluated against the return policy and product condition.

**ORD-103**
- Status: Processing.
- Ordered approximately three hours ago in the sample data.
- Cancellation eligible under the configured policy.
- No exact shipping or delivery date is provided.

These records are mock data. They do not represent real customer orders or live courier tracking.

## Business Rules and Policies

The agent is configured to follow these Aura Skincare policies:

### Delivery
- Free delivery applies to orders above ₹499.
- Orders below ₹499 incur ₹50 shipping.
- Standard delivery typically takes 3–5 business days once shipped.

### Returns
- Returns are allowed within seven days of delivery for unopened and unused products in their original packaging.

### Damaged or Defective Products
- Customers should report damaged or defective items within 48 hours.
- Photos are required for a replacement request.

### Order Cancellation
- Orders can be cancelled only while their status is Processing.
- Shipped or Out for Delivery orders cannot be cancelled through the configured policy.
- Customers may refuse delivery at the doorstep where applicable.
- The current order lookup tool is read-only. The agent must not claim that it has executed a cancellation.

### Cash on Delivery
- COD is available for orders up to ₹2,500.
- Cash or UPI can be used at the doorstep.

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/chat` | POST | Processes customer messages and returns agent responses |
| `/api/summary` | POST | Generates the structured post-call JSON summary |

### Chat API

The chat endpoint receives the conversation input and processes the request using the agent instructions and Gemini integration.

For order-related questions, the agent can use `get_order_details(order_id)` to retrieve data from the mock order store.

### Summary API

The summary endpoint accepts the conversation messages and returns a JSON response containing:

- `customer_intent`
- `order_id`
- `resolution_status`
- `call_summary`
- `tool_used`
- `key_policy`

The summary is currently generated using rule-based logic. Its classifications are heuristic and should be validated against representative conversations before production use.

## Example Test Scenarios

Use these scenarios to verify the application's main workflows.

| Test | Customer request | Expected behaviour |
|---|---|---|
| Order tracking | "Where is my order ORD-101?" | Returns the configured status, courier, tracking ID, and expected delivery |
| Product details | "What did I order in ORD-103?" | Identifies the product and amount |
| Eligible cancellation | "Can I cancel ORD-103?" | Explains that Processing orders are eligible for cancellation |
| Ineligible cancellation | "Can I cancel ORD-101?" | Explains that Out for Delivery orders cannot be cancelled |
| Return policy | "I bought my product 20 days ago and opened it. Can I return it?" | Explains the seven-day and unopened/unused eligibility requirements |
| Invalid order | "Where is ORD-999?" | States that the order could not be found |
| Missing order ID | "Where is my order?" | Requests the order ID |
| Out-of-scope request | "Can you book a flight to Goa?" | Politely redirects to Aura Skincare support |
| Unknown delivery estimate | "When exactly will ORD-103 arrive?" | Does not invent an exact delivery date |
| Post-call summary | End a conversation | Displays a transcript and structured JSON summary |

## Deployment

The project is deployed using Vercel.

**Live Application:** https://aura-skincare-ai-voice-agent.vercel.app/

To deploy your own instance:

1. Push the project to a GitHub repository.
2. Sign in to Vercel.
3. Import the repository.
4. Allow Vercel to detect the Next.js framework.
5. Add `GEMINI_API_KEY` and `GEMINI_MODEL` under the project's Environment Variables.
6. Deploy the application.
7. Open the deployment URL and test the voice and text workflows.

Keep credentials in environment variables. Never expose API keys in client-side code or commit them to Git.

## Design Decisions

### Why Next.js?

Next.js allows the frontend and backend API routes to be deployed together. This keeps the application simple to run, test, and evaluate through a single URL.

### Why the Web Speech API?

Browser speech recognition and speech synthesis provide a lightweight way to demonstrate voice interaction without integrating a separate telephony system.

### Why Gemini?

Gemini provides conversational understanding and response generation, allowing the agent to respond naturally to customer questions while following configured instructions and policies.

### Why a Mock Order Database?

The assessment can be demonstrated without access to a real e-commerce backend. Keeping order access behind `get_order_details(order_id)` makes the data retrieval boundary explicit and allows the mock store to be replaced by a real service later.

### Why Structured JSON?

A consistent JSON format makes the call outcome easier to inspect, test, analyze, and integrate with future customer support analytics.

## Challenges and Solutions

### 1. Coordinating Voice and Conversation State

Voice interfaces need to coordinate speech recognition, model responses, and speech synthesis without overlapping input and output.

**Approach:** The interface separates Listening, Thinking, and Speaking states and coordinates recognition with the agent's spoken response.

### 2. Grounding Responses in Order Data

The agent should not invent tracking details, delivery dates, or order statuses.

**Approach:** Order-specific information is retrieved through `get_order_details(order_id)` and the mock order database.

### 3. Handling Model Availability During Summarization

An additional model request can fail because of provider availability or rate limits.

**Approach:** The current summary endpoint uses local rule-based logic to generate the structured summary without requiring another Gemini request.

### 4. Supporting Browser Differences

Speech recognition availability varies between browsers.

**Approach:** Chrome and Edge are recommended, and a text input fallback is provided to demonstrate the core chat and order lookup functionality.

## Future Improvements

If development continued for another week, the following improvements would be priorities:

- Integrate a production real-time speech service for more consistent voice interaction and lower latency.
- Add interruption and barge-in support so customers can interrupt the agent naturally.
- Store call transcripts and summaries persistently.
- Add automated tests for order lookup, policies, and summary classification.
- Introduce authentication and authorization.
- Add structured logging, tracing, and error monitoring.
- Replace mock order data with a real order management API.
- Improve summary classification and validate it against a labelled evaluation dataset.
- Add multilingual support and accessibility improvements.

## Scaling to 1,000 Conversations per Day

For a larger deployment, I would evolve the MVP into a more resilient customer support service.

### Data and Infrastructure
- Move order records to a managed database such as PostgreSQL.
- Add indexes and connection pooling.
- Scale application instances horizontally as required.
- Introduce Redis only where caching or short-lived session state provides measurable benefits.

### Reliability
- Add request timeouts, retries with backoff, and rate limits.
- Implement provider failure handling and fallback behaviour.
- Monitor API errors, response latency, and resource consumption.
- Add structured logs and distributed tracing.

### Cost and Performance
- Use appropriate model routing and caching where safe.
- Track LLM and speech-service costs per conversation.
- Separate asynchronous analytics and summary processing from latency-sensitive voice interactions using a queue when appropriate.
- Load-test realistic concurrent traffic before selecting infrastructure capacity.

The target of 1,000 conversations per day would need to be validated through load testing, latency measurements, and provider quota checks; the current MVP has not been benchmarked at that scale.

## Limitations

- Orders are stored in a mock JSON database.
- Order status and tracking details are not updated from real courier systems.
- The application does not execute actual cancellations, refunds, or replacement requests.
- Speech recognition depends on browser support and permissions.
- The summary classifier uses heuristics and may misclassify ambiguous conversations.
- Production use would require authentication, data protection controls, monitoring, persistent storage, and automated testing.

## Author

**Kushagra Rai**

- GitHub: https://github.com/Kushagrarai09
- Live Project: https://aura-skincare-ai-voice-agent.vercel.app/

---


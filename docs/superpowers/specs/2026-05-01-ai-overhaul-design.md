# AI Overhaul Design

**Date:** 2026-05-01  
**Status:** Approved  

---

## Overview

A comprehensive overhaul of the Funderaise AI Copilot system. Replaces the existing synchronous, single-provider architecture with a streaming-first, provider-agnostic system built around OpenRouter. Adds rich chat UI features (thinking tokens, tool execution display, question widget, file uploads), a dedicated full-page AI assistant, and document-based signup enrichment for investors and startup founders.

---

## 1. AI Infrastructure

### 1.1 Environment Variables

Four new env vars replace `GITHUB_MODELS_TOKEN`:

| Variable | Description |
|---|---|
| `AI_API_KEY` | OpenRouter API key |
| `AI_BASE_URL` | `https://openrouter.ai/api/v1` |
| `AI_MODEL` | Default model (e.g. `google/gemini-3.1-flash-lite-preview`) |
| `AI_VISION_MODEL` | Vision-capable model for file analysis (e.g. `google/gemini-3.1-flash-lite-preview`) |

### 1.2 Provider Abstraction (`backend/apps/copilot/provider.py`)

A single `AIProvider` class instantiated once at module level. Uses the `openai` Python SDK pointed at `AI_BASE_URL` — OpenRouter is fully OpenAI-compatible.

```python
class AIProvider:
    client: AsyncOpenAI        # configured from AI_API_KEY + AI_BASE_URL
    model: str                 # AI_MODEL
    vision_model: str          # AI_VISION_MODEL

    async def stream(
        self,
        messages: list,
        tools: list | None = None,
        use_vision: bool = False,
    ) -> AsyncGenerator[chunk]:
        ...
```

**Token budget (free tier):**
- `max_tokens=1500` for all responses
- `max_reasoning_tokens=800` for thinking (passed via OpenRouter's `reasoning` parameter)
- Model selected: `vision_model` when `use_vision=True`, otherwise `model`

### 1.3 Stream Service (`backend/apps/copilot/stream_service.py`)

Replaces `services.py`. Drives the tool loop (max 8 iterations). Each iteration:

1. Calls `provider.stream()`, yields SSE events as chunks arrive
2. Accumulates tool calls from the stream
3. On `ask_user_questions` tool call → emits `question_form` event, saves assistant message with pending tool call, ends stream
4. On any other tool call → executes tool, emits `tool_start` + `tool_result` events, loops back
5. On final text response → emits `done` event with saved message ID

**SSE event catalogue:**

| Event | Payload |
|---|---|
| `thinking_delta` | `{"delta": "..."}` |
| `thinking_done` | `{"duration_seconds": 2.4}` |
| `text_delta` | `{"delta": "..."}` |
| `tool_start` | `{"tool_call_id": "...", "tool_name": "...", "input": {...}}` |
| `tool_result` | `{"tool_call_id": "...", "result": {...}}` |
| `question_form` | `{"tool_call_id": "...", "title": "...", "questions": [...]}` |
| `done` | `{"message_id": "..."}` |
| `error` | `{"message": "..."}` |

---

## 2. Backend Endpoints

### 2.1 Copilot Endpoints

Old `POST /copilot/conversations/<id>/messages/` is removed and replaced:

| Method | Path | Description |
|---|---|---|
| `POST` | `/copilot/conversations/<id>/messages/stream/` | Send message, returns `text/event-stream` |
| `POST` | `/copilot/conversations/<id>/messages/tool_result/` | Submit question form answers, returns `text/event-stream` |
| `POST` | `/copilot/upload/` | Upload image/PDF to Supabase Storage |

**`/messages/stream/` request body:**
```json
{
  "content": "string",
  "media_url": "string | null",
  "media_type": "image | pdf | null"
}
```

**`/messages/tool_result/` request body:**
```json
{
  "tool_call_id": "string",
  "answers": { "<question_id>": "<value>" }
}
```

**`/copilot/upload/` request:** multipart file (image or PDF, max 10MB).  
**Response:** `{ "url": "...", "media_type": "image|pdf", "filename": "...", "size_bytes": 12345 }`  
Storage path: `copilot-media/<user_id>/<uuid>.<ext>`

### 2.2 Document Extraction Endpoint

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/extract-document/` | Extract structured fields from uploaded document |

**Request:** multipart file (image or PDF) + query param `type=investor|startup`

**Extraction logic:**
- **PDF** → extract text from all pages using `pdfplumber`, pass full text to `AI_MODEL` as a text prompt
- **Image** → send directly to `AI_VISION_MODEL` as a vision request

**Extraction prompt includes:**
> *"The document may be in Arabic. Transliterate all Arabic names and values into Latin script (e.g., بن صالح → Ben Saleh, محمد → Mohamed). Return all fields in Latin script regardless of source language."*

**Investor prompt** extracts: `full_name`, `date_of_birth`, `id_number`, `nationality`  
**Startup prompt** extracts: `company_name`, `registration_id`, `formation_date`, `legal_form`

**Response:**
```json
{
  "extracted": {
    "full_name": "Ben Saleh Mohamed",
    "date_of_birth": "1990-03-15",
    "id_number": "12345678",
    "nationality": "Tunisian"
  },
  "confidence": "high | partial | low"
}
```

Always returns whatever was found. Frontend handles partial results.

---

## 3. Database Changes

### 3.1 `CopilotMessage` model additions

| Field | Type | Description |
|---|---|---|
| `thinking_content` | TextField, blank/null | Accumulated reasoning tokens |
| `thinking_duration` | FloatField, null | Seconds the model spent thinking |
| `media_url` | URLField, null | Supabase Storage URL for attached file |
| `media_type` | CharField(`image`/`pdf`), null | Type of attached media |

### 3.2 `UserProfile` model additions

| Field | Type | Description |
|---|---|---|
| `identity_document_url` | URLField, null | Investor CIN/passport scan |
| `company_document_url` | URLField, null | Startup registration document |

Storage path: `user-documents/<user_id>/identity.<ext>` and `user-documents/<user_id>/company.<ext>`

---

## 4. `ask_user_questions` Tool

A pseudo-tool that never executes server-side. When the AI calls it, the backend emits a `question_form` SSE event and halts the stream. The frontend renders the question widget. After submission, the user's answers are sent back as a tool result via `/messages/tool_result/`, and the AI stream resumes.

**Tool schema:**
```json
{
  "name": "ask_user_questions",
  "description": "Ask the user a series of questions to gather information needed to complete a task. Use this before taking any action that requires user-specific details.",
  "parameters": {
    "type": "object",
    "required": ["title", "questions"],
    "properties": {
      "title": { "type": "string" },
      "questions": {
        "type": "array",
        "minItems": 1,
        "maxItems": 5,
        "items": {
          "type": "object",
          "required": ["id", "type", "label"],
          "properties": {
            "id":          { "type": "string" },
            "type":        { "type": "string", "enum": ["radio", "checkbox", "text", "textarea"] },
            "label":       { "type": "string" },
            "options":     { "type": "array", "items": { "type": "string" } },
            "placeholder": { "type": "string" },
            "required":    { "type": "boolean", "default": true }
          }
        }
      }
    }
  }
}
```

The tool is listed first in the tools array so the model discovers it readily.

---

## 5. Frontend — Streaming Hook

### `useAIStream.ts`

Opens a `fetch` SSE connection. Manages state:

| State | Type | Description |
|---|---|---|
| `thinkingDelta` | string | Accumulated reasoning text (live) |
| `thinkingDuration` | number \| null | Set when `thinking_done` fires |
| `textDelta` | string | Accumulated response text |
| `toolCalls` | array | `{ tool_name, input, result }` per tool fired |
| `questionForm` | object \| null | Set when `question_form` event fires |
| `isStreaming` | boolean | |
| `error` | string \| null | |

Exposes:
- `submit(content, mediaUrl?, mediaType?)` — sends new message, opens SSE
- `submitToolResult(toolCallId, answers)` — submits question answers, opens SSE

---

## 6. Frontend — Chat UI Components

### 6.1 Message Display Order

For each AI response, elements render in this order:
1. **Tool execution blocks** (one per tool called, above everything)
2. **Thinking block** (above AI bubble)
3. **AI response bubble**

### 6.2 Thinking Block

- **While streaming:** collapsible header `▶ Thinking...` with animated pulsing dots. Body shows live reasoning text streaming in.
- **After `thinking_done`:** header changes to `▶ Thought for X seconds`. Body is the full reasoning text, still collapsible.
- **Hidden** if model returns no thinking tokens.

### 6.3 Tool Execution Block (per tool)

Collapsible. Collapsed: `▶ tool_name` (single tool) or `▶ N Tools executed` (multiple).  
Expanded shows:
- Tool name (bold)
- Input: compact key-value list
- Result: full JSON/text in a scrollable code block (no truncation)

The `ask_user_questions` tool never shows this block — it renders the question form widget instead.

### 6.4 Question Form Widget

Renders inline in the chat where the AI bubble would appear. Responsive — functions inside both the narrow bubble panel and the full-page AI view.

**Layout:**
- Header with form title
- One question per step
- Bottom navigation: `← Back` / `Next →` buttons (brand-styled, `#D97757` accent)
- Final step: **Review** screen — read-only list of all questions and answers, with an `Edit` link per question to jump back
- **Submit** button on review step calls `submitToolResult()`
- After submit: widget replaced by a locked summary card showing all answers; AI stream resumes

**Question type rendering:**
| Type | Component |
|---|---|
| `radio` | Styled radio buttons, `#D97757` selected state |
| `checkbox` | Multi-select checkboxes, same accent |
| `text` | Single-line input, project input styles |
| `textarea` | Multi-line input, resizable |

### 6.5 Media Preview (User Messages)

Images attached to a user message render as a `rounded-xl` thumbnail card with a soft shadow and `#FAF9F5` background above the message text.

PDFs render as a pill with a document icon, filename, and file size — same rounded/shadow treatment.

### 6.6 File Upload

- Paperclip icon button next to the chat input
- Clicking opens file picker (accepts `image/*`, `.pdf`)
- Drag-and-drop: a dashed border overlay covers the entire chat area when a file is dragged over it, with centered text *"Drop image or PDF"*
- On drop/select: file uploads to `POST /copilot/upload/`; a thumbnail/filename pill appears above the input while the user types
- On send: `media_url` and `media_type` included in the message payload
- Max 10MB enforced client-side before upload

### 6.7 Example Prompts (New Conversations)

When a conversation has zero messages, a 2×2 grid of clickable prompt chips is shown, tailored by user role:

| Role | Example prompts |
|---|---|
| founder | "Summarize my active campaigns", "What tasks are overdue on my kanban?", "Draft a campaign update", "Who are my recent investors?" |
| investor | "Show my investment portfolio", "Find campaigns in my preferred industries", "What's my total committed amount?", "Suggest campaigns to explore" |
| team_member | "What tasks are assigned to me?", "Show recent campaign updates", "Summarize the kanban board", "What's new on my startup?" |
| admin | "Show platform statistics", "List recent user signups", "Summarize pending approvals", "How many active campaigns?" |

Clicking a chip sends it as the first message and starts streaming immediately.

---

## 7. Frontend — AI Page & Sidebar

### 7.1 New Route

`/ai` added to `App.tsx` inside the `AppLayout` wrapper, accessible to all authenticated roles.

### 7.2 `AICopilotPage.tsx`

Full-page layout:
- **Left panel** (~280px): conversation list — same as bubble list view
- **Right main area**: full chat interface with all streaming features

Shares all logic and components with the bubble panel. The shared panel component accepts a `fullPage: boolean` prop that adjusts sizing, padding, and input height.

### 7.3 Sidebar

New `AI Assistant` nav item added for all roles, positioned between `Chat` and `Notifications`. Uses `Sparkles` icon from Lucide. The floating bubble remains on all pages including `/ai`.

---

## 8. Signup Enrichment

### 8.1 Investor Onboarding

A new **step 0** inserted before the existing `ProfileStep`:

**Title:** *"Verify your identity"*  
**Content:** Drag-and-drop upload zone. Accepts image (JPG, PNG, WEBP) or PDF. Supported documents: CIN, national ID, passport.  
**Helper text:** *"We'll read your document and fill in the form for you. Works with Arabic and Latin documents."*

On upload:
1. File sent to `POST /auth/extract-document/?type=investor`
2. Loading spinner shown
3. Extracted fields pre-fill subsequent form steps: `full_name` → full name field, `date_of_birth` → new DOB field, `id_number` → new ID number field
4. Document URL saved to `UserProfile.identity_document_url` via `PATCH /users/me/`

**New investor profile fields exposed in onboarding:** `date_of_birth`, `id_number` (in addition to existing background/preferences steps).

**Confidence banner:**
- `high` / `partial` → green: *"We found X fields — review and edit below."*
- `low` → amber: *"We couldn't read everything clearly — please check the fields below."*

**The step is required.** Next button disabled until upload and extraction complete.

### 8.2 Startup Onboarding

A new **step** inserted before `FounderStartupStep`:

**Title:** *"Upload company document"*  
**Content:** Same drag-and-drop zone. Accepts company registration certificate, trade register extract, or equivalent.  
**Helper text:** *"We'll read your document and fill in the form for you. Works with Arabic and Latin documents."*

On upload:
1. File sent to `POST /auth/extract-document/?type=startup`
2. Extracted fields pre-fill: `company_name` → startup name, `registration_id` → new registration ID field, `formation_date` → founding date field, `legal_form` → new legal form field
3. Document URL saved to `UserProfile.company_document_url` via `PATCH /users/me/`

**The step is required.** Next button disabled until upload and extraction complete.

### 8.3 Admin Visibility

The existing admin Users detail view gains a **Documents** section showing:
- Identity document: thumbnail link + upload timestamp (if present)
- Company document: thumbnail link + upload timestamp (if present)

Admins can click either to open the full document in a new tab via the Supabase Storage URL.

---

## 9. New Python Dependencies

| Package | Purpose |
|---|---|
| `openai` | OpenAI-compatible SDK for OpenRouter |
| `pdfplumber` | PDF text extraction (all pages) |

`GITHUB_MODELS_TOKEN` removed from `.env.example`. New `AI_*` vars added.

---

## 10. Implementation Phases

### Phase 1 — AI Infrastructure & Streaming
- `provider.py`, `stream_service.py`
- New SSE endpoints (`/messages/stream/`, `/messages/tool_result/`)
- `CopilotMessage` model migrations
- Remove old `services.py` and sync endpoint
- `useAIStream` hook

### Phase 2 — Chat UI Overhaul
- Thinking block component
- Tool execution block component
- Media preview in user messages
- File upload with drag-and-drop
- Example prompts grid
- Update `AICopilotPanel` to use `useAIStream`

### Phase 3 — Question Widget
- `QuestionForm`, `QuestionStep`, `QuestionReview` components
- `ask_user_questions` tool definition
- SSE `question_form` event handling in `useAIStream`
- `/messages/tool_result/` endpoint wiring

### Phase 4 — AI Page & Sidebar
- `AICopilotPage.tsx`
- `/ai` route
- Sidebar nav item

### Phase 5 — Signup Enrichment
- `POST /auth/extract-document/` endpoint
- `UserProfile` model migrations (`identity_document_url`, `company_document_url`)
- `POST /copilot/upload/` endpoint
- New onboarding steps for investor and startup
- Admin document visibility

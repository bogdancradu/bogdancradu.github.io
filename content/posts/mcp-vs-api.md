---
title: "MCP vs API: How the MCP complements traditional APIs"
subtitle: "Understanding how MCP and APIs work together to make agent integrations smoother and cleaner."
draft: false
date: 2026-02-04
---

## Where this post came from

Honestly? I started writing this because I was confused.

I'd seen MCP mentioned in a few places and I *kind of* got the vibe, but the mechanics were fuzzy. So I did what I always do when something doesn't click: I read the docs, compared MCP to something I already understood (good old APIs), and then I built a tiny MCP server and client to watch it work end-to-end. This post is what I wish someone had handed me before I started.

---

## So what is MCP, really?

**Model Context Protocol (MCP) is an open standard that Anthropic released in November 2024.** The problem they were trying to solve? Every time you want an AI app to talk to a new data source or tool, you end up building a custom connector. Do that enough times and you've got a tangled mess what Anthropic called the "N×M integration problem."

MCP is their answer: a single protocol that gives LLM apps and agents a clean, standardized way to:

- Pull in **context** (read-only data like documents, database rows, files)
- Call **tools** (actions and functions like "send an email" or "create a calendar event")

…from external systems, *without every single integration turning into its own special snowflake.*

### The USB-C analogy (because it actually helps)

Think of your **host app** (Claude Desktop, an IDE, your custom agent runner) as a laptop. MCP is the standardized port and cable. **MCP servers** are the peripherals you plug in such as GitHub, your database, email, Slack, whatever. One port, many devices. That's the idea.

### The moving parts

| Component | What It Does |
|-----------|--------------|
| **Host** | The LLM application (where your agent lives) |
| **Client** | The connector inside the host that speaks MCP |
| **Server** | The thing exposing capabilities (tools, resources, prompts) |

### What can an MCP server actually expose?

MCP servers advertise their capabilities in a consistent, machine-readable way:

- **Tools** - callable actions (like `get_weather` or `create_event`)
- **Resources** - read-only data (docs, files, database rows)
- **Prompt templates** - reusable prompt patterns you might want to share across tools

> **Here's the killer feature:** from an agent's perspective, the client can *discover* what's available at runtime rather than you hardcoding everything upfront. That's a big deal.

---

## Quick refresher: What's an API again?

An **API** is just the standard way one system talks to another usually over HTTP (REST), gRPC, or some flavor of RPC. You already know examples:

- `GET /users/12345`
- `POST /schedule`
- "Send JSON, get JSON back."

APIs are the backbone of how modern applications work. Almost every service you use exposes one. And here's the thing: **MCP usually sits on top of them.** It doesn't replace them, it wraps them.

---

## Where MCP and APIs overlap

They actually have a lot in common:

- Both are **client–server** models (request → response)
- Both are **abstractions** (you don't need to know the internals)
- Both exist to make integration more reliable and reusable

So the real question is: *why do we even need MCP?*

---

## The differences that actually matter

### 1. MCP is agent-shaped; APIs aren't

MCP was designed around how agents actually think:

- *"What tools do I have?"*
- *"What inputs do they need?"*
- *"What data can I fetch for context?"*
- *"How do I call this thing safely and consistently?"*

APIs *can* be used by agents, sure. But they weren't built with agent discovery and tool schemas as first-class ideas.

### 2. Discovery: MCP says "show me what you've got"

With MCP, a client can connect to a server and ask: *"Hey, what can you do?"* The server responds with its tools, resources, and prompts. The client adapts dynamically.

With typical REST APIs? Discovery usually means: read the docs, install the SDK, wait for the developer to email you when endpoints change.

### 3. Standardization: MCP servers look similar; APIs don't

If you integrate five different REST APIs, you're probably writing five different adapters, each with its own auth style, pagination pattern, endpoint naming conventions, and error formats.

With MCP, the *shape* of the interaction is standardized. Your host/client code becomes way more reusable.

|  | Traditional API | MCP |
|--|-----------------|-----|
| **Primary audience** | Any client (web, mobile, backend) | LLM apps & agents |
| **Discovery** | Docs + SDK | Runtime introspection |
| **Schema consistency** | Varies per service | Standardized |
| **Integration effort** | Custom adapter per API | Reusable client code |

---

## The "aha" moment: MCP servers usually wrap APIs

This is the part that made everything click for me.

> **An MCP server is often just a friendly wrapper around an existing API.**

The MCP server exposes a tool like `repository/list`. Under the hood, it calls the GitHub API, translates the response, and returns it in the MCP format. So MCP and APIs aren't competing. They're just different **layers**, with one sitting on top of the other:

- At the top, you have the **MCP layer** - the agent-friendly interface with discovery, schemas, and tools. This is what agents talk to.
- Underneath, you have the **API layer** - the underlying service contract (REST, gRPC, whatever). This is what MCP servers call.

---

## A quick note on discovery endpoints

You'll see both `/.well-known/mcp.json` and `/.well-known/mcp` mentioned in the ecosystem. They're not the same thing, and it trips people up.

![Diagram: Shopify-style flow using .well-known/mcp.json to discover tools and update a store](/415922701-86446d48-ce15-483b-86a3-f18f9180913f.png)
*Figure: A Shopify-style agent flow using `/.well-known/mcp.json` to discover tools and update a store.*

### /.well-known/mcp.json

This is the "single JSON discovery document" pattern. Before a client even tries to connect, it can fetch this one file to learn: server metadata, how to connect, what auth is required, what capabilities exist. It's discovery *before* connection very web-native.

### /.well-known/mcp

This is more of a "well-known discovery namespace" a broader location that could host structured discovery info. It's still evolving with the ecosystem.

**Practical takeaway:** `mcp.json` is concrete, `mcp` is broader. Both are about making it easy to find what a server can do.

---

## When would I use which?

Here's my mental model for real projects:

- If I want *any* client to talk to my system (web apps, mobile apps, backend services, partner integrations), I **expose an API**. That's still the universal contract.
- If I want *agents* to plug in cleanly with runtime discovery, consistent tool schemas, and fewer bespoke adapters I **add MCP** on top.

> **TL;DR:** APIs are the base layer. MCP makes them nicer for agents.

---

## The part where I actually built something

After rtfm, I wanted to see MCP in action. To do that, I built a small MCP server/client setup to explore:

- How tools get advertised
- What discovery actually feels like
- How an MCP server maps tool calls to underlying logic (or an API)

If you want to try it yourself, the code is available **[here](https://github.com/bogdancradu/minimal-mcp-server)**.

---

## Wrapping up

MCP isn't trying to kill APIs. It's trying to make them easier to use when your client is an LLM agent that needs to discover what's available, understand how to call it, and do so consistently across many different services. If that sounds useful for what you're building, give it a look. If not, REST is still your friend and probably always will be.

Hope this helped make things a little less fuzzy.
---
title: "Routing Copilot's Premium Models Through a Local AI Gateway"
subtitle: "LiteLLM, device auth, and a fallback chain that keeps your tools running when quotas run out."
draft: false
date: 2026-02-10
---

I have a GitHub Copilot subscription. You probably do too. What you might not know is that buried inside that subscription are premium requests to some genuinely powerful models — Claude Opus, Gemini previews, GPT-5-mini — and you're almost certainly not using all of them.

I wanted to fix that. So I built a small proxy that sits on your machine, speaks the OpenAI API, and quietly routes your requests through Copilot's model endpoints. Any tool that talks to OpenAI can now talk to your Copilot subscription instead. No API keys to buy. No billing dashboards to watch. Just the models you're already paying for, available at `localhost:4000`.

I'm calling it **LiteLLM Proxy for GitHub Copilot**, and this post walks through what it does, how it works, and how to get it running in about five minutes.

---

## The problem (or: why I was annoyed)

Here's the situation. I use a bunch of CLI tools and scripts that expect an OpenAI-style endpoint. I also have a Copilot subscription with premium model access that I barely touch outside of VS Code. These two facts seemed like they should be friends, but they weren't.

The Copilot API isn't public in the traditional sense — there's no "here's your API key, go wild" page. There's a device auth flow, internal token exchanges, and endpoint URLs that aren't documented for general use. Getting a request from a random Python script to Copilot's Claude endpoint requires custom infrastructure, so I developed the necessary integration layer.

---

## What the proxy actually does

The core idea is dead simple. LiteLLM (an open-source model gateway) handles protocol translation and routing. I added a thin authentication layer on top that deals with GitHub's Device Flow, and wrapped it all in a config that defines a fallback chain across Copilot-hosted models.

Here's what you end up with:

- **A local OpenAI-compatible API** at `http://localhost:4000` — any tool that speaks OpenAI can hit it.
- **A browser-based auth page** at `http://localhost:4001/github` — click a button, paste a code into GitHub, done.
- **A fallback chain** — if Claude Opus hits your quota limit, the proxy silently retries with Gemini, then GPT-5-mini. Your client never notices.

The architecture looks like this:
![Diagram: Client → LiteLLM Proxy → GitHub Copilot API → upstream model, with fallback chain on quota errors](/a1433626-8355-4205-ae4b-7bcfdd8fd0c2.png)
*Figure: The request flow — your client talks to the proxy, which routes through Copilot to Claude, Gemini, or GPT-5-mini, falling back automatically when a model hits its quota.*

---

## Getting it running

The fastest path is Docker. Clone the repo and run:

```bash
docker compose up -d --build
```

Then open `http://localhost:4001/github` in your browser. You'll see a page with a device code and a friendly button.
![Screenshot: The auth helper page with device code and "Copy & Authorize" button](/e387ba88-0180-448c-9f2b-20489c5091dc.png)
*Figure: The browser-based auth page — copy the device code, paste it into GitHub, and the proxy handles the rest.*

Click the button, paste the code into GitHub's device auth page, authorize, and the proxy picks up the token automatically. It saves everything under a `litellm_data` volume so you don't have to re-auth every time you restart.

You can tail the logs to see the proxy come to life:

```bash
docker compose logs -f litellm
```

![Screenshot: Terminal output showing LiteLLM loading models from config.yaml and confirming the Copilot token](/d3b135f6-53cf-41ef-b6dc-adc410bfd95c.png)
*Figure: LiteLLM starting up — model list loaded, Copilot token found, proxy ready to accept requests.*

That's it. You now have a working OpenAI endpoint backed by your Copilot subscription.

---

## Actually using it

The proxy behaves exactly like an OpenAI API. The default API key in the example setup is `sk-1234` (change it in production, obviously).

Here's a Python example:

```python
import litellm

response = litellm.completion(
    model="litellm_proxy/github_copilot/claude-opus-4.6",
    messages=[{"role": "user", "content": "Explain quantum computing in simple terms."}],
    api_base="http://localhost:4000",
    api_key="sk-1234"
)
print(response.choices[0].message.content)
```

And the same thing with curl, if that's more your speed:

```bash
curl -X POST "http://localhost:4000/v1/chat/completions" \
  -H "Authorization: Bearer sk-1234" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "github_copilot/claude-opus-4.6",
    "messages": [{ "role": "user", "content": "Explain quantum computing in simple terms." }]
  }'
```

The response looks identical to what you'd get from OpenAI's API. Your tools don't need to know anything changed.

---

## The fallback chain (the part I'm most proud of)

This is the feature that makes the proxy actually practical for daily use instead of just a fun hack.

Copilot's premium models have request limits. When you burn through your Claude Opus quota for the month, requests start failing. Without the proxy, that means your workflow breaks and you go fiddle with API keys. With the proxy, the request silently rolls over to the next model in line.

The default chain is:
**Claude Opus → Gemini 3 Pro Preview → GPT-5-mini**

It's defined in `config.yaml` and completely customizable:

```yaml
model_list:
  - model_name: github_copilot/claude-opus-4.6
    litellm_params:
      model: github_copilot/claude-opus-4.6
      supports_tool_calling: true
      fallbacks: ["github_copilot/gemini-3-pro-preview", "github_copilot/gpt-5-mini"]
```

Your client asks for Claude. If Claude is available, it gets Claude. If not, it gets Gemini. If Gemini is also exhausted, GPT-5-mini. The response format stays the same either way. The proxy absorbs the chaos so your scripts don't have to.

---

## The admin panel (your command center)

Here's something I didn't expect to love as much as I do: LiteLLM ships with a full admin dashboard, available at `http://localhost:4000/ui`. Once you log in with the credentials you set in your environment (`UI_USERNAME` and `UI_PASSWORD`), you get a bird's-eye view of everything flowing through your proxy.

The dashboard lets you monitor spend per model, per key, and per user — which is genuinely useful when you're trying to understand how fast you're burning through Copilot's premium quotas. You can see which models are getting hit the most, track latency across providers, and spot when fallbacks are kicking in more often than usual.

But it's not just monitoring. From the UI you can add or remove models without restarting the proxy, generate and revoke API keys on the fly, set per-key rate limits and budgets, and manage team access if you're sharing the proxy with others. Need to give a colleague access but cap them at 50 requests per minute? That's a few clicks. Want to add a new model to the fallback chain without touching `config.yaml`? The UI handles it.

![Screenshot: LiteLLM admin dashboard showing usage overview, model spend, and latency metrics](/2358ff74-cd4f-4e6f-9c3a-28dcedb6687e.png)
*Figure: The admin dashboard at `/ui` — model spend breakdown, request counts, and latency metrics across your Copilot-backed providers.*

You can also opt into logging full request and response payloads to the dashboard by adding `store_prompts_in_spend_logs: true` to your config. This turns the admin panel into a proper debugging tool — you can inspect exactly what went in and what came back for any request. Just be mindful that this stores your prompts in the database, so treat it accordingly.

For a single-user setup on your laptop, the admin panel is a nice-to-have. But if you're running this for a small team or want to keep a close eye on quota consumption, it's surprisingly powerful for something that comes free with the proxy.

---

## How the auth works under the hood

If you're curious about the mechanics: the helper service kicks off GitHub's Device Flow, which is the same flow you've seen when signing into GitHub on a TV or CLI tool. The proxy renders a page with the user code, you paste it into GitHub, and once you authorize, the backend polls until it gets a token.

That token then gets exchanged for Copilot-specific credentials — an API key and endpoint URL — which are saved locally under `~/.config/litellm/github_copilot/` (or the Docker volume). LiteLLM reads these on every request to authenticate with GitHub's internal Copilot endpoints.

There's also a `fetch_models.py` utility in the repo if you want to poke around and see which models your subscription gives you access to.

---

## Things that tripped me up (so they don't trip you)

*"UnsupportedParamsError: github_copilot does not support parameters: ['thinking']"*

Some clients send extra parameters that the upstream Copilot provider doesn't recognize. The fix is adding `drop_params: true` to your `config.yaml`, which tells LiteLLM to strip anything the target model doesn't understand. Alternatively, you can write a small callback to selectively clean fields for specific fallback targets.

**Fallbacks not firing**
The router matches on exact model names. If the `fallbacks` list references `github_copilot/gemini-3-pro-preview` but your `model_list` has a slightly different name, the chain breaks. Double-check the IDs match exactly.

**Logging caution**
You can enable full request/response logging for debugging, but those logs will contain your prompts and completions in plain text. Treat the `litellm_data` directory and any log files like secrets. Don't commit them. Set proper file permissions. If you need logging in a shared environment, look into LiteLLM's redaction callbacks.

---

## Running without Docker

If containers aren't your thing, the setup is straightforward — but I'd strongly recommend using a Python virtual environment. LiteLLM pulls in a decent number of dependencies, and you don't want those polluting your global Python installation or colliding with other projects.

```bash
# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate  # on Windows: .\.venv\Scripts\Activate.ps1

# Install dependencies inside the venv
pip install -r requirements.txt

# Terminal 1: start the auth helper
python run_proxy.py

# Terminal 2 (activate the same venv first): start LiteLLM
source .venv/bin/activate
litellm --config config.yaml --detailed_debug
```

Same auth flow — open `localhost:4001/github`, authorize, and you're good. When you're done, just `deactivate` to leave the virtual environment. Everything stays contained.

---

## Files worth knowing about

The repo is intentionally small. Here's what matters:

- **`run_proxy.py`** — The FastAPI service that handles the device auth flow and saves tokens.
- **`fetch_models.py`** — A utility that lists available Copilot models using your token. Good for sanity-checking.
- **`config.yaml`** — Where the model routing, fallback chains, and LiteLLM settings live. This is the file you'll edit most.

---

## Why bother?

Honestly? Because it's satisfying to type a curl command and get Claude Opus responding from a subscription I was already paying for. Because fallback chains mean my scripts don't break at the end of the month. And because once you have a local OpenAI endpoint, you can plug it into anything — CLI agents, Jupyter notebooks, custom tools — without managing a single API billing account.

If you have a Copilot subscription collecting dust outside of VS Code, give this a shot. Five minutes of setup, and you've got a personal AI API running on your laptop.

---

*The repo is **[here](https://github.com/bogdancradu/litellm-proxy-copilot)**. Star it if this saved you some time, and open an issue if something breaks.*

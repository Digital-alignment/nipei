# 42 · Prime Agent — the Self-Improving Python Agent (Optional)

> 🛑 **Already built.** This tab ships working — don't ask an AI to build it. Missing? Update your pack (`Update Nipei OS.command`).

The **Prime Agent** tab runs [prime-agent](https://github.com/PrimeIntellect-ai/prime-agent) — Prime Intellect's open-source (MIT) coding agent with a twist: the model gets **one persistent Python (IPython) workspace**, and every tool it uses is real Python code it writes into that workspace. The terminal in the tab shows the *actual code* the agent runs — not an opaque tool call.

Its headline feature: **autonomous mode** — give it a goal plus budgets (turns / tokens / time) and "gates" (checks that must pass), and it keeps working until the gates are green. Nothing else in the OS does that.

## Setup (5 minutes)
1. **Install prime-agent** (official installer):
   ```bash
   curl -fsSL https://app.primeintellect.ai/prime-agent/install.sh | sh
   ```
2. **Connect a model provider** — run it once in a terminal and follow its setup (it supports the major providers; pick whichever you already have a key/login for):
   ```bash
   prime-agent
   ```
3. Open the **Prime Agent** tab and build. Your builds land in the tab's Workspace; sessions show up in its History.

> 🟢 Easiest: open any AI agent in the folder and say *"install prime-agent from app.primeintellect.ai and help me connect my model provider."*

## Good to know
- **Costs are yours** — it runs on whichever provider/key you connect to prime-agent.
- **State** lives in `~/.prime/agent/`; builds the OS drives go to `~/.nipei-os/prime-agent/builds/`.
- **Why bother?** The Python-workspace design means you can *read* everything it does, and autonomous mode + gates is the closest thing to "keep going until it actually works" in the whole OS.

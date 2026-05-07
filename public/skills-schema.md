# skills.json — field reference

This file is loaded at runtime by the Optimizer tab to personalise LLM prompts.
Edit it to match your own background; no rebuild is needed (it is served as a
static asset).

## preferredVerbs
An array of action verbs you want the resume optimizer to favour when
rewriting bullet points. Strong, specific verbs (e.g. "architected",
"reduced") read better than weak ones ("worked on", "helped with"). List
them in rough priority order — the LLM will weight earlier entries higher.

## skillHighlights
Technologies, tools, or competencies you want surfaced in tailored bullets.
If a job description mentions something in this list, the optimizer will
ensure it appears prominently in the output. Keep this list honest — only
include skills you can speak to in an interview.

## tonePreference
A free-text description of the voice and style you want in generated content.
Used for both resume bullets and outreach messages. Example values:
- `"concise and metrics-driven"`
- `"warm and conversational, suitable for startup culture"`
- `"formal, appropriate for consulting or finance roles"`

## industryFocus
An array of sectors or sub-industries you are targeting. The optimizer uses
this to weight domain-specific terminology and highlight the most relevant
aspects of your experience when tailoring for a given job description.

# Use of AI in SHIFT

Team Squadron Zero · NASA Space Apps Challenge 2026, Challenge 9: Harmonization of MODIS and VIIRS Hot Spots · updated 13 November 2026 (replaces the version of 13 October 2026)

The NASA Space Apps 2026 rules ask every team to name each AI tool it used, what the tool did, the data it worked on, and the prompts and reasoning behind it. This file is that record. The "Use of AI" field of our NASA project page is a shorter version of it.

## 1. Summary

We used three AI systems to build SHIFT and one AI video tool in our prescreening video.

- **Claude (Anthropic)** was our engineer and scientific collaborator. It proposed the harmonisation method that replaced our first equation, designed the validation, and wrote nearly all of the code, tests, workflows and documentation in this repository.
- **ChatGPT (OpenAI)** helped build our earlier Florida prototype, then tutored the team and reviewed Claude's work.
- **Gemini (Google)**, as a custom "SHIFT Tutor" Gem, was the team's main tutor and a reviewer.
- **Google Veo, through Google Flow,** made AI-generated footage in Video 1.

No AI runs inside SHIFT. The website is static files and calls no model. No number that SHIFT shows was produced by an AI's text: every number comes from tested code that the team ran.

## 2. Claude (Anthropic)

**How it was used.** In the Claude app, inside a shared project, with code execution, a Linux workspace, browser automation (Playwright) and access to this GitHub repository. The commit trailers name the models: Claude Opus 5.5 and Claude Fable 5.1. Work passed between successive build chats through written handoff notes.

**What it did.**

- **Scientific method.** Proposed and implemented the production harmonisation: hotspots counted as 0.05° cell-days, MODIS-to-VIIRS ratio factors per 2.5° cell and calendar month shrunk towards their 10° tile, the choice of MODIS source per era (D19), fire power as a ratio of totals with no intercept (D21), the persistent non-fire mask (D22, D26), gap filling tested on simulated outages (D25) and the 2012 gate (D27, D28). Each proposal came with a decision rule that the team approved and committed to `config/settings.yaml` before the run that judged it.
- **Validation design.** The backward test (factors fitted on 2016 to 2019, predicting 2012 to 2015), leave-one-year-out, bootstrap ranges, category agreement, the coverage check, the comparison with simpler methods, the known-event test and the outside checks against GFED4 burned area and MERRA-2 cloud.
- **Code.** All of `pipeline/shift/` and its tests. All of `web/src/`: the React and MapLibre website with its 2D map, 3D globe, calendars, charts, downloads, Method and Validation pages. `recent/` (near-real-time FIRMS fetch, snapshot fallback and row checks), `context/` (NASA POWER weather context), `geo/` (map geography and licence filtering) and the GitHub Actions workflows.
- **Tests.** About 200 automated tests (pipeline, recent detections, preflight, website, including nine guards that fail if retired claims return) and Playwright browser checks that open the built site and read its numbers.
- **Audits and corrections.** At the team's request, a critical audit of its own method (`docs/audit/`, 8 November 2026), written with the instruction to review critically and not to defend. A correction of its own overstated validation wording (`docs/audit/SCIENTIFIC_CLAIMS_CORRECTION_2026-11-11.md`, pull request #3), after the team required eight revisions. A self-audit and hotfix of the recent detections layer (pull requests #4 and #7). Readers should weigh these audits knowing that the same system wrote the code.
- **Documentation and process.** The README, `docs/`, the Colab guide, the step-by-step instructions the team pasted into the tutors, pull request descriptions, and the submission text.
- **Interface work.** The mobile layout pass (pull request #9), design variants compared by the team on phones, the interface polish (pull request #12) and before and after screenshots.

**What it did not do.** It never ran the pipeline on the full global data (the team did, on Google Colab). It never held the FIRMS API key or any password. It never merged or deployed a change without the team's instruction.

**Data it worked on.**

| Data | How |
| --- | --- |
| NASA FIRMS MODIS and VIIRS (S-NPP, NOAA-20) archive files | Read the Florida downloads and `samples/florida_sample.zip` directly. The global archive (390 million detections) only through code the team ran on Colab |
| NASA FIRMS near-real-time NOAA-20 and NOAA-21 | Wrote the fetch code and read the GitHub Actions run logs and the published snapshot. The key stays in GitHub and Colab secrets |
| NASA POWER, MERRA-2, GFED4 | Wrote the download code and read the reduced tables |
| NASA GIBS imagery | Wrote the map code only |
| Natural Earth, geoBoundaries, world-atlas | Prepared the served boundary files |
| Pipeline outputs (cell-days, factors, validation and quality reports, exported site data) | Read throughout |
| Source code, settings, logs, screenshots | Wrote and read |
| Personal data | None |

## 3. ChatGPT (OpenAI)

- **Florida prototype, before October 2026.** Helped the team build SHIFT v1, a Florida-only Streamlit app. Its calibration equation, VIIRS_FRP = 0.316 x MODIS_FRP + 24.7, was developed by the team. SHIFT keeps it only as the Florida regression check. SHIFT's own method has no intercept (D21).
- **Tutor, from 12 October 2026.** A ChatGPT Project with the written prompt in section 7. It explained Claude's instructions one step at a time and read error messages. It was not allowed to write or change code.
- **Reviewer, from 10 November 2026.** Answered the team's check lists on each pull request and live deployment.
- **Review and planning.** The team used it to review Claude's scientific claims and audit reports, to look for weaknesses in the validation and in the recent detections reliability, to draft structured audit and review prompts for Claude, and to review the interface.

ChatGPT reviewed reports and code. It ran no experiments and computed no results.

**Data it saw.** The Florida FIRMS CSV files (prototype only), Claude's instructions, outputs and errors pasted by the team, pull request pages, the live website and our reports. No global raw data, no Drive files, no keys.

## 4. Gemini (Google)

- **"SHIFT Tutor" Gem (Gemini Pro), from 12 October 2026.** The team's main tutor. It explained what each Colab step does and why, showed the expected output, checked pasted output, read errors and tracked steps. Its instructions forbid writing or changing code. After it once added `| head` to a command and repeated a step, exact-copy and step-tracking rules were added (section 7).
- **Reviewer.** Answered the same pull request and live-site check lists as ChatGPT.

**Data it saw.** Claude's instructions, outputs, errors and screenshots pasted by the team, and the live website. No raw data.

## 5. Videos

- **Video 1 (prescreening, submitted by 1 October 2026)** contained AI-generated footage made with Google Veo through Google Flow. It was not credited in the video at the time and is disclosed here.
- **Videos 2 and 3** contain no AI-generated footage, voice, music or subtitles.

## 6. What the team did

- Chose Challenge 9, wrote the scientific question (`docs/SCIENTIFIC_SPECIFICATION.md`, 3 October 2026), and built the Florida prototype and its equation.
- Created the Earthdata and GitHub accounts, requested and downloaded every NASA dataset, tested the FIRMS key and stored it as a secret.
- Ran every pipeline stage on Google Colab from the team account, kept all raw data on the team's Google Drive, and pasted every output back for checking.
- Approved every method decision as a numbered entry in the decision log, each with a rule fixed before the run.
- Reviewed each pull request with the tutors' check lists and the GitHub checks, gave the instruction for every merge, and checked the live site on laptops and phones after each deployment.
- Required eight revisions to the 11 November claims correction.
- Chose the features (not-a-fire layer, 3D globe, recent detections, weather context, map geography), the interface variant and the labels.
- Made the videos and the project page.

## 7. Prompts and reasoning

**Tutor prompt (ChatGPT, pasted 12 October 2026. The Gem uses the same text).** Abridged: the block of project facts is left out and step 3 is shortened. The aim was to let a team new to Python pipelines, Git and Colab run a research pipeline safely, without the tutors changing the engineer's code.

```
You are a patient technical tutor for Team Squadron Zero, a 6-person team entering the NASA Space
Apps Challenge 2026 (13-14 Nov). Our project is SHIFT: a website that harmonises MODIS and VIIRS
satellite fire data into a global burning-activity calendar.

HOW WE WORK
- Claude is our lead engineer. Claude writes all the code, designs the setup and makes the technical decisions.
- Your job is NOT to write or redesign anything. Your job is to help me understand and carry out what
  Claude gave me, one step at a time.
- Our skill level: we know some Python, no JavaScript, and we are new to Git, GitHub, Colab and
  command lines. Explain like we are smart beginners.

WHEN I PASTE AN INSTRUCTION FROM CLAUDE
1. First, give a short overview: what this whole instruction achieves and why it matters, in 3-5 plain sentences.
2. Then break it into small numbered steps. Show me ONLY step 1.
3. For each step tell me what to do, why we are doing it, and what I should see if it worked.
4. Then STOP and wait. Do not show the next step until I reply "done", paste the output, or send a screenshot.
5. When I send output or a screenshot, check it. Tell me clearly whether it worked before moving on.

IF SOMETHING GOES WRONG
- Ask me for the exact error message or a screenshot. Do not guess.
- Explain what the error means in plain words.
- Suggest a fix only if it is clearly a setup problem on my side.
- If the problem looks like it is in Claude's code or instructions, do NOT rewrite the code. Write me a
  short, clear message I can send back to Claude.

RULES
- Never change, replace or "improve" Claude's code, file names, folder names, settings or commands.
- If you think Claude made a mistake, say so as a question for me to take back to Claude.
- If you are not sure about something specific, say "I'm not sure, check with Claude".
- One step at a time. Always.
```

The Gem's last line was replaced with "At the start of each chat, wait for me to paste Claude's instruction." Lines added to the Gem later:

```
Copy every code cell from Claude's instruction EXACTLY, character for character. Never add, remove or
"improve" anything (not even "| head").
Step tracking: start every reply with "Done: ... | Now: Step N". When the user writes "Step N done",
give the NEXT step. Never repeat a finished step unless the user writes "redo Step N".
```

**Standing instructions to Claude.** Keep the v1 method and results as the Florida regression test. Nothing downstream may depend on a specific data file. Every choice that could tilt a result is decided by a rule committed before the run that judges it. Explain every step in plain English for the team. Never push or merge without the team's instruction. Mark anything unsure as uncertain. No NASA logos. No key or password anywhere.

**Audit instruction (8 November 2026).** Review the method critically and do not defend it.

Claude's engineering work was conversational, so there is no fixed prompt set for the code. The commit messages and pull request descriptions record what each change was asked to do.

## 8. How AI output was checked

- Every number on the site comes from tested code run by the team. The pipeline stamps the git commit, the settings hash and the software versions into every report.
- Every judgement that could tilt a result was written into the settings and committed before the run it judged.
- The new pipeline had to reproduce the team's v1 Florida result before anything else was built (slope 0.3165 against v1's 0.3162).
- Automated tests run on GitHub on every change. Nine claims guards fail if retired wording returns. `docs/preflight/verify_baseline.py` fails if any of 41 scientific files changes.
- Problems this process caught: the intercept in the v1 line (replaced in D21), overstated validation wording (corrected 11 November), seven reliability defects in the recent detections layer (fixed the same day), a broken chart download, and contradictions in early AI-assembled planning documents.

## 9. Limits of this record

The ChatGPT and Gemini conversations are not stored in this repository, so their part is described from the team's own records. Git history shows which commits came from a Claude session, not whether a person edited a change before it was committed.

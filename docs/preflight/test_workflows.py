"""Static checks of the GitHub Actions workflows (audit D6 and Task 2 WP4). They read the YAML only.
Run: python -m pytest -q docs/preflight"""
from pathlib import Path

import yaml

WF = Path(__file__).resolve().parents[2] / ".github" / "workflows"


def load(name):
    return yaml.safe_load((WF / name).read_text(encoding="utf-8"))


def writes(perms) -> set:
    return {k for k, v in (perms or {}).items() if v == "write"}


def test_pages_build_job_cannot_write_and_only_deploy_can():
    w = load("pages.yml")
    assert w["permissions"] == {"contents": "read"}                         # workflow default: read only
    assert writes(w["jobs"]["build"].get("permissions")) == set()             # build: no write at all
    assert w["jobs"]["deploy"]["permissions"] == {"pages": "write", "id-token": "write"}


def test_the_firms_key_reaches_one_step_only_and_never_the_deploy_job():
    w = load("pages.yml")
    with_key = [s.get("name") for job in w["jobs"].values() for s in job.get("steps", [])
                if "NASA_FIRMS_MAP_KEY" in str(s.get("env", {}))]
    assert with_key == ["Recent detections, new fetch (the FIRMS key is given to this step only)"]
    assert "secrets." not in str(w["jobs"]["deploy"])
    assert "NASA_FIRMS_MAP_KEY" not in str(w["jobs"]["deploy-cloudflare"])
    trig = w.get("on", w.get(True))                                           # PyYAML reads "on" as True
    assert "pull_request" not in trig and "pull_request_target" not in trig


def test_tests_and_build_check_workflows_are_read_only():
    for name in ("tests.yml", "web-check.yml"):
        w = load(name)
        assert w["permissions"] == {"contents": "read"}, name
        assert all(writes(j.get("permissions")) == set() for j in w["jobs"].values()), name
        assert "secrets." not in (WF / name).read_text(), name


def test_tests_workflow_runs_the_scientific_baseline_check_first():
    steps = load("tests.yml")["jobs"]["test"]["steps"]
    runs = [s.get("run", "") for s in steps]
    i = next(k for k, r in enumerate(runs) if "verify_baseline.py" in r)
    assert "--update" not in runs[i] and "baseline_manifest" not in " ".join(runs)   # never rewrites the baseline
    assert i <= 1                                                              # right after checkout


def test_cloudflare_backup_job_cannot_write_runs_no_project_code_and_scopes_its_token():
    """Backup copy on Cloudflare Pages (13 Nov): uploads the build job's artifact as it is."""
    w = load("pages.yml")
    job = w["jobs"]["deploy-cloudflare"]
    assert job["needs"] == "build"
    assert job["permissions"] == {"contents": "read"}                         # no GitHub write at all
    steps = job["steps"]
    assert not any("actions/checkout" in s.get("uses", "") for s in steps)     # runs no project code
    with_token = [s.get("name") for s in steps if "secrets." in str(s)]
    assert with_token == ["Create the Cloudflare Pages project once (an existing project is left as it is)",
                          "Upload to Cloudflare Pages"]
    for s in steps:
        if "secrets." in str(s):
            assert set(s["env"]) == {"CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"}
    assert "secrets." not in str(w["jobs"]["build"]).replace("secrets.NASA_FIRMS_MAP_KEY", "")

import pytest


@pytest.fixture(autouse=True)
def no_ai_config(request, monkeypatch):
    """Clear keys loaded from backend/.env so tests never call a real API.

    Tests marked `live` keep them, since calling the real API is their point.
    """
    if request.node.get_closest_marker("live"):
        return
    for name in ("ANALYZER", "ANTHROPIC_API_KEY", "ANTHROPIC_WORKSPACE_ID", "ANTHROPIC_MODEL", "MISTRAL_API_KEY"):
        monkeypatch.delenv(name, raising=False)

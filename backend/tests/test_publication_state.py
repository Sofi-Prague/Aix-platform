from types import SimpleNamespace

from app.core.publication_state import mark_index_draft_if_published


def test_published_index_is_returned_to_draft():
    index = SimpleNamespace(status="published")

    changed = mark_index_draft_if_published(index)

    assert changed is True
    assert index.status == "draft"


def test_non_published_index_is_unchanged():
    index = SimpleNamespace(status="draft")

    changed = mark_index_draft_if_published(index)

    assert changed is False
    assert index.status == "draft"

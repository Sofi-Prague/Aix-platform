"""
Helpers for preserving published-index integrity.

The current release does not yet implement immutable published versions.
Instead, any successful mutation that can affect methodology, data,
weighting, or calculated results returns a published index to Draft.
"""


def mark_index_draft_if_published(index) -> bool:
    """Return a published index to draft before committing a mutation."""
    if index.status == "published":
        index.status = "draft"
        return True

    return False

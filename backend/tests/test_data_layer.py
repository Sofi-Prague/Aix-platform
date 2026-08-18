import io
import uuid

from fastapi.testclient import TestClient

from app.core.db import SessionLocal
from app.core.models import (
    DataPoint,
    DataSource,
    Dimension,
    Index,
    Indicator,
)


def create_methodology(
    temporary_user: dict,
) -> tuple[Index, Dimension, Indicator]:
    db = SessionLocal()

    try:
        index = Index(
            tenant_id=uuid.UUID(
                temporary_user["tenant_id"]
            ),
            name="Data Layer Test Index",
            slug=f"data-layer-{uuid.uuid4()}",
            description="Test index",
            created_by=uuid.UUID(
                temporary_user["id"]
            ),
        )

        db.add(index)
        db.flush()

        dimension = Dimension(
            index_id=index.id,
            name="Technology",
            description="Technology dimension",
            order_position=1,
        )

        db.add(dimension)
        db.flush()

        indicator = Indicator(
            dimension_id=dimension.id,
            name="Internet Speed",
            description="Average internet speed",
            unit="Mbps",
            directionality="higher_is_better",
            status="ready",
            order_position=1,
        )

        db.add(indicator)
        db.commit()

        db.refresh(index)
        db.refresh(dimension)
        db.refresh(indicator)

        # Detach before closing the session.
        db.expunge(index)
        db.expunge(dimension)
        db.expunge(indicator)

        return index, dimension, indicator

    finally:
        db.close()


def upload_url(
    index: Index,
    dimension: Dimension,
    indicator: Indicator,
) -> str:
    return (
        f"/data/indexes/{index.slug}"
        f"/dimensions/{dimension.id}"
        f"/indicators/{indicator.id}"
        "/sources/upload"
    )


def sources_url(
    index: Index,
    dimension: Dimension,
    indicator: Indicator,
) -> str:
    return (
        f"/data/indexes/{index.slug}"
        f"/dimensions/{dimension.id}"
        f"/indicators/{indicator.id}"
        "/sources"
    )


def test_upload_csv(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, dimension, indicator = (
        create_methodology(temporary_user)
    )

    csv_content = (
        "entity,period,value\n"
        "Malta,2025,93\n"
        "France,2025,87\n"
        "Germany,2025,82\n"
    )

    response = client.post(
        upload_url(
            index,
            dimension,
            indicator,
        ),
        headers=auth_headers,
        data={
            "name": "Internet Speed Dataset",
        },
        files={
            "file": (
                "internet-speed.csv",
                io.BytesIO(
                    csv_content.encode("utf-8")
                ),
                "text/csv",
            ),
        },
    )

    assert response.status_code == 201, (
        response.text
    )

    body = response.json()

    assert body["rows_imported"] == 3

    assert (
        body["data_source"]["name"]
        == "Internet Speed Dataset"
    )

    assert (
        body["data_source"]["source_type"]
        == "csv"
    )

    assert (
        body["data_source"][
            "original_filename"
        ]
        == "internet-speed.csv"
    )


def test_upload_semicolon_csv(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, dimension, indicator = (
        create_methodology(temporary_user)
    )

    csv_content = (
        "entity;period;value\n"
        "Malta;2025;93\n"
        "France;2025;87\n"
    )

    response = client.post(
        upload_url(
            index,
            dimension,
            indicator,
        ),
        headers=auth_headers,
        data={
            "name": "European CSV",
        },
        files={
            "file": (
                "data.csv",
                csv_content.encode("utf-8"),
                "text/csv",
            ),
        },
    )

    assert response.status_code == 201, (
        response.text
    )

    assert response.json()["rows_imported"] == 2


def test_upload_rejects_invalid_headers(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, dimension, indicator = (
        create_methodology(temporary_user)
    )

    csv_content = (
        "country,year,score\n"
        "Malta,2025,93\n"
    )

    response = client.post(
        upload_url(
            index,
            dimension,
            indicator,
        ),
        headers=auth_headers,
        data={
            "name": "Bad Dataset",
        },
        files={
            "file": (
                "bad.csv",
                csv_content.encode("utf-8"),
                "text/csv",
            ),
        },
    )

    assert response.status_code == 400

    assert (
        response.json()["detail"]
        == (
            "CSV must contain the columns: "
            "entity, period, value."
        )
    )


def test_upload_rejects_non_numeric_value(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, dimension, indicator = (
        create_methodology(temporary_user)
    )

    csv_content = (
        "entity,period,value\n"
        "Malta,2025,hello\n"
    )

    response = client.post(
        upload_url(
            index,
            dimension,
            indicator,
        ),
        headers=auth_headers,
        data={
            "name": "Bad Values",
        },
        files={
            "file": (
                "bad-values.csv",
                csv_content.encode("utf-8"),
                "text/csv",
            ),
        },
    )

    assert response.status_code == 400

    assert "not a valid number" in (
        response.json()["detail"]
    )


def test_upload_rejects_duplicates(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, dimension, indicator = (
        create_methodology(temporary_user)
    )

    csv_content = (
        "entity,period,value\n"
        "Malta,2025,93\n"
        "Malta,2025,95\n"
    )

    response = client.post(
        upload_url(
            index,
            dimension,
            indicator,
        ),
        headers=auth_headers,
        data={
            "name": "Duplicate Dataset",
        },
        files={
            "file": (
                "duplicates.csv",
                csv_content.encode("utf-8"),
                "text/csv",
            ),
        },
    )

    assert response.status_code == 400

    assert "duplicate" in (
        response.json()["detail"].lower()
    )


def test_failed_upload_creates_no_records(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, dimension, indicator = (
        create_methodology(temporary_user)
    )

    response = client.post(
        upload_url(
            index,
            dimension,
            indicator,
        ),
        headers=auth_headers,
        data={
            "name": "Invalid Dataset",
        },
        files={
            "file": (
                "invalid.csv",
                (
                    "entity,period,value\n"
                    "Malta,2025,not-a-number\n"
                ).encode("utf-8"),
                "text/csv",
            ),
        },
    )

    assert response.status_code == 400

    db = SessionLocal()

    try:
        source_count = (
            db.query(DataSource)
            .filter(
                DataSource.indicator_id
                == indicator.id
            )
            .count()
        )

        point_count = (
            db.query(DataPoint)
            .filter(
                DataPoint.indicator_id
                == indicator.id
            )
            .count()
        )

        assert source_count == 0
        assert point_count == 0

    finally:
        db.close()


def test_list_and_read_data_source(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, dimension, indicator = (
        create_methodology(temporary_user)
    )

    upload_response = client.post(
        upload_url(
            index,
            dimension,
            indicator,
        ),
        headers=auth_headers,
        data={
            "name": "Internet Data",
        },
        files={
            "file": (
                "internet.csv",
                (
                    "entity,period,value\n"
                    "Malta,2025,93\n"
                    "France,2025,87\n"
                ).encode("utf-8"),
                "text/csv",
            ),
        },
    )

    assert upload_response.status_code == 201

    source_id = upload_response.json()[
        "data_source"
    ]["id"]

    list_response = client.get(
        sources_url(
            index,
            dimension,
            indicator,
        ),
        headers=auth_headers,
    )

    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    detail_response = client.get(
        (
            f"{sources_url(index, dimension, indicator)}"
            f"/{source_id}"
        ),
        headers=auth_headers,
    )

    assert detail_response.status_code == 200

    body = detail_response.json()

    assert body["name"] == "Internet Data"
    assert len(body["data_points"]) == 2

    entities = {
        point["entity"]
        for point in body["data_points"]
    }

    assert entities == {
        "Malta",
        "France",
    }


def test_delete_data_source_cascades_points(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
):
    index, dimension, indicator = (
        create_methodology(temporary_user)
    )

    upload_response = client.post(
        upload_url(
            index,
            dimension,
            indicator,
        ),
        headers=auth_headers,
        data={
            "name": "Delete Me",
        },
        files={
            "file": (
                "delete.csv",
                (
                    "entity,period,value\n"
                    "Malta,2025,93\n"
                ).encode("utf-8"),
                "text/csv",
            ),
        },
    )

    assert upload_response.status_code == 201

    source_id = upload_response.json()[
        "data_source"
    ]["id"]

    response = client.delete(
        (
            f"{sources_url(index, dimension, indicator)}"
            f"/{source_id}"
        ),
        headers=auth_headers,
    )

    assert response.status_code == 204

    db = SessionLocal()

    try:
        assert (
            db.query(DataSource)
            .filter(
                DataSource.id
                == uuid.UUID(source_id)
            )
            .first()
            is None
        )

        assert (
            db.query(DataPoint)
            .filter(
                DataPoint.data_source_id
                == uuid.UUID(source_id)
            )
            .count()
            == 0
        )

    finally:
        db.close()

def test_other_tenant_cannot_access_data(
    client: TestClient,
    temporary_user: dict,
    auth_headers: dict[str, str],
    second_auth_headers: dict[str, str],
):
    index, dimension, indicator = (
        create_methodology(temporary_user)
    )

    # Tenant A uploads a dataset.
    upload_response = client.post(
        upload_url(
            index,
            dimension,
            indicator,
        ),
        headers=auth_headers,
        data={
            "name": "Private Dataset",
        },
        files={
            "file": (
                "private.csv",
                (
                    "entity,period,value\n"
                    "Malta,2025,93\n"
                ).encode("utf-8"),
                "text/csv",
            ),
        },
    )

    assert upload_response.status_code == 201

    source_id = upload_response.json()[
        "data_source"
    ]["id"]

    # Tenant B cannot list Tenant A's sources.
    list_response = client.get(
        sources_url(
            index,
            dimension,
            indicator,
        ),
        headers=second_auth_headers,
    )

    assert list_response.status_code == 404

    # Tenant B cannot read the individual source.
    detail_response = client.get(
        (
            f"{sources_url(index, dimension, indicator)}"
            f"/{source_id}"
        ),
        headers=second_auth_headers,
    )

    assert detail_response.status_code == 404

    # Tenant B cannot upload data to Tenant A's indicator.
    foreign_upload = client.post(
        upload_url(
            index,
            dimension,
            indicator,
        ),
        headers=second_auth_headers,
        data={
            "name": "Malicious Upload",
        },
        files={
            "file": (
                "malicious.csv",
                (
                    "entity,period,value\n"
                    "Malta,2025,999\n"
                ).encode("utf-8"),
                "text/csv",
            ),
        },
    )

    assert foreign_upload.status_code == 404

    # Tenant B cannot delete Tenant A's source.
    delete_response = client.delete(
        (
            f"{sources_url(index, dimension, indicator)}"
            f"/{source_id}"
        ),
        headers=second_auth_headers,
    )

    assert delete_response.status_code == 404

    # Make sure Tenant A's source still exists.
    owner_response = client.get(
        (
            f"{sources_url(index, dimension, indicator)}"
            f"/{source_id}"
        ),
        headers=auth_headers,
    )

    assert owner_response.status_code == 200
    assert (
        owner_response.json()["name"]
        == "Private Dataset"
    )
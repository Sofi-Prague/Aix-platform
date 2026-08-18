import uuid
from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    email = Column(Text, nullable=False, unique=True)
    hashed_password = Column(Text, nullable=False)
    role = Column(Text, nullable=False, default="author")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Index(Base):
    __tablename__ = "indexes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(Text, nullable=False)
    slug = Column(Text, nullable=False, unique=True)
    description = Column(Text)
    status = Column(Text, nullable=False, default="draft")
    created_by = Column(UUID(as_uuid=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

class Dimension(Base):
    __tablename__ = "dimensions"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    index_id = Column(
        UUID(as_uuid=True),
        ForeignKey("indexes.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    order_position = Column(Integer, nullable=False, default=0)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

class Indicator(Base):
    __tablename__ = "indicators"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    dimension_id = Column(
        UUID(as_uuid=True),
        ForeignKey("dimensions.id", ondelete="CASCADE"),
        nullable=False,
    )

    name = Column(
        Text,
        nullable=False,
    )

    description = Column(
        Text,
        nullable=True,
    )

    unit = Column(
        Text,
        nullable=True,
    )

    directionality = Column(
        Text,
        nullable=True,
    )

    status = Column(
        Text,
        nullable=False,
        default="draft",
    )

    order_position = Column(
        Integer,
        nullable=False,
        default=0,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    indicator_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "indicators.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    name = Column(
        Text,
        nullable=False,
    )

    source_type = Column(
        Text,
        nullable=False,
        default="csv",
    )

    source_url = Column(
        Text,
        nullable=True,
    )

    original_filename = Column(
        Text,
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class DataPoint(Base):
    __tablename__ = "data_points"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    data_source_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "data_sources.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    indicator_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "indicators.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    entity = Column(
        Text,
        nullable=False,
    )

    period = Column(
        Text,
        nullable=False,
    )

    value = Column(
        Float,
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "data_source_id",
            "entity",
            "period",
            name="uq_data_point_source_entity_period",
        ),
    )
import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
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
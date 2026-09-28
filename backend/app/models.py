from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

Theme = Literal[
    "Discipline",
    "Focus",
    "Confidence",
    "Resilience",
    "Growth",
    "Courage",
    "Ambition",
    "Patience",
    "Calm",
    "New Beginnings",
]
Style = Literal["Cinematic", "Nature", "Minimal", "Urban", "Abstract"]
Format = Literal["mobile", "desktop", "whatsapp", "status"]


class Model(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


class Asset(Model):
    src: str
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    type: Literal["image/jpeg"] = "image/jpeg"
    alt: str


class Post(Model):
    id: UUID
    slug: str
    title: str
    quote: str
    attribution: str | None = None
    description: str
    published_at: date
    themes: list[Theme]
    styles: list[Style]
    thumbnail: Asset
    hero: Asset
    mobile_hero: Asset
    versions: dict[Format, Asset]
    like_count: int = Field(ge=0)


class Page(Model):
    posts: list[Post]
    total: int
    offset: int
    limit: int


class Daily(Model):
    date: date | None
    posts: list[Post]


class Collection(Model):
    date: date
    post_count: int
    representative: Post


class Collections(Model):
    collections: list[Collection]
    total: int
    offset: int
    limit: int


class ProfileUpdate(Model):
    display_name: str = Field(min_length=1, max_length=40)
    themes: list[Theme] = Field(default_factory=list, max_length=10)

    @field_validator("display_name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Display name cannot be blank")
        return value.strip()

    @field_validator("themes")
    @classmethod
    def unique_themes(cls, value: list[Theme]) -> list[Theme]:
        return list(dict.fromkeys(value))


class Profile(ProfileUpdate):
    id: UUID
    liked_count: int
    saved_count: int


class DesiredState(Model):
    active: bool = Field(strict=True)


class Reaction(Model):
    post_id: UUID
    liked: bool
    saved: bool
    like_count: int


class ReactionResult(Reaction):
    liked_count: int
    saved_count: int


class DeleteAccount(Model):
    confirmation: Literal["DELETE"]


class Deletion(Model):
    status: Literal["pending", "complete"]
    job_id: UUID

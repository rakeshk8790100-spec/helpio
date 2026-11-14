"""
Matching what customers type ("plumber near me", "AC not cooling") to catalog skills without a search engine:
words are lower-cased, filler words dropped and simple endings stripped, so "plumber" meets "Plumbing" and
"electrician" meets "Electrical". Categories and skills also carry everyday search words ("maid", "bijli").
"""
import re
from collections.abc import Iterable
from functools import lru_cache

from app.modules.catalog.model import CatalogCategory, CatalogSkill

WORD = re.compile(r"[a-z0-9]+")
STOP_WORDS = frozenset(
    "a an the for in on near me my i we need needed want to of and or at with please is are was not no it its "
    "has have been since from very some get got also can any help job work working urgent asap today tomorrow".split()
)
# Longest first; a stem keeps at least three letters
SUFFIXES = ("icians", "ician", "ians", "ian", "ers", "er", "ing", "ry", "s")


def stem(word: str) -> str:
    for suffix in SUFFIXES:
        if word.endswith(suffix) and len(word) - len(suffix) >= 3:
            return word[: -len(suffix)]
    return word


def terms(text: str | None) -> list[str]:
    """The stems worth matching, in order: "Need a plumber near me" → ["plumb"]."""
    return [stem(word) for word in WORD.findall((text or "").lower()) if word not in STOP_WORDS]


@lru_cache(maxsize=1024)
def words_of(text: str) -> frozenset[str]:
    return frozenset(terms(text))


def word_match(term: str, word: str) -> bool:
    """Short stems ("ac", "tv") must be equal; longer ones match as prefixes ("electr" ~ "electrical")."""
    if len(term) <= 2 or len(word) <= 2:
        return term == word
    return word.startswith(term) or term.startswith(word)


def skill_words(skill: CatalogSkill) -> frozenset[str]:
    category = skill.category
    return words_of(f"{skill.name} {skill.keywords} {category.name} {category.keywords}")


def matched_terms(query_terms: Iterable[str], words: frozenset[str]) -> int:
    return sum(1 for term in query_terms if any(word_match(term, word) for word in words))


def category_words(category: CatalogCategory) -> frozenset[str]:
    """Everything a category answers to: its name, its skills' names and both sets of search words."""
    return words_of(" ".join([category.name, category.keywords, *(f"{s.name} {s.keywords}" for s in category.skills)]))


def guess_category(text: str | None, categories: Iterable[tuple[str, frozenset[str]]]) -> str | None:
    """
    The category (id, words) that matches most of the text, from `category_words`; ties go to the earlier one.
    """
    query_terms = terms(text)
    if not query_terms:
        return None
    best_id, best_score = None, 0
    for category_id, words in categories:
        score = matched_terms(query_terms, words)
        if score > best_score:
            best_id, best_score = category_id, score
    return best_id

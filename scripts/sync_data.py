# -----------------------------------------------------------------------------------------
#   author          : Kutay Coskuner
#   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
#   last update     : 2026-10-22
#   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
#                     Check outputs before relying on them.
# -----------------------------------------------------------------------------------------
"""
Creates .data/ from data.example/ and keeps its files' keys in step with the examples.

For every file in data.example/: a missing copy in .data/ is created; an existing one has
its keys compared with the example's (JSON keys, YAML keys, Markdown frontmatter keys).
When they differ it shows which keys are missing or extra and asks: replace (fresh copy,
old file kept as .bak), update (missing keys added with the example's values, everything
else untouched) or leave.

Why: .data/ is the user's own gitignored copy, made once. When an example gains a key
(e.g. a new report option) the copy goes stale silently; this script makes it visible.
It is also the only thing that creates .data/: the vite dev plugin never writes, it serves
data.example/ wherever .data/ has no file.

Requires: Python 3.10+, standard library only.

Inputs -> outputs: data.example/** -> .data/** (new files, updated files, *.bak backups).

Run: python scripts/sync_data.py --help

Gotchas:
- keys are compared through mappings only, never into lists: list items (paragraphs,
  tutors, signatures) are the user's content, not structure.
- YAML is read by indentation (block style, as in this repo's examples), so no YAML
  library is needed; commented-out keys in an example are documentation, not keys.
- values never count, only key names: differing values are the point of the copy.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULTS = {"example_dir": "data.example", "data_dir": ".data"}

KeyPath = tuple[str, ...]


# -----------------------------------------------------------------------------------------
#   cli
# -----------------------------------------------------------------------------------------
def build_parser() -> argparse.ArgumentParser:
    """Defines the CLI; the help text doubles as the bare-run guide."""
    parser = argparse.ArgumentParser(
        prog="python scripts/sync_data.py",
        description="Create .data/ from data.example/ and check its files' keys against the examples.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""examples:
  python scripts/sync_data.py --run              create missing files, check keys, ask per difference
  python scripts/sync_data.py --run --dry-run    show what would be created or changed, write nothing
  pnpm data                                      the same as --run

answers when a file's keys differ:
  r  replace  fresh copy of the example, the old file is kept as <file>.bak
  u  update   add the missing keys with the example's values, keep everything else
  l  leave    change nothing (asked again on the next run)

see README.md, section "Your data".""",
    )
    parser.add_argument("--run", action="store_true", help="create missing files and check keys")
    parser.add_argument("--dry-run", action="store_true", help="show what would happen, write nothing")
    parser.add_argument(
        "--example-dir",
        default=None,
        help=f"folder with the committed examples, relative to the repo (now: {DEFAULTS['example_dir']})",
    )
    parser.add_argument(
        "--data-dir",
        default=None,
        help=f"folder with your own files, relative to the repo (now: {DEFAULTS['data_dir']})",
    )
    return parser


def main(argv: list[str]) -> int:
    """
    Steps:
        1. without --run: print the guide and stop
        2. list the example files and pair each with its .data/ copy
        3. create the missing copies (one confirmation for all)
        4. compare keys of the existing copies, ask replace / update / leave per file
        5. summary
    """
    parser = build_parser()
    args = parser.parse_args(argv)
    if not args.run:
        parser.print_help()
        if argv:
            print("\nNothing run: add --run to start, e.g. python scripts/sync_data.py --run " + " ".join(argv))
        return 2 if argv else 0

    example_dir = ROOT / (args.example_dir or DEFAULTS["example_dir"])
    data_dir = ROOT / (args.data_dir or DEFAULTS["data_dir"])
    if not example_dir.is_dir():
        print(f"Example folder not found: {example_dir}")
        return 1
    interactive = sys.stdin.isatty() and not args.dry_run

    # 2. pairs
    examples = sorted(p for p in example_dir.rglob("*") if p.is_file())
    pairs = [(ex, data_dir / ex.relative_to(example_dir)) for ex in examples]
    missing = [(ex, own) for ex, own in pairs if not own.exists()]
    existing = [(ex, own) for ex, own in pairs if own.exists()]
    print(f"{len(examples)} example file(s) in {rel(example_dir)}, {len(existing)} present in {rel(data_dir)}")

    # 3. create missing copies
    created = create_missing(missing, interactive, args.dry_run)

    # 4. compare keys
    stale: list[str] = []
    changed: list[str] = []
    for example, own in existing:
        diff = compare(example, own)
        if diff is None or diff.same:
            continue
        stale.append(rel(own))
        print(f"\n{rel(own)} differs from {rel(example)}")
        for path in diff.missing:
            print(f"  missing  {'.'.join(path)}")
        for path in diff.extra:
            print(f"  extra    {'.'.join(path)}   (not in the example; maybe obsolete)")
        answer = ask_action(interactive)
        if answer == "r":
            replace(example, own)
            changed.append(f"replaced {rel(own)} (old: {rel(own)}.bak)")
        elif answer == "u":
            if update(example, own, diff):
                changed.append(f"updated {rel(own)} (+{len(top_missing(diff.missing))} key block(s))")
            else:
                print("  this file type can't be updated in place; choose replace, or edit it by hand")

    # 5. summary
    print("\n--- summary ---")
    if args.dry_run:
        print("dry run: nothing written")
    print(f"created: {created}")
    for line in changed:
        print(line)
    left = [name for name in stale if not any(name in line for line in changed)]
    if left:
        print("left as they are (asked again next run): " + ", ".join(left))
    if not stale:
        print("all keys match the examples")
    return 0


# -----------------------------------------------------------------------------------------
#   steps
# -----------------------------------------------------------------------------------------
def create_missing(missing: list[tuple[Path, Path]], interactive: bool, dry_run: bool) -> int:
    """Copies the missing example files after one confirmation; returns how many were made."""
    if not missing:
        return 0
    print("\nmissing in .data/, would be copied from the examples:")
    for example, own in missing:
        print(f"  {rel(own)}")
    if dry_run:
        return 0
    if not interactive:
        print("no terminal: nothing created; run it in a terminal to answer")
        return 0
    if input(f"create these {len(missing)} file(s)? [y/N] ").strip().lower() != "y":
        print("nothing created")
        return 0
    for example, own in missing:
        own.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(example, own)  # byte copy: line endings stay as in the example
    return len(missing)


def ask_action(interactive: bool) -> str:
    """Asks replace / update / leave; without a terminal (or in a dry run) it leaves."""
    if not interactive:
        print("  -> left as it is (dry run or no terminal)")
        return "l"
    while True:
        answer = input("  [r]eplace / [u]pdate / [l]eave? [l] ").strip().lower() or "l"
        if answer in ("r", "u", "l"):
            return answer
        print("  please answer r, u or l")


def replace(example: Path, own: Path) -> None:
    """Fresh copy of the example; the old file stays as <file>.bak."""
    shutil.copyfile(own, own.with_name(own.name + ".bak"))
    shutil.copyfile(example, own)


# -----------------------------------------------------------------------------------------
#   key comparison
# -----------------------------------------------------------------------------------------
@dataclass
class Diff:
    missing: list[KeyPath]  # in the example, not in the user's file
    extra: list[KeyPath]  # in the user's file, not in the example

    @property
    def same(self) -> bool:
        return not self.missing and not self.extra


def compare(example: Path, own: Path) -> Diff | None:
    """Key difference of two files, or None for files without keys (images, plain text)."""
    ex_keys, own_keys = keys_of(example), keys_of(own)
    if ex_keys is None or own_keys is None:
        return None
    return Diff(
        missing=[p for p in ex_keys if p not in own_keys],
        extra=[p for p in own_keys if p not in ex_keys],
    )


def keys_of(path: Path) -> list[KeyPath] | None:
    """Key paths of a JSON, YAML or frontmatter Markdown file, in file order."""
    suffix = path.suffix.lower()
    if suffix not in (".json", ".yaml", ".yml", ".md"):
        return None  # images and other files: only their presence matters
    text = path.read_text(encoding="utf-8")
    if suffix == ".json":
        try:
            return json_paths(json.loads(text))
        except json.JSONDecodeError as error:
            print(f"  {rel(path)}: not valid JSON ({error}); keys not compared")
            return None
    if suffix in (".yaml", ".yml"):
        return list(yaml_blocks(text.splitlines()))
    if suffix == ".md":
        front = frontmatter_lines(text.splitlines())
        return list(yaml_blocks(front[1])) if front else None
    return None


def json_paths(value: object, prefix: KeyPath = ()) -> list[KeyPath]:
    """Dict key paths, depth first; lists are content and aren't entered."""
    paths: list[KeyPath] = []
    if isinstance(value, dict):
        for key, child in value.items():
            paths.append(prefix + (key,))
            paths.extend(json_paths(child, prefix + (key,)))
    return paths


KEY_LINE = re.compile(r"""^( *)(?:"([^"]+)"|'([^']+)'|([^\s#'"\-][^:#]*?))\s*:(?:\s+(.*))?$""")


def yaml_blocks(lines: list[str]) -> dict[KeyPath, tuple[int, int]]:
    """
    Mapping keys of block-style YAML by indentation.

    Returns:
        key path -> (first line, last content line) of that key's block, 0-based. List
        items and block scalars (| >) are skipped as content.
    """
    blocks: dict[KeyPath, tuple[int, int]] = {}
    stack: list[tuple[int, str]] = []  # (indent, key) of the open parents
    skip_deeper_than: int | None = None  # inside a list item or block scalar
    open_keys: list[tuple[KeyPath, int, int]] = []  # (path, indent, start)

    def close(until_indent: int, line_no: int) -> None:
        # a block ends at the last content line before a line at its own indent or less
        while open_keys and open_keys[-1][1] >= until_indent:
            path, _, start = open_keys.pop()
            blocks[path] = (start, last_content(lines, start, line_no))

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        indent = len(line) - len(line.lstrip(" "))
        if skip_deeper_than is not None and indent > skip_deeper_than:
            continue
        skip_deeper_than = None
        if stripped.startswith("- ") or stripped == "-":
            skip_deeper_than = indent  # the item's own lines are content
            continue
        match = KEY_LINE.match(line)
        if not match:
            continue
        key = match.group(2) or match.group(3) or match.group(4)
        close(indent, i)
        while stack and stack[-1][0] >= indent:
            stack.pop()
        path = tuple(k for _, k in stack) + (key.strip(),)
        stack.append((indent, key.strip()))
        open_keys.append((path, indent, i))
        value = (match.group(5) or "").strip()
        if re.match(r"^[|>][-+]?\s*(#.*)?$", value):
            skip_deeper_than = indent
    close(-1, len(lines))
    return dict(sorted(blocks.items(), key=lambda item: item[1][0]))


def last_content(lines: list[str], start: int, end: int) -> int:
    """Last non-blank, non-comment line in lines[start:end]."""
    for j in range(end - 1, start - 1, -1):
        stripped = lines[j].strip()
        if stripped and not stripped.startswith("#"):
            return j
    return start


def frontmatter_lines(lines: list[str]) -> tuple[int, list[str]] | None:
    """(index of the closing ---, frontmatter lines) of a Markdown file, or None."""
    if not lines or lines[0].strip() != "---":
        return None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            return i, lines[1:i]
    return None


# -----------------------------------------------------------------------------------------
#   update: add missing keys, keep everything else
# -----------------------------------------------------------------------------------------
def top_missing(paths: list[KeyPath]) -> list[KeyPath]:
    """Missing paths whose parent exists; a missing parent brings its children along."""
    return [p for p in paths if not any(p[: len(q)] == q and p != q for q in paths)]


def update(example: Path, own: Path, diff: Diff) -> bool:
    """Adds the missing keys to `own`; returns False for file types it can't update."""
    suffix = own.suffix.lower()
    if suffix == ".json":
        ex_data = json.loads(example.read_text(encoding="utf-8"))
        own_text = own.read_text(encoding="utf-8")
        merged = merge_json(ex_data, json.loads(own_text))
        indent = "\t" if re.search(r"^\t", own_text, re.M) else 2
        backup(own)
        write_text(own, json.dumps(merged, indent=indent, ensure_ascii=False) + "\n", like=own_text)
        return True
    if suffix in (".yaml", ".yml", ".md"):
        ex_text = example.read_text(encoding="utf-8")
        own_text = own.read_text(encoding="utf-8")
        ex_lines, own_lines = ex_text.splitlines(), own_text.splitlines()
        if suffix == ".md":
            ex_front, own_front = frontmatter_lines(ex_lines), frontmatter_lines(own_lines)
            if not ex_front or not own_front:
                return False
            new_front = merge_yaml_lines(ex_front[1], own_front[1], top_missing(diff.missing))
            new_lines = ["---", *new_front, *own_lines[own_front[0] :]]
        else:
            new_lines = merge_yaml_lines(ex_lines, own_lines, top_missing(diff.missing))
        backup(own)
        write_text(own, "\n".join(new_lines) + "\n", like=own_text)
        return True
    return False


def merge_json(example: object, own: object) -> object:
    """The user's values win; missing keys come from the example, in the example's order."""
    if not (isinstance(example, dict) and isinstance(own, dict)):
        return own
    merged = {k: merge_json(v, own[k]) if k in own else v for k, v in example.items()}
    merged.update({k: v for k, v in own.items() if k not in example})  # extras kept, at the end
    return merged


def merge_yaml_lines(ex_lines: list[str], own_lines: list[str], add: list[KeyPath]) -> list[str]:
    """
    Inserts the example's text for each missing key block into the user's lines.

    Each block (its own lines with their inline comments; comment lines above it are left
    out, they are often commented-out options the user already has) goes right after the
    nearest earlier sibling that the user's file has, else before the nearest later one,
    else at the end of its parent / the file. The user's lines stay exactly as they are.
    """
    ex_blocks = yaml_blocks(ex_lines)
    result = list(own_lines)
    # insert from the bottom up, so earlier insert positions stay valid
    inserts: list[tuple[int, list[str]]] = []
    own_blocks = yaml_blocks(result)
    for path in add:
        start, end = ex_blocks[path]
        text = ex_lines[start : end + 1]
        parent = path[:-1]
        siblings = [p for p in ex_blocks if p[:-1] == parent]
        index = siblings.index(path)
        before = [p for p in reversed(siblings[:index]) if p in own_blocks]
        after = [p for p in siblings[index + 1 :] if p in own_blocks]
        if before:
            at = own_blocks[before[0]][1] + 1
        elif after:
            at = own_blocks[after[0]][0]
        elif parent and parent in own_blocks:
            at = own_blocks[parent][1] + 1
        else:
            at = last_content(result, 0, len(result)) + 1
        inserts.append((at, text))
    for at, text in sorted(inserts, key=lambda item: item[0], reverse=True):
        result[at:at] = text
    return result


def backup(path: Path) -> None:
    shutil.copyfile(path, path.with_name(path.name + ".bak"))


def write_text(path: Path, text: str, like: str) -> None:
    """Writes with the line endings the file had (CRLF stays CRLF)."""
    newline = "\r\n" if "\r\n" in like else "\n"
    path.write_bytes(text.replace("\r\n", "\n").replace("\n", newline).encode("utf-8"))


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix() if path.is_relative_to(ROOT) else str(path)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

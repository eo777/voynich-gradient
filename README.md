# Voynich gradients

An interactive reading of how the spelling of Voynich manuscript words changes along a proposed order of its
bifolia. One joint model of every word spelling is fitted along that order; the app shows, for 1,324 spelling
constructions (prefixes, suffixes, glyph positions and patterns), the fitted smooth change, the bifolium-level
steps the smooth curve cannot follow, what the fit leaves unexplained, and how the constructions group, split into
exclusive families and move together. Everything is model attribution under the proposed order: the app compares
Voynich text with Voynich text and assigns no meanings.

**Open the app:** https://eo777.github.io/voynich-gradient/

## The pages

| Page | What it shows |
|---|---|
| Overview | The gradient, the model, the order and its two x axes, a glossary of constructions, and how to read the charts |
| Gradient matrix | Every construction against every bifolium, in any of the fitted quantities |
| Component curves | One construction in full: rate, gradual level, steps, residual, drivers, carrier words and pages |
| Component groups | Twelve groups of constructions with similar fitted curves, and their shared words |
| Curve MDS | The 544 fitted curves placed by similarity |
| Page MDS | The pages placed by their construction profiles |
| Families | A partition of every spelling into sixteen families that never share a word |
| Chronology | Where along the order the fitted composition moves most, and what moves there |
| Residual audit | Where the fit misses, and a held-page repeatability check |

The rule transformer, which rewrites a page's text one bifolium along the order, runs only with the Python server
of the research package and is not part of this site.

## Data tables

`data/` holds the Path 1 fit as CSV files, `data/path3/` the same tables for the Path 3 refit (the
order-sensitivity check). Rates are per 10,000 words; `position` counts bifolia along the order from 1;
`bifolium` is the bifolium label used throughout the app. The tables are written from the same model file the
pages read, so they always agree with the app.

| File | One row per | Columns |
|---|---|---|
| `bifolia.csv` | bifolium (50) | position, bifolium, golf_group, tokens, path_coordinate, pages |
| `constructions.csv` | eligible construction (1,324; `active` is 1 for those with their own gradual term: 544 on Path 1, 541 on Path 3) | construction, id, kind, active, component_group, ward_order, tokens, spellings, rms |
| `curves.csv` | construction × bifolium | carrier_tokens, observed, gradual, jump, residual (observed − gradual − jump), own_log_weight, gradual_slope (per unit of path coordinate) |
| `component_groups.csv` | active construction | component_group (1–12), construction, kind, tokens |
| `group_volumes.csv` | component group × bifolium | observed and fitted gradual volume of the group's carrier words |
| `families.csv` | exclusive word family (16) | family, template, template_match, rule, tokens, spellings, hapaxes, largest_word |
| `family_volumes.csv` | family × bifolium | observed and fitted gradual volume |
| `words.csv` | spelling (7,180) | word, tokens, family, family_template |
| `word_constructions.csv` | spelling × construction it carries | word, construction |

## Running a copy

Everything is static. Serve the folder (for example with `python -m http.server`) and open `index.html`. The
model data are gzip files under `assets/`, decompressed in the browser, so the pages need to be served over HTTP
rather than opened from disk.

## Versions and caching

Each release has a version, `YYYY.MM.DD` (then `.2`, `.3` ... for later releases the same day), shown at the end
of the menu and in `version.json`. This repository holds the current release only, as a single commit without
history, since it is mostly data files. Every file a page loads is requested with
a fingerprint of its contents (`file.js?v=<hash>`), so a release replaces exactly the files that changed and a page
never mixes two releases. A served copy reads `version.json`, bypassing the cache, and offers a reload when a
newer release is live.

## Contents

| Path | What it is |
|---|---|
| `*.html` | The pages |
| `*.js`, `*.css` | App code and styles |
| `assets/` | The fitted model and its diagnostics, as gzip JSON |
| `*.json.gz` at the root | Data of the MDS pages |
| `figures/` | Figures shown on the MDS pages |
| `data/`, `data/path3/` | The CSV tables above |
| `release.js`, `version.json` | The release stamp and the update check |

## Sources

- Text: the Zandbergen–Landini (ZL) transliteration in IVTFF format, from René Zandbergen's site
  [voynich.nu](https://www.voynich.nu/).
- The proposed bifolium order and the page groupings shown along the axes come from the research workspace that
  develops this app; they are a working hypothesis, not an established fact.

## This repository is generated

The app is developed in a separate research workspace, which is not published. A publishing script copies the app
here, replacing the files it manages, so changes made here are overwritten. Files added here by hand, such as
`CNAME` or `LICENSE`, are left alone. Repository: https://github.com/eo777/voynich-gradient.

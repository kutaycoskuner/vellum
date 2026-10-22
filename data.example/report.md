---
language: en                  # en, de, tr: fixed words such as "Customer" / "Kunde", "Page 1 of 3"
title: Assembly Report · Example Shelf
subtitle: Parts list, weights and quality checks of the generated parts.
date: 22.10.2026              # report date
toc: true                     # contents on page 1
numbered: true                # 1. 2. 3. in front of ## sections

ci:                           # corporate identity: the same in every report of the company
  logo: images/logo.svg       # relative to .data/ (or a URL); top right on every page
  accent: "#49bf9d"           # section numbers, list markers, links
  # font: Quicksand           # any family; load it with fontUrl
  # fontUrl: https://fonts.googleapis.com/css2?family=Quicksand:wght@400..700&display=swap
  # label: Assembly report    # first footer line; default: the title
  footer:                     # company lines under it; **bold** for the labels
    - "**Example Company** · Example Street 1, 00000 Example City"
    - "**Owner** Example Person · **Email** info@example.com · **Web** www.example.com"
  # status:                   # extra table words shown in colour: ok, warn or fail
  #   geprüft: ok

customer:
  name: Example Customer Ltd.
  contact: Jane Doe
  address: Customer Road 2, 00000 Customer City
  email: jane.doe@example.com
  phone: "+00 000 000000"

order:
  product: Shelf
  file: asm_shelf-h1800-w800-t2
  number: "2026-0001"
  date: 15.10.2026
  parameters:                 # as given by the customer, one "name: value" per line
    - Height: 1800 mm
    - Width: 800 mm
    - Sheet thickness: 2 mm
    - Shelves: 4
  nomenclature:               # the file name decoded, one "code: meaning" per line
    - asm_shelf: assembly shelf
    - h1800: height 1800 mm
    - w800: width 800 mm
    - t2: sheet thickness 2 mm
---

## Calculation basis

- **Mass:** net volume of the CAD geometry, including holes and cut-outs.
- **Formula:** `kg = volume_mm³ × density_g/cm³ / 1,000,000`.
- **Total weight:** unit weight × count over all parts list positions.
- **Rounding:** one decimal place; sums use unrounded values.

## Assembly

| Property | Value |
| --- | --- |
| Assembly file name | asm_shelf-h1800-w800-t2 |
| Parts list positions | 2 |
| Parts in total | 6 |
| Total weight | 42.6 kg |
| Part QA | OK |
| Errors / warnings | 0 / 1 |

**Written-out name:** shelf; height=1800, width=800, sheet thickness=2.

| Name block | Code | Meaning | Documented |
| --- | --- | --- | --- |
| Assembly | asm_shelf | Shelf | Yes |
| Parameter | h1800 | Height | Yes |
| Parameter | w800 | Width | Yes |
| Parameter | t2 | Sheet thickness | Yes |

> The QA status sums up the part checks. Fit, collisions and joints of the assembled shelf are not checked here.

## Parts list and weights

| Pos. | Part | File name | Count | Unit weight | Position weight | QA |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | Side panel | p_side_t2_h1800_w300.step | 2 | 8.5 kg/pc | 17.0 kg | OK |
| 02 | Shelf board | p_board_t2_w800_d300.step | 4 | 6.4 kg/pc | 25.6 kg | OK |

**Total: 6 parts · 42.6 kg**

## Parts

One section per parts list position; identical copies share the geometry check.

### 01 · Side panel

| Property | Value |
| --- | --- |
| File name (STEP) | p_side_t2_h1800_w300.step |
| Count | 2 |
| Unit weight | 8.5 kg/pc |
| Material | Steel |

#### Checks

| Check | Status | Detail |
| --- | --- | --- |
| Solid / shell count | OK | 1 solid, 1 shell |
| Bounding box (X x Y x Z) | OK | 300.00 x 1800.00 x 2.00 mm, as expected |
| Sheet thickness | OK | measured 2.000 mm, expected 2 mm |

### 02 · Shelf board

| Property | Value |
| --- | --- |
| File name (STEP) | p_board_t2_w800_d300.step |
| Count | 4 |
| Unit weight | 6.4 kg/pc |
| Material | Steel |

#### Checks

| Check | Status | Detail |
| --- | --- | --- |
| Solid / shell count | OK | 1 solid, 1 shell |
| Bounding box (X x Y x Z) | OK | 800.00 x 300.00 x 2.00 mm, as expected |
| Sheet thickness | WARN | measured 1.950 mm, expected 2 mm |

---
title: Problem Set on Algorithms
lecture: Introduction to Programming
university: University Name
faculty: Faculty of Name
semester: Winter Semester 2025/26
dueDate: October 23, 2025
language: en
lecturers:
  - Dr. Name Lastname (name.lastname@email.edu)
tutors:
  - Name Lastname
  - Name Lastname
student:
  name: Your Name
  number: "123456"
  email: your.name@email.edu
---

## Problem 1: Gravitational force

This is the first question. The equation for gravitational force is:

$$
F = G \frac{m_1 m_2}{r^2}
$$

1. Compute $F$ for $m_1 = m_2 = 1\,\mathrm{kg}$ and $r = 1\,\mathrm{m}$.
2. How does $F$ change when $r$ doubles?

**Solution.** With $G \approx 6.674 \cdot 10^{-11}\,\mathrm{N\,m^2/kg^2}$ we get
$F \approx 6.674 \cdot 10^{-11}\,\mathrm{N}$. Doubling $r$ divides the force by four, since
$F \propto r^{-2}$.

## Problem 2: Induction

Show that for all $n \in \mathbb{N}$:

$$
\sum_{k=1}^{n} k = \frac{n(n+1)}{2}
$$

**Base case.** For $n = 1$ both sides equal $1$.

**Induction step.** Assume the claim holds for $n$. Then

$$
\sum_{k=1}^{n+1} k = \frac{n(n+1)}{2} + (n+1) = \frac{(n+1)(n+2)}{2}.
$$

## Problem 3: Truth table

| $p$ | $q$ | $p \to q$ | $\lnot p \lor q$ |
|:---:|:---:|:---------:|:----------------:|
|  1  |  1  |     1     |        1         |
|  1  |  0  |     0     |        0         |
|  0  |  1  |     1     |        1         |
|  0  |  0  |     1     |        1         |

The last two columns agree, so $p \to q \equiv \lnot p \lor q$.

\newpage

## Problem 4: Code

A line on its own reading `\newpage` starts a new page, as in LaTeX.

```python
def gcd(a: int, b: int) -> int:
    while b:
        a, b = b, a % b
    return a
```

> The loop ends because $b$ strictly decreases and stays non-negative.

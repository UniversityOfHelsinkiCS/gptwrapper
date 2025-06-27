export const mathTestContent = `
### Inline Math to be displayed (as display math)

Let \\(f(x) = x^2\\) and \\(g(x) = 2x + 1\\). Then \\(f(x) + g(x) = x^2 + 2x + 1\\).
The definite integral is \\(\\int_a^b f(x) dx\\).

---

### Display Math Examples

Here is a famous equation: \\[E = mc^2\\]
And another: \\[a^2 + b^2 = c^2\\]
A more complex one: \\[\\sum_{k=1}^N k = \\frac{N(N+1)}{2}\\]

---

### Aligned Equations

Consider the following steps:
\\begin{align*}
  y &= (x+1)^2 \\
    &= x^2 + 2x + 1 \\
    &= x(x+2) + 1
\\end{align*}

And for some general variables:
\\begin{aligned}
  A &= B + C \\
    &= D - E + F
\\end{aligned}

---

### Matrix Examples

A simple 2x2 matrix:
\\begin{bmatrix}
  1 & 0 \\
  0 & 1
\\end{bmatrix}

A determinant:
\\begin{vmatrix}
  a & b \\
  c & d
\\end{vmatrix}

A general matrix with fractions:
\\begin{pmatrix}
  \\frac{1}{3} & \\sqrt{3} \\\\
  \\sin(\\theta) & \\cos(\\phi)
\\end{pmatrix}

---

### Text with Parentheses in Math

Here's a statement with text and math:
\\[
  \\text{The final answer, after several calculations, was approximately } 42 \\text{, which means that } \\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6} \\text{ is always true.}
\\]

This illustrates how a long sentence can contain math:
\\[
  \\text{If we consider the function } f(x) = e^x \\text{, its derivative is simply } \\deriv{f(x)}{x} = e^x \\text{.}
\\]

---

### Code Block Protection Check

\`\`\`python
# This is a Python code block
result = 2 * (3 + 4) # Should not be affected by math preprocessing
# For example, \\(x^2 + y^2\\) here is just a string.
\`\`\`

---

### Mixed Content Test

A quick calculation: \\(2 + 2 = 4\\).

Then we have this:
\\[\\frac{d}{dx} e^x = e^x\\]

Now for an alignment:
\\begin{align*}
  P(A|B) &= \\frac{P(B|A)P(A)}{P(B)} \\\\
         &= \\frac{P(B|A)P(A)}{\\sum P(B|A_i)P(A_i)}
\\end{align*}

And finally, a small matrix:
\\begin{pmatrix}
  5 & 6 \\\\
  7 & 8
\\end{pmatrix}

---

### Additional Macro Tests

The norm of vector \\(\\vec{x}\\) is \\(\\norm{x}\\). Real numbers are in \\(\\R\\), and integers in \\(\\Z\\).
The partial derivative \\(\\pdv{f}{y}\\) is defined. A matrix transpose is denoted by \\(M\\T\\).
We consider the set \\(\\set{x \\mid x \\in \\N}\\).

A vector quantity is denoted as \\(\\vb{v}\\), and its differential as \\(\\dd{t}\\).
The gradient of a scalar field \\(\\phi\\) is \\(\\grad \\phi\\).
The inner product of quantum states \\(\\psi\\) and \\(\\phi\\) is \\(\\braket{\\psi}{\\phi}\\).

---

### Additional MChem Tests

A simple chemical reaction: \\(\\ch{H2 + Cl2 -> 2HCl}\\).
An ion with charge: \\(\\ch{Fe^3+}\\) and an isotope \\(\\ch{^238U}\\).

`
export const codeTestContent = `
### ✅ JavaScript

\`\`\`js
// Basic function
function greet(name) {
  return \`Hello, \${name}!\`;
}

// Arrow function
const square = x => x * x;

// Async/Await
async function fetchData(url) {
  const res = await fetch(url);
  return await res.json();
}
\`\`\`

---

### ✅ TypeScript

\`\`\`ts
type User = {
  id: number;
  name: string;
  isAdmin?: boolean;
};

function getUser(id: number): User {
  return { id, name: "Alice" };
}
\`\`\`

---

### ✅ Python

\`\`\`python
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

class Greeter:
    def __init__(self, name):
        self.name = name

    def greet(self):
        print(f"Hello, {self.name}")
\`\`\`

---

### ✅ Bash

\`\`\`bash
#!/bin/bash
echo "Starting deployment..."

if [ -f ".env" ]; then
  export $(cat .env | xargs)
fi

npm install && npm run build
\`\`\`

---

### ✅ C++

\`\`\`cpp
#include <iostream>
#include <vector>

int main() {
  std::vector<int> nums = {1, 2, 3, 4};
  for (int n : nums) {
    std::cout << n << std::endl;
  }
  return 0;
}
\`\`\`

---

### ✅ HTML + CSS

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Test</title>
  <style>
    body { font-family: sans-serif; background: #f0f0f0; }
  </style>
</head>
<body>
  <h1>Hello World</h1>
</body>
</html>
\`\`\`

---

### ✅ JSON

\`\`\`json
{
  "name": "react-syntax-test",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0"
  }
}
\`\`\`

---

### ✅ Rust

\`\`\`rust
fn main() {
    let nums = vec![1, 2, 3];
    for n in nums {
        println!("{}", n);
    }
}
\`\`\`

---

### ✅ SQL

\`\`\`sql
SELECT id, name
FROM users
WHERE active = true
ORDER BY created_at DESC;
\`\`\`

---

### ✅ YAML

\`\`\`yaml
version: '3'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
\`\`\`

---

### ✅ Go

\`\`\`go
package main

import "fmt"

func main() {
    fmt.Println("Hello, Go!")
}
\`\`\`

---

### ✅ Java

\`\`\`java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}
\`\`\`

---

### ✅ PHP

\`\`\`php
<?php
echo "Hello, PHP!";
?>
\`\`\`

---

### ✅ Kotlin

\`\`\`kotlin
fun main() {
    println("Hello, Kotlin!")
}
\`\`\`

---

### ✅ Swift

\`\`\`swift
import Foundation

print("Hello, Swift!")
\`\`\`
`

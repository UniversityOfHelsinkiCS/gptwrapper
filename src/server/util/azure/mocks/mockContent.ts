export const mathTestContent = `
### ✅ Inline Math

\\(\\alpha + \\beta = \\gamma\\)

\\(\\frac{a}{b} + \\sqrt{c^2 + d^2}\\)

\\(\\int_0^1 x^2 \\, dx = \\frac{1}{3}\\)

\\(\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}\\)

\\(\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1\\)

---

### ✅ Display Math

\\[E = mc^2\\]

\\[\\int_{-\\infty}^\\infty e^{-x^2} dx = \\sqrt{\\pi}\\]

\\[
f(x) = \\begin{cases}
  x^2 & x \\geq 0 \\\\
  -x^2 & x < 0
\\end{cases}
\\]

---

### ✅ Aligned Environments

\\\\begin{align*}
  a &= b + c \\\\
    &= d + e
\\\\end{align*}

\\\\begin{aligned}
  x &= y + z \\\\
    &= w - t
\\\\end{aligned}

---

### ✅ Matrices

\\\\begin{matrix}
  1 & 2 \\\\
  3 & 4
\\\\end{matrix}

\\\\begin{bmatrix}
  a & b \\\\
  c & d
\\\\end{bmatrix}

\\\\begin{pmatrix}
  \\frac{1}{2} & \\sqrt{2} \\\\
  0 & 1
\\\\end{pmatrix}

---

### ✅ Special Symbols and Operators

\\[\\nabla \\cdot \\vec{E} = \\frac{\\rho}{\\varepsilon_0}\\]

\\[x \\in \\mathbb{R},\\quad A \\subseteq B,\\quad \\forall x \\in X,\\quad \\exists y \\in Y\\]

\\[f'(x) = \\frac{d}{dx} f(x), \\quad \\nabla f = \\left( \\frac{\\partial f}{\\partial x}, \\frac{\\partial f}{\\partial y} \\right)\\]

---

### ✅ Text Inside Math

\\[\\text{Let } f(x) = \\sin(x),\\quad \\text{then } f(0) = 0\\]

---

### ✅ Mixed Math & Text with Parentheses

\\[\\text{If } f(x) = x^2 \\text{ then } f(2) = 4 \\text{ (obvious)}\\]

---

### ✅ Code Block Protection Test

\`\`\`js
// Inline math-like syntax inside code
const formula = "a = b + c"; // Should not be parsed as math
\`\`\`

---

### 🧪 Mixed Test Block

\`\`\`markdown
Here’s everything together:

\\(x^2 + y^2 = z^2\\)

\\[\\int_1^2 x^3 dx = \\frac{15}{4}\\]

\\\\begin{align*}
  E &= mc^2 \\\\
    &= (2)(3^2)
\\\\end{align*}

\\\\begin{pmatrix}
  1 & 0 \\\\
  0 & 1
\\\\end{pmatrix}

\\text{That’s all (folks)}
\`\`\`
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

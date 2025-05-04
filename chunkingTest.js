
const content = await fetch('https://raw.githubusercontent.com/ohjelmistotuotanto-hy/ohjelmistotuotanto-hy.github.io/refs/heads/master/osa2.md').then(r => r.text())

// Iterate line by line
const lines = content.split('\n')

const section = []
const sections = []

for (const line of lines) {
  // Check if line starts with '#'
  if (line.startsWith('#')) {
    sections.push({
        title: line,
        content: section.join('\n')
    })
    section.length = 0
  }
  section.push(line)
}

console.log(sections.map(s => s.title).join('\n'))
console.log('---')
console.log(sections.map(s => s.content.substring(0, 100)).join('\n'))
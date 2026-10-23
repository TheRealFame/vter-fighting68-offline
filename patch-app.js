#!/usr/bin/env node
'use strict'

// Applies the two compatibility patches to the vendored web application.
// Idempotent: running it twice changes nothing.

const fs = require('fs')
const path = require('path')

const PATCHES = [
  [
    'device name lookup',
    'return i.name===e.productName&&i.productId==e.productId',
    'return i.name===String(e.productName||"").replace(/^KEYBOARD\\s+/i,"")&&i.productId==e.productId'
  ],
  [
    'music helper download',
    'https://dev.driveall.cn/music.zip',
    '/music.zip'
  ]
]

const dir = path.join(__dirname, 'site', 'static', 'js')
const targets = fs.existsSync(dir)
  ? fs.readdirSync(dir).filter((f) => /^app\..*\.js$/.test(f)).sort()
  : []

if (targets.length === 0) {
  console.error('error: no app bundle under site/static/js (is site/ present?)')
  process.exit(1)
}

let changed = 0
for (const name of targets) {
  const file = path.join(dir, name)
  let text = fs.readFileSync(file, 'utf8')
  for (const [label, before, after] of PATCHES) {
    if (!text.includes(before)) {
      console.log(`${name}: ${label}: already applied`)
      continue
    }
    text = text.split(before).join(after)
    changed += 1
    console.log(`${name}: ${label}: patched`)
  }
  fs.writeFileSync(file, text)
}

console.log(`done (${changed} patch(es) applied)`)

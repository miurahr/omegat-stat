#!/bin/bash
npm install
npm install -g @vercel/ncc
ncc build lib/main.js --license license.txt
git add action.yml dist/index.js
git commit -sm 'Prepare release'

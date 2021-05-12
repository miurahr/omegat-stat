#!/bin/bash
npm install
npm install -g @vercel/ncc
git checkout releases
git merge -m 'merge main into releases' main
npm run release
git add action.yml dist/ -f
git commit -sm 'Prepare release'

#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <version-type>"
  echo "Version type must be one of: patch, minor, major"
  exit 1
fi

VERSION_TYPE=$1

npm version $VERSION_TYPE

git add package.json package-lock.json
git commit -m "chore: bump version to $(node -p "require('./package.json').version")"
git tag v$(node -p "require('./package.json').version")
git push origin master --tags

npm publish
